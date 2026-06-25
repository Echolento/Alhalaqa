'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from './log-activity'

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
      payment_day: 1,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    actionType: 'student_add',
    entityType: 'student',
    entityId: data?.id,
    details: { student_name: name },
  })

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true, student: data }
}

export async function updateStudent(studentId: string, name: string, phone?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: old } = await supabase
    .from('students')
    .select('name')
    .eq('id', studentId)
    .single()

  const { error } = await supabase
    .from('students')
    .update({ name, phone: phone || null })
    .eq('id', studentId)

  if (error) return { error: error.message }

  await logActivity({
    actionType: 'student_update',
    entityType: 'student',
    entityId: studentId,
    details: {
      student_name: name,
      old_name: old?.name,
    },
  })

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function addMultipleStudents(students: { name: string; phone?: string }[]) {
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

  const inserts = students.map((s) => ({
    teacher_id: teacher!.id,
    name: s.name,
    phone: s.phone || null,
    monthly_price: Number(teacher!.default_monthly_price) || 0,
    payment_day: 1,
  }))

  const { error } = await supabase.from('students').insert(inserts)
  if (error) return { error: error.message }

  await logActivity({
    actionType: 'student_bulk_add',
    entityType: 'student',
    details: { count: students.length },
  })

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: student } = await supabase
    .from('students')
    .select('name')
    .eq('id', studentId)
    .single()

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId)

  if (error) return { error: error.message }

  await supabase
    .from('student_payments')
    .delete()
    .eq('student_id', studentId)

  await logActivity({
    actionType: 'student_delete',
    entityType: 'student',
    entityId: studentId,
    details: { student_name: student?.name },
  })

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}
