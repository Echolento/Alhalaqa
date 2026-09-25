'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { logActivity } from './log-activity'
import { assertOwnsStudent, getOwnTeacherId } from './ownership'

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
    .select('id, name, phone, monthly_price, payment_day, frequency, claimed_by, created_at, updated_at, teacher_id')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  return (students || []).map(s => ({
    ...s,
    name: s.name || 'طالب',
    monthly_price: Number(s.monthly_price) || Number(teacher.default_monthly_price) || 0,
    payment_day: Number(s.payment_day) || 1,
    frequency: (s as any).frequency === 'weekly' || (s as any).frequency === 'biweekly' ? (s as any).frequency : 'monthly',
  }))
}

export async function addStudent(name: string, phone?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const service = createServiceClient()

  let { data: teacher } = await service
    .from('teachers')
    .select('id, default_monthly_price, default_payment_day')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) {
    const { data: newTeacher, error: createError } = await service
      .from('teachers')
      .insert({ profile_id: user.id })
      .select('id, default_monthly_price, default_payment_day')
      .single()

    if (createError || !newTeacher) return { error: 'Teacher not found' }
    teacher = newTeacher
  }

  const { data, error } = await service
    .from('students')
    .insert({
      teacher_id: teacher.id,
      name,
      phone: phone || null,
      monthly_price: Number(teacher.default_monthly_price) || 0,
      payment_day: Number(teacher.default_payment_day) || 1,
      frequency: 'monthly',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await logActivity({
    actionType: 'student_add',
    entityType: 'student',
    entityId: data?.id,
    details: { student_name: name },
  }, user.id)

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true, student: data }
}

export async function updateStudent(studentId: string, name: string, phone?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const service = createServiceClient()

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const { data: old } = await service
    .from('students')
    .select('name')
    .eq('id', studentId)
    .single()

  const { error } = await service
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
  }, user.id)

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function addMultipleStudents(students: { name: string; phone?: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const service = createServiceClient()

  // Service client bypasses RLS: only ever use the caller's own teacher id.
  const teacherId = await getOwnTeacherId(service, user.id)
  let teacher: { id: string; default_monthly_price: unknown } | null = null

  if (teacherId) {
    const { data } = await service
      .from('teachers')
      .select('id, default_monthly_price')
      .eq('id', teacherId)
      .maybeSingle()
    teacher = data as { id: string; default_monthly_price: unknown } | null
  }

  if (!teacher) {
    const { data: newTeacher, error: createError } = await service
      .from('teachers')
      .insert({ profile_id: user.id })
      .select('id, default_monthly_price')
      .single()
    if (createError || !newTeacher) return { error: 'Teacher not found' }
    teacher = newTeacher as { id: string; default_monthly_price: unknown }
  }

  const inserts = students.map((s) => ({
    teacher_id: teacher!.id,
    name: s.name,
    phone: s.phone || null,
    monthly_price: Number(teacher!.default_monthly_price) || 0,
    payment_day: 1,
    frequency: 'monthly',
  }))

  const { error } = await service.from('students').insert(inserts)
  if (error) return { error: error.message }

  await logActivity({
    actionType: 'student_bulk_add',
    entityType: 'student',
    details: { count: students.length },
  }, user.id)

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const service = createServiceClient()

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const { data: student } = await service
    .from('students')
    .select('name')
    .eq('id', studentId)
    .single()

  const { error } = await service
    .from('students')
    .delete()
    .eq('id', studentId)

  if (error) return { error: error.message }

  await service
    .from('student_payments')
    .delete()
    .eq('student_id', studentId)

  await logActivity({
    actionType: 'student_delete',
    entityType: 'student',
    entityId: studentId,
    details: { student_name: student?.name },
  }, user.id)

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}
