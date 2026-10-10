'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './action-context'
import { logActivity } from './log-activity'
import { assertOwnsStudent, getOwnTeacherId } from './ownership'
import { normalizeFrequency, type BillingFrequency } from './billing-period'
import { firstOfNextMonth, isValidDueDate } from './billing-next'

export async function getTeacherStudents() {
  const ctx = await requireUser()
  if ('error' in ctx) return []
  const { user, supabase } = ctx

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, default_monthly_price')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) return []

  const { data: students } = await supabase
    .from('students')
    .select('id, name, phone, monthly_price, payment_day, frequency, next_due_date, claimed_by, created_at, updated_at, teacher_id')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  return (students || []).map(s => ({
    ...s,
    name: s.name || 'طالب',
    monthly_price: Number(s.monthly_price) || Number(teacher.default_monthly_price) || 0,
    payment_day: Number(s.payment_day) || 1,
    frequency: normalizeFrequency((s as any).frequency),
    next_due_date: ((s as any).next_due_date ?? null) as string | null,
  }))
}

/**
 * Form defaults for add-student: teacher billing frequency + price, and the
 * systemic first-bill date (1st of next month). Never throws — the form
 * stays usable even when the teacher row is missing pieces.
 */
export async function getBillingDefaults() {
  const ctx = await requireUser()
  const fallback = { frequency: 'monthly' as const, price: 0, nextDueDate: firstOfNextMonth() }
  if ('error' in ctx) return fallback
  const { user, service } = ctx
  const teacherId = await getOwnTeacherId(service, user.id)
  if (!teacherId) return fallback
  const { data: teacher } = await service
    .from('teachers')
    .select('default_monthly_price, default_frequency')
    .eq('id', teacherId)
    .maybeSingle()
  if (!teacher) return fallback
  return {
    frequency: normalizeFrequency((teacher as { default_frequency?: unknown }).default_frequency),
    price: Number((teacher as { default_monthly_price?: unknown }).default_monthly_price) || 0,
    nextDueDate: firstOfNextMonth(),
  }
}

export interface NewStudentInput {
  phone?: string
  /** Per-cycle price (what the parent pays each time). Falls back to the teacher default. */
  price?: number
  frequency?: BillingFrequency
  /** First bill date (YYYY-MM-DD). Garbage falls back to the 1st of next month. */
  nextDueDate?: string
}

function normalizeNewStudentInput(input?: string | NewStudentInput): NewStudentInput {
  if (!input) return {}
  if (typeof input === 'string') return { phone: input }
  return input
}

export async function addStudent(name: string, input?: string | NewStudentInput) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const opts = normalizeNewStudentInput(input)

  let { data: teacher } = await service
    .from('teachers')
    .select('id, default_monthly_price, default_frequency')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) {
    const { data: newTeacher, error: createError } = await service
      .from('teachers')
      .insert({ profile_id: user.id })
      .select('id, default_monthly_price, default_frequency')
      .single()

    if (createError || !newTeacher) return { error: 'Teacher not found' }
    teacher = newTeacher
  }

  const frequency = normalizeFrequency(
    (opts as { frequency?: unknown }).frequency ?? (teacher as { default_frequency?: unknown }).default_frequency,
  )
  const price = Number((opts as { price?: unknown }).price) || Number(teacher.default_monthly_price) || 0
  const nextDueDate =
    typeof (opts as { nextDueDate?: unknown }).nextDueDate === 'string' &&
    isValidDueDate((opts as { nextDueDate?: string }).nextDueDate)
      ? ((opts as { nextDueDate?: string }).nextDueDate as string)
      : firstOfNextMonth()

  const { data, error } = await service
    .from('students')
    .insert({
      teacher_id: teacher.id,
      name,
      phone: opts.phone || null,
      monthly_price: price,
      frequency,
      next_due_date: nextDueDate,
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

/**
 * Teacher's date lever: correct or reschedule the outstanding bill.
 * Strict date gate — garbage never writes. Ownership-checked.
 */
export async function updateStudentNextDue(studentId: string, nextDueDate: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  if (!isValidDueDate(nextDueDate)) return { error: 'تاريخ غير صالح — استخدم YYYY-MM-DD.' }

  const { error } = await service
    .from('students')
    .update({ next_due_date: nextDueDate })
    .eq('id', studentId)

  if (error) return { error: error.message }

  await logActivity({
    actionType: 'next_due_update',
    entityType: 'student',
    entityId: studentId,
    details: { next_due_date: nextDueDate },
  }, user.id)

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateStudent(studentId: string, name: string, phone?: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

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
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  // Service client bypasses RLS: only ever use the caller's own teacher id.
  const teacherId = await getOwnTeacherId(service, user.id)
  let teacher: { id: string; default_monthly_price: unknown } | null = null

  if (teacherId) {
    const { data } = await service
      .from('teachers')
      .select('id, default_monthly_price, default_frequency')
      .eq('id', teacherId)
      .maybeSingle()
    teacher = data as { id: string; default_monthly_price: unknown } | null
  }

  if (!teacher) {
    const { data: newTeacher, error: createError } = await service
      .from('teachers')
      .insert({ profile_id: user.id })
      .select('id, default_monthly_price, default_frequency')
      .single()
    if (createError || !newTeacher) return { error: 'Teacher not found' }
    teacher = newTeacher as { id: string; default_monthly_price: unknown }
  }

  const bulkFrequency = normalizeFrequency(
    (teacher as unknown as { default_frequency?: unknown })?.default_frequency,
  )
  const inserts = students.map((s) => ({
    teacher_id: teacher!.id,
    name: s.name,
    phone: s.phone || null,
    monthly_price: Number(teacher!.default_monthly_price) || 0,
    frequency: bulkFrequency,
    next_due_date: firstOfNextMonth(),
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
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

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
