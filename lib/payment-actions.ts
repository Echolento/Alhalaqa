'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { getCurrentMonthKey, getPeriodKey, normalizeFrequency, type BillingFrequency } from './billing-period'
import { logActivity } from './log-activity'
import { assertOwnsStudent } from './ownership'

export async function getTeacherPayments(month?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { students: [], payments: [] }

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, currency, default_monthly_price')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) return { students: [], payments: [], currency: 'SAR' }

  const monthKey = month || getCurrentMonthKey()

  const { data: students } = await supabase
    .from('students')
    .select('id, name, phone, monthly_price, payment_day, claimed_by')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  const today = new Date()
  const normalizedStudents = (students || []).map(s => {
    const frequency = normalizeFrequency((s as any).frequency)
    let studentMonthKey: string
    if (month && frequency === 'monthly') {
      studentMonthKey = month
    } else if (month) {
      studentMonthKey = getPeriodKey(today, frequency, s.payment_day || 1)
    } else {
      studentMonthKey = getPeriodKey(today, frequency, s.payment_day || 1)
    }
    return {
      id: s.id,
      full_name: s.name || 'طالب',
      monthly_price: s.monthly_price || teacher.default_monthly_price || 0,
      phone: (s as any).phone ?? null,
      payment_day: s.payment_day || 1,
      claimed_by: (s as any).claimed_by ?? null,
      currentMonthKey: studentMonthKey
    }
  })

  const monthKeysToFetch = Array.from(new Set(normalizedStudents.map(s => s.currentMonthKey)))

  const { data: existingPayments } = await supabase
    .from('student_payments')
    .select('*')
    .in('month', monthKeysToFetch)
    .in('student_id', normalizedStudents.map(s => s.id))

  // Pending-confirmation proofs: a receipt waiting for teacher verification
  // turns the card amber instead of red (RLS read-own policy covers this).
  const pendingKeys = new Set<string>()
  {
    const ids = normalizedStudents.map(s => s.id)
    if (ids.length > 0) {
      const { data: pendingProofs } = await supabase
        .from('payment_proofs')
        .select('student_id, period_key')
        .eq('status', 'pending')
        .in('student_id', ids)
        .in('period_key', monthKeysToFetch)
      for (const proof of pendingProofs || []) {
        pendingKeys.add(`${(proof as any).student_id}_${(proof as any).period_key}`)
      }
    }
  }
  for (const s of normalizedStudents) {
    (s as any).hasPendingProof = pendingKeys.has(`${s.id}_${s.currentMonthKey}`)
  }

  const paymentSet = new Set((existingPayments || []).map(p => `${p.student_id}_${p.month}`))
  const studentsNeedingPaymentRecord = normalizedStudents.filter(s => !paymentSet.has(`${s.id}_${s.currentMonthKey}`))

  if (studentsNeedingPaymentRecord.length > 0) {
    // Backfill is a write: service client (rows are derived from the
    // caller's own students, verified above via their teacher id).
    const { error: insertError } = await createServiceClient()
      .from('student_payments')
      .insert(studentsNeedingPaymentRecord.map(s => ({
        student_id: s.id,
        month: s.currentMonthKey,
        paid: false,
        amount_paid: 0,
      })))
    if (insertError && insertError.code !== '23505') {
      console.error('[getTeacherPayments] insert missing payments error:', insertError)
    }
  }

  // No backfill needed (common case): skip the second fetch entirely.
  if (studentsNeedingPaymentRecord.length === 0) {
    return { students: normalizedStudents, payments: existingPayments || [], currency: teacher.currency }
  }

  const { data: finalPayments } = await supabase
    .from('student_payments')
    .select('*')
    .in('month', monthKeysToFetch)
    .in('student_id', normalizedStudents.map(s => s.id))

  return { students: normalizedStudents, payments: finalPayments || [], currency: teacher.currency }
}

export async function updateStudentMonthlyPrice(studentId: string, price: number, month?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const service = createServiceClient()

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const { data: student } = await service
    .from('students')
    .select('name, monthly_price')
    .eq('id', studentId)
    .maybeSingle()

  const oldPrice = student?.monthly_price || 0

  const { error: studentError } = await service
    .from('students')
    .update({ monthly_price: price })
    .eq('id', studentId)

  if (studentError) return { error: studentError.message }

  if (month) {
    const { data: existing } = await service
      .from('student_payments')
      .select('id, paid')
      .eq('student_id', studentId)
      .eq('month', month)
      .maybeSingle()

    if (existing) {
      await service
        .from('student_payments')
        .update({
          amount_paid: existing.paid ? price : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    }
  }

  await logActivity({
    actionType: 'price_update',
    entityType: 'student',
    entityId: studentId,
    details: {
      student_name: student?.name || 'طالب',
      old_price: oldPrice,
      new_price: price,
    },
  }, user.id)

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleStudentPayment(studentId: string, month?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const service = createServiceClient()

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  let monthKey = month
  if (!monthKey) {
    const { data: student } = await service
      .from('students')
      .select('payment_day, frequency, name')
      .eq('id', studentId)
      .maybeSingle()

    const day = (student as any)?.payment_day || 1
    const freq = normalizeFrequency((student as any)?.frequency)
    monthKey = getPeriodKey(new Date(), freq, day)
  }

  // Independent reads: run together, not one-after-another (toggle latency).
  const [{ data: existing }, { data: student }] = await Promise.all([
    service
      .from('student_payments')
      .select('id, paid')
      .eq('student_id', studentId)
      .eq('month', monthKey)
      .single(),
    service
      .from('students')
      .select('name, monthly_price, teacher:teachers(default_monthly_price)')
      .eq('id', studentId)
      .maybeSingle(),
  ])

  const s = student as any
  const teacher = Array.isArray(s.teacher) ? s.teacher[0] : s.teacher
  const effectivePrice = s?.monthly_price || teacher?.default_monthly_price || 0

  let newPaid: boolean

  if (!existing) {
    newPaid = true
    const { error } = await service
      .from('student_payments')
      .insert({
        student_id: studentId,
        month: monthKey,
        paid: true,
        paid_at: new Date().toISOString(),
        amount_paid: effectivePrice
      })
    if (error) return { error: error.message }
  } else {
    newPaid = !existing.paid
    const { error } = await service
      .from('student_payments')
      .update({
        paid: newPaid,
        paid_at: newPaid ? new Date().toISOString() : null,
        amount_paid: newPaid ? effectivePrice : 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  }

  await logActivity({
    actionType: 'payment_toggle',
    entityType: 'student_payment',
    entityId: studentId,
    details: {
      student_name: s?.name || 'طالب',
      month: monthKey,
      new_status: newPaid ? 'paid' : 'unpaid',
      amount: newPaid ? effectivePrice : 0,
    },
  }, user.id)

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateStudentPaymentDay(studentId: string, paymentDay: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const service = createServiceClient()

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const { data: student } = await service
    .from('students')
    .select('name, payment_day')
    .eq('id', studentId)
    .maybeSingle()

  const oldDay = student?.payment_day || 1

  const { error } = await service
    .from('students')
    .update({ payment_day: paymentDay })
    .eq('id', studentId)

  if (error) return { error: error.message }

  await logActivity({
    actionType: 'payment_day_update',
    entityType: 'student',
    entityId: studentId,
    details: {
      student_name: student?.name || 'طالب',
      old_day: oldDay,
      new_day: paymentDay,
    },
  }, user.id)

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateStudentFrequency(studentId: string, frequency: BillingFrequency) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const service = createServiceClient()

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const next = normalizeFrequency(frequency)

  const { data: student } = await service
    .from('students')
    .select('name, frequency')
    .eq('id', studentId)
    .maybeSingle()

  const oldFrequency = normalizeFrequency((student as any)?.frequency)

  const { error } = await service
    .from('students')
    .update({ frequency: next })
    .eq('id', studentId)

  if (error) return { error: error.message }

  // Next-cycle-only: never touch current-period student_payments rows.
  await logActivity({
    actionType: 'frequency_update',
    entityType: 'student',
    entityId: studentId,
    details: {
      student_name: (student as any)?.name || 'طالب',
      old_frequency: oldFrequency,
      new_frequency: next,
    },
  }, user.id)

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}
