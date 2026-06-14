'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentMonthKey, getBillingMonthKey } from './billing-period'

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
    .select('id, name, monthly_price, payment_day')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  const normalizedStudents = (students || []).map(s => {
    let studentMonthKey = month
    if (!studentMonthKey) {
      studentMonthKey = getBillingMonthKey(new Date(), s.payment_day || 1)
    }
    return {
      id: s.id,
      full_name: s.name || 'طالب',
      monthly_price: s.monthly_price || teacher.default_monthly_price || 0,
      payment_day: s.payment_day || 1,
      currentMonthKey: studentMonthKey
    }
  })

  const monthKeysToFetch = month
    ? [month]
    : Array.from(new Set(normalizedStudents.map(s => s.currentMonthKey)))

  const { data: existingPayments } = await supabase
    .from('student_payments')
    .select('*')
    .in('month', monthKeysToFetch)
    .in('student_id', normalizedStudents.map(s => s.id))

  const paymentSet = new Set((existingPayments || []).map(p => `${p.student_id}_${p.month}`))
  const studentsNeedingPaymentRecord = normalizedStudents.filter(s => !paymentSet.has(`${s.id}_${s.currentMonthKey}`))

  if (studentsNeedingPaymentRecord.length > 0) {
    const { error: insertError } = await supabase
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

  const { data: finalPayments } = await supabase
    .from('student_payments')
    .select('*')
    .in('month', monthKeysToFetch)
    .in('student_id', normalizedStudents.map(s => s.id))

  return { students: normalizedStudents, payments: finalPayments || [], currency: teacher.currency }
}

export async function updateStudentMonthlyPrice(studentId: string, price: number, month?: string) {
  const supabase = await createClient()
  const { error: studentError } = await supabase
    .from('students')
    .update({ monthly_price: price })
    .eq('id', studentId)

  if (studentError) return { error: studentError.message }

  if (month) {
    const { data: existing } = await supabase
      .from('student_payments')
      .select('id, paid')
      .eq('student_id', studentId)
      .eq('month', month)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('student_payments')
        .update({
          amount_paid: existing.paid ? price : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    }
  }

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/students')
  return { success: true }
}

export async function toggleStudentPayment(studentId: string, month?: string) {
  const supabase = await createClient()
  let monthKey = month
  if (!monthKey) {
    const { data: student } = await supabase
      .from('students')
      .select('payment_day')
      .eq('id', studentId)
      .maybeSingle()

    const day = (student as any)?.payment_day || 1
    monthKey = getBillingMonthKey(new Date(), day)
  }

  const { data: existing } = await supabase
    .from('student_payments')
    .select('id, paid')
    .eq('student_id', studentId)
    .eq('month', monthKey)
    .single()

  const { data: student } = await supabase
    .from('students')
    .select('monthly_price, teacher:teachers(default_monthly_price)')
    .eq('id', studentId)
    .maybeSingle()

  const s = student as any
  const teacher = Array.isArray(s.teacher) ? s.teacher[0] : s.teacher
  const effectivePrice = s?.monthly_price || teacher?.default_monthly_price || 0

  if (!existing) {
    const { error } = await supabase
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
    const newPaid = !existing.paid
    const { error } = await supabase
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

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateStudentPaymentDay(studentId: string, paymentDay: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('students')
    .update({ payment_day: paymentDay })
    .eq('id', studentId)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/payments')
  return { success: true }
}
