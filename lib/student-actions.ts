'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  await supabase
    .from('student_payments')
    .delete()
    .eq('student_id', studentId)

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}
