'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './action-context'
import { getCurrentMonthKey, getPeriodDueDate, cycleStartsInMonth, normalizeFrequency, type BillingFrequency } from './billing-period'
import { duePeriodKey, firstOfNextMonth, toISODate, previousCycleKey } from './billing-next'
import { nextDueAfterSettle } from './billing-cycle'
import { loadRosterBilling, type RosterPaymentRow } from './roster-billing'
import { getOverdueStudents } from './overdue'
import { logActivity } from './log-activity'
import { assertOwnsStudent } from './ownership'
import { CURRENCY_CODE } from './currency'

export async function getTeacherPayments(month?: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return { students: [], payments: [], currency: CURRENCY_CODE, expected: 0, collected: 0, overdueIds: [] }
  const { user, supabase } = ctx

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, default_monthly_price')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) return { students: [], payments: [], currency: CURRENCY_CODE, expected: 0, collected: 0, overdueIds: [] }

  const monthKey = month || getCurrentMonthKey()
  const today = new Date()

  // One shared roster read (same module the cron uses): full payment history +
  // pending receipts + the canonical per-student billing state.
  const roster = await loadRosterBilling(supabase, teacher.id, today)

  // Every per-student field the list renders comes from ONE billing-state call:
  // the outstanding cycle, whether it is settled / pending / overdue, and the
  // "previous period paid" reassurance. No caller re-derives the rule.
  const normalizedStudents = roster.entries.map(({ student: s, state, pendingProofId }) => ({
    id: s.id,
    full_name: s.name || 'طالب',
    monthly_price: s.monthly_price || teacher.default_monthly_price || 0,
    phone: s.phone ?? null,
    payment_day: s.payment_day || 1,
    frequency: normalizeFrequency(s.frequency),
    next_due_date: s.next_due_date ?? null,
    starts_on: s.starts_on ?? null,
    claimed_by: s.claimed_by ?? null,
    currentMonthKey: state.cycleKey,
    paidCycleKey: state.paidCycleKey,
    paymentState: state.paymentState,
    paidLastPeriod: state.paidLastPeriod,
    pendingProofId,
  }))

  // Target row for the toggle. Paid students have already advanced
  // next_due_date, so their settled row lives on paidCycleKey, not cycleKey.
  const payments: RosterPaymentRow[] = roster.entries.flatMap(({ state, rows }) => {
    const target = state.paidCycleKey ?? state.cycleKey
    const row = rows.find((p) => String(p.month) === target)
    return row ? [row] : []
  })

  // Month totals honour frequency: an interval student contributes one price
  // per cycle that STARTS in the selected month (weekly ≈ 4, biweekly ≈ 2),
  // and collected counts only paid cycles inside that month.
  let expected = 0
  let collected = 0
  for (const entry of roster.entries) {
    if (entry.state.paymentState === 'awaiting_start') continue
    const s = entry.student
    const price = s.monthly_price || teacher.default_monthly_price || 0
    const starts = cycleStartsInMonth(
      normalizeFrequency(s.frequency),
      monthKey,
      s.payment_day || 1,
    )
    expected += (Number(price) || 0) * starts.length
    const startsSet = new Set(starts)
    for (const row of entry.rows) {
      if (row.paid && row.month && startsSet.has(String(row.month))) {
        collected += Number(row.amount_paid) || 0
      }
    }
  }

  const stateOrder: Record<string, number> = {
    pending: 0,
    unpaid: 1,
    paid: 2,
    awaiting_start: 3,
  }
  normalizedStudents.sort(
    (a, b) => (stateOrder[a.paymentState] ?? 9) - (stateOrder[b.paymentState] ?? 9),
  )

  // The ?overdue=1 email CTA overlays exactly the students the email named.
  // Derived from the SAME roster read (full history + pending receipts, grace
  // 0) — never from the one-row-per-student list below, which cannot tell
  // "settled last cycle" from "never paid" or spot a pending receipt.
  const overdueIds = getOverdueStudents(
    roster.entries.map(({ student }) => ({
      id: student.id,
      name: student.name || 'طالب',
      frequency: normalizeFrequency(student.frequency),
      next_due_date: student.next_due_date,
      starts_on: student.starts_on,
    })),
    roster.payments,
    today,
    0,
    roster.proofs,
  ).map((o) => o.id)

  return {
    students: normalizedStudents,
    payments,
    currency: CURRENCY_CODE,
    expected,
    collected,
    overdueIds,
  }
}

export async function updateStudentMonthlyPrice(studentId: string, price: number, month?: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  // Garbage never writes: non-finite or out-of-range prices corrupt totals
  // and the ledger downstream. Legitimate prices pass through untouched.
  if (!Number.isFinite(price) || price < 0 || price > 1e7) {
    return { error: 'سعر غير صالح' }
  }

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const { data: student } = await service
    .from('students')
    .select('name, monthly_price')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()

  const oldPrice = student?.monthly_price || 0

  const { error: studentError } = await service
    .from('students')
    .update({ monthly_price: price })
    .is('deleted_at', null)
    .eq('id', studentId)

  if (studentError) return { error: studentError.message }

  if (month) {
    // Liveness re-check before touching the ledger: a delete racing the edit
    // must not rewrite a trashed row's payment history.
    const { data: live } = await service
      .from('students')
      .select('id')
      .is('deleted_at', null)
      .eq('id', studentId)
      .maybeSingle()
    if (!live) return { error: 'الطالب غير موجود' }

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

    // Final gate before the audit row: if the row was trashed between the
    // check and the write, report missing with no log (the write above is
    // keyed by payment id and cannot itself touch student state).
    const { data: stillLive } = await service
      .from('students')
      .select('id')
      .is('deleted_at', null)
      .eq('id', studentId)
      .maybeSingle()
    if (!stillLive) return { error: 'الطالب غير موجود' }
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
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  // Outstanding cycle when the teacher taps blind (no month): the student's
  // next-due date, never the wall clock. Cycle info is always read — paid
  // taps advance it below (undo never moves it: one-way ratchet).
  const { data: cycleRow } = await service
    .from('students')
    .select('frequency, name, next_due_date, payment_day')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()

  const cycleFrequency = normalizeFrequency((cycleRow as any)?.frequency)
  const cycleDue = ((cycleRow as any)?.next_due_date ?? null) as string | null
  const cyclePayDay = ((cycleRow as any)?.payment_day ?? 1) as number
  const outstandingKey = duePeriodKey(cycleDue ?? firstOfNextMonth(), cycleFrequency)
  const paidKey = previousCycleKey(cycleDue ?? firstOfNextMonth(), cycleFrequency)

  // The cycle key comes from the client. Only the outstanding cycle or the one
  // just settled may be toggled — otherwise a crafted call could settle an
  // arbitrary month, or undo an old cycle and rewind next_due_date (settle and
  // undo are only inverses on the same edge).
  if (month && month !== outstandingKey && month !== paidKey) {
    return { error: 'دورة غير قابلة للتعديل' }
  }
  const monthKey = month ?? outstandingKey

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
      .is('deleted_at', null)
      .eq('id', studentId)
      .maybeSingle(),
  ])

  const s = student as any
  const teacher = Array.isArray(s.teacher) ? s.teacher[0] : s.teacher
  const effectivePrice = s?.monthly_price || teacher?.default_monthly_price || 0

  const existingRow = existing as { id: string; paid: boolean } | null
  const newPaid = !existingRow || !existingRow.paid

  // One atomic RPC per direction: the row flip + the ratchet move (+ revoking
  // accepted receipts on undo) happen together, so a partial failure can never
  // leave the ledger disagreeing with next_due_date.
  if (newPaid) {
    const nextDue = nextDueAfterSettle(monthKey, cycleFrequency, cycleDue)
    const { error } = await service.rpc('settle_cycle', {
      p_student_id: studentId,
      p_cycle_key: monthKey,
      p_amount: effectivePrice,
      p_next_due: nextDue,
      p_proof_id: null,
      p_teacher_note: null,
    })
    if (error) {
      if (String(error.message).includes('student_deleted')) {
        return { error: 'الطالب غير موجود' }
      }
      // DB guard: a receipt for this cycle is awaiting review — verify it from
      // الإيصالات instead of settling the ledger behind it.
      if (String(error.message).includes('proof_pending')) {
        return { error: 'يوجد إيصال قيد المراجعة لهذه الفترة — راجعه من الإيصالات' }
      }
      return { error: error.message }
    }
  } else {
    // Undo reverses the advance too: retreat the outstanding cycle to the
    // now-unpaid period's DUE date (period keys are month-firsts — restoring
    // the real due date keeps monthly payment days intact), never later.
    const retreatDue = toISODate(getPeriodDueDate(monthKey, cycleFrequency, cyclePayDay))
    const nextDue = !cycleDue || retreatDue < cycleDue ? retreatDue : null
    const { error } = await service.rpc('reopen_cycle', {
      p_student_id: studentId,
      p_cycle_key: monthKey,
      p_next_due: nextDue,
    })
    if (error) {
      if (String(error.message).includes('student_deleted')) {
        return { error: 'الطالب غير موجود' }
      }
      return { error: error.message }
    }
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
  revalidatePath('/pay')
  return { success: true }
}

export async function updateStudentPaymentDay(studentId: string, paymentDay: number) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  // DB CHECK and the billing domain accept 1..31 (month-end clamping is
  // handled downstream); only non-integers and out-of-range garbage reject.
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
    return { error: 'يوم دفع غير صالح — اختر بين 1 و 31' }
  }

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const { data: student } = await service
    .from('students')
    .select('name, payment_day')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()

  const oldDay = student?.payment_day || 1

  const { error } = await service
    .from('students')
    .update({ payment_day: paymentDay })
    .is('deleted_at', null)
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
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  if (!(await assertOwnsStudent(service, user.id, studentId))) {
    return { error: 'الطالب غير موجود' }
  }

  const next = normalizeFrequency(frequency)

  const { data: student } = await service
    .from('students')
    .select('name, frequency')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()

  const oldFrequency = normalizeFrequency((student as any)?.frequency)

  const { error } = await service
    .from('students')
    .update({ frequency: next })
    .is('deleted_at', null)
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
