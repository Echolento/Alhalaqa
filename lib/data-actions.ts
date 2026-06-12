'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export async function getTeacherStudents() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, default_monthly_price')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) return []

  const { data: students } = await supabase
    .from('students')
    .select('id, name, phone, monthly_price, payment_day, created_at, updated_at, teacher_id')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  return (students || []).map(s => ({
    ...s,
    name: s.name || 'طالب',
    monthly_price: Number(s.monthly_price) || Number(teacher.default_monthly_price) || 0,
    payment_day: Number(s.payment_day) || 1,
  }))
}

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
      const now = new Date()
      const day = s.payment_day || 1
      let pYear = now.getFullYear()
      let pMonth = now.getMonth() + 1
      if (now.getDate() < day) {
        pMonth -= 1
        if (pMonth === 0) { pMonth = 12; pYear -= 1 }
      }
      studentMonthKey = `${pYear}-${String(pMonth).padStart(2, '0')}-01`
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
    const now = new Date()
    let pYear = now.getFullYear()
    let pMonth = now.getMonth() + 1
    if (now.getDate() < day) {
      pMonth -= 1
      if (pMonth === 0) { pMonth = 12; pYear -= 1 }
    }
    monthKey = `${pYear}-${String(pMonth).padStart(2, '0')}-01`
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

export async function addStudent(name: string, phone?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  let { data: teacher } = await supabase
    .from('teachers')
    .select('id, default_monthly_price')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) {
    const { data: newTeacher, error: createError } = await supabase
      .from('teachers')
      .insert({ profile_id: user.id })
      .select('id, default_monthly_price')
      .single()

    if (createError || !newTeacher) return { error: 'Teacher not found' }
    teacher = newTeacher
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      teacher_id: teacher.id,
      name,
      phone: phone || null,
      monthly_price: Number(teacher.default_monthly_price) || 0,
      payment_day: new Date().getDate(),
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true, student: data }
}

export async function updateStudent(studentId: string, name: string, phone?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('students')
    .update({ name, phone: phone || null })
    .eq('id', studentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId)

  if (error) return { error: error.message }

  // Clean up any payments (best-effort, RLS may or may not allow it)
  await supabase
    .from('student_payments')
    .delete()
    .eq('student_id', studentId)

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}
