'use server'

// One class schedule, with explicit per-student exceptions.
//
// - Changing the class schedule moves only students still on the default.
// - A student with an outstanding cycle keeps that cycle on the old rhythm;
//   the new schedule is stored as pending and applied by settle_cycle.
// - Resetting a custom student is blocked while anything is owed, so a reset
//   can never silently rewrite a debt.

import { revalidatePath } from 'next/cache'
import { requireUser } from './action-context'
import { assertOwnsStudent, getOwnTeacherId } from './ownership'
import { billingState } from './billing-state'
import { advanceDueDate, firstBillDate, firstBoundaryOnOrAfter } from './billing-next'
import { normalizeFrequency, normalizeWeekday } from './billing-period'
import { logActivity } from './log-activity'

interface ScheduleRow {
  id: string
  frequency: string | null
  next_due_date: string | null
  starts_on: string | null
}

function isDebtor(state: ReturnType<typeof billingState>): boolean {
  return state.paymentState === 'unpaid' || state.paymentState === 'pending'
}

export async function updateTeacherSchedule(formData: FormData) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const frequency = normalizeFrequency(formData.get('default_frequency') as string | null)
  const weekday = normalizeWeekday(formData.get('default_weekday'))
  if (frequency !== 'monthly' && weekday === null) {
    return { error: 'اختر يوم الأسبوع للجدول الجديد.' }
  }

  const { data: teacher } = await service
    .from('teachers')
    .select('id, default_frequency, default_weekday')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) return { error: 'Teacher not found' }
  const teacherId = (teacher as { id: string }).id

  const { error: teacherError } = await service
    .from('teachers')
    .update({ default_frequency: frequency, default_weekday: frequency === 'monthly' ? null : weekday })
    .eq('id', teacherId)
  if (teacherError) return { error: teacherError.message }

  const { data: students } = await service
    .from('students')
    .select('id, frequency, next_due_date, starts_on')
    .is('deleted_at', null)
    .eq('teacher_id', teacherId)
    .eq('schedule_overridden', false)

  const rows = (students ?? []) as ScheduleRow[]
  const today = new Date()

  if (rows.length > 0) {
    const ids = rows.map((r) => r.id)
    const [{ data: payments }, { data: proofs }] = await Promise.all([
      service.from('student_payments').select('student_id, month, paid').in('student_id', ids),
      service.from('payment_proofs').select('student_id, period_key, status').in('student_id', ids),
    ])

    const paymentsByStudent = new Map<string, { month: string; paid: boolean }[]>()
    for (const p of (payments ?? []) as Array<{ student_id: string; month: string; paid: boolean }>) {
      const list = paymentsByStudent.get(p.student_id) ?? []
      list.push({ month: String(p.month), paid: !!p.paid })
      paymentsByStudent.set(p.student_id, list)
    }
    const proofsByStudent = new Map<string, { period_key: string; status: string }[]>()
    for (const p of (proofs ?? []) as Array<{ student_id: string; period_key: string; status: string }>) {
      const list = proofsByStudent.get(p.student_id) ?? []
      list.push({ period_key: String(p.period_key), status: String(p.status) })
      proofsByStudent.set(p.student_id, list)
    }

    for (const student of rows) {
      const oldFrequency = normalizeFrequency(student.frequency)
      const state = billingState({
        student: {
          frequency: oldFrequency,
          next_due_date: student.next_due_date,
          starts_on: student.starts_on,
        },
        payments: paymentsByStudent.get(student.id) ?? [],
        proofs: proofsByStudent.get(student.id) ?? [],
        today,
      })

      if (isDebtor(state)) {
        // Keep the old cycle exactly as it is; promote after it settles.
        const pendingNext = firstBoundaryOnOrAfter(
          advanceDueDate(state.dueISO, oldFrequency),
          frequency,
          weekday,
        )
        await service
          .from('students')
          .update({ pending_frequency: frequency, pending_next_due: pendingNext })
          .is('deleted_at', null)
          .eq('id', student.id)
        continue
      }

      const neverPaid = state.paymentState === 'awaiting_start'
      const nextDue = neverPaid
        ? firstBillDate(frequency, today, weekday)
        : firstBoundaryOnOrAfter(state.dueISO, frequency, weekday)

      await service
        .from('students')
        .update({
          frequency,
          next_due_date: nextDue,
          starts_on: neverPaid ? nextDue : student.starts_on,
          pending_frequency: null,
          pending_next_due: null,
        })
        .is('deleted_at', null)
        .eq('id', student.id)
    }
  }

  await logActivity({
    actionType: 'teacher_settings_update',
    entityType: 'teacher',
    details: { default_frequency: frequency, default_weekday: frequency === 'monthly' ? null : weekday },
  }, user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/unpaid')
  revalidatePath('/pay')
  return { success: true as const }
}

export async function resetStudentSchedule(studentId: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, name, frequency, next_due_date, starts_on')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()
  const s = student as
    | { id: string; teacher_id: string; name: string | null; frequency: string | null; next_due_date: string | null; starts_on: string | null }
    | null
  if (!s) return { error: 'الطالب غير موجود' }

  const teacherId = await getOwnTeacherId(service, user.id)
  if (!teacherId) return { error: 'Teacher not found' }

  const { data: teacher } = await service
    .from('teachers')
    .select('default_frequency, default_weekday')
    .eq('id', teacherId)
    .maybeSingle()
  const t = teacher as { default_frequency?: string | null; default_weekday?: number | null } | null
  const frequency = normalizeFrequency(t?.default_frequency)
  const weekday = normalizeWeekday(t?.default_weekday)

  const [{ data: payments }, { data: proofs }] = await Promise.all([
    service.from('student_payments').select('month, paid').eq('student_id', studentId),
    service.from('payment_proofs').select('period_key, status').eq('student_id', studentId),
  ])

  const state = billingState({
    student: { frequency: s.frequency, next_due_date: s.next_due_date, starts_on: s.starts_on },
    payments: ((payments ?? []) as { month: string; paid: boolean }[]).map((p) => ({
      month: String(p.month),
      paid: !!p.paid,
    })),
    proofs: ((proofs ?? []) as { period_key: string; status: string }[]).map((p) => ({
      period_key: String(p.period_key),
      status: String(p.status),
    })),
    today: new Date(),
  })

  if (isDebtor(state)) {
    return { error: 'سدّد الدورة الحالية أولًا، ثم ارجع الطالب لجدول المجموعة.' }
  }

  const neverPaid = state.paymentState === 'awaiting_start'
  const nextDue = neverPaid
    ? firstBillDate(frequency, new Date(), weekday)
    : firstBoundaryOnOrAfter(state.dueISO, frequency, weekday)

  const { error } = await service
    .from('students')
    .update({
      frequency,
      next_due_date: nextDue,
      starts_on: neverPaid ? nextDue : null,
      schedule_overridden: false,
      pending_frequency: null,
      pending_next_due: null,
    })
    .is('deleted_at', null)
    .eq('id', studentId)
  if (error) return { error: error.message }

  await logActivity({
    actionType: 'next_due_update',
    entityType: 'student',
    entityId: studentId,
    details: { student_name: s.name || 'طالب', reset_to_class_schedule: true },
  }, user.id)

  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/students/${studentId}`)
  return { success: true as const }
}
