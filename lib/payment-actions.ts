'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './action-context'
import { getCurrentMonthKey, getPeriodDueDate, cycleStartsInMonth, normalizeFrequency, type BillingFrequency } from './billing-period'
import { duePeriodKey, firstOfNextMonth, toISODate } from './billing-next'
import { billingState } from './billing-state'
import { nextDueAfterSettle } from './billing-cycle'
import { logActivity } from './log-activity'
import { assertOwnsStudent } from './ownership'
import { CURRENCY_CODE } from './currency'

export async function getTeacherPayments(month?: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return { students: [], payments: [], currency: CURRENCY_CODE, expected: 0, collected: 0 }
  const { user, supabase } = ctx

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, default_monthly_price')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) return { students: [], payments: [], currency: CURRENCY_CODE, expected: 0, collected: 0 }

  const monthKey = month || getCurrentMonthKey()

  const { data: students } = await supabase
    .from('students')
    .select('id, name, phone, monthly_price, payment_day, frequency, next_due_date, starts_on, claimed_by')
    .is('deleted_at', null)
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  const today = new Date()
  const ids = (students || []).map(s => s.id)

  // One fetch of the roster's payment rows + pending proofs, keyed by student.
  const rowsByStudent = new Map<string, Record<string, unknown>[]>()
  const proofsByStudent = new Map<string, { id: string; period_key: string; status: string }[]>()
  if (ids.length > 0) {
    const [{ data: rows }, { data: pendingProofs }] = await Promise.all([
      supabase.from('student_payments').select('*').in('student_id', ids),
      supabase
        .from('payment_proofs')
        .select('id, student_id, period_key')
        .eq('status', 'pending')
        .in('student_id', ids),
    ])
    for (const row of rows || []) {
      const r = row as Record<string, unknown>
      const key = r.student_id as string
      const list = rowsByStudent.get(key) ?? []
      list.push(r)
      rowsByStudent.set(key, list)
    }
    for (const proof of pendingProofs || []) {
      const p = proof as { id: string; student_id: string; period_key: string }
      const list = proofsByStudent.get(p.student_id) ?? []
      list.push({ id: p.id, period_key: p.period_key, status: 'pending' })
      proofsByStudent.set(p.student_id, list)
    }
  }

  // Every per-student field the list renders comes from ONE billing-state call:
  // the outstanding cycle, whether it is settled / pending / overdue, and the
  // "previous period paid" reassurance. No caller re-derives the rule.
  const normalizedStudents = (students || []).map(s => {
    const rows = rowsByStudent.get(s.id) ?? []
    const proofs = proofsByStudent.get(s.id) ?? []
    const state = billingState({
      student: s,
      payments: rows.map(r => ({ month: String(r.month), paid: !!r.paid })),
      proofs,
      today,
    })
    // The receipt awaiting review for THIS cycle — the review CTA deep-links to
    // it so the teacher verifies the proof instead of blind-settling the ledger
    // (which left the proof stuck at pending forever).
    const pendingProofId = proofs.find(p => p.period_key === state.cycleKey)?.id ?? null
    return {
      id: s.id,
      full_name: s.name || 'طالب',
      monthly_price: s.monthly_price || teacher.default_monthly_price || 0,
      phone: (s as any).phone ?? null,
      payment_day: s.payment_day || 1,
      frequency: normalizeFrequency((s as any).frequency),
      next_due_date: ((s as any).next_due_date ?? null) as string | null,
      starts_on: ((s as any).starts_on ?? null) as string | null,
      claimed_by: (s as any).claimed_by ?? null,
      currentMonthKey: state.cycleKey,
      paidCycleKey: state.paidCycleKey,
      paymentState: state.paymentState,
      paidLastPeriod: state.paidLastPeriod,
      pendingProofId,
    }
  })

  // Target row for the toggle. Paid students have already advanced
  // next_due_date, so their settled row lives on paidCycleKey, not cycleKey.
  const payments = normalizedStudents
    .map(s => {
      const target = s.paidCycleKey ?? s.currentMonthKey
      return (rowsByStudent.get(s.id) ?? []).filter(p => String(p.month) === target)[0]
    })
    .filter(Boolean)

  // Month totals honour frequency: an interval student contributes one price
  // per cycle that STARTS in the selected month (weekly ≈ 4, biweekly ≈ 2),
  // and collected counts only paid cycles inside that month.
  let expected = 0
  let collected = 0
  for (const s of normalizedStudents) {
    if (s.paymentState === 'awaiting_start') continue
    const starts = cycleStartsInMonth(s.frequency, monthKey, s.payment_day)
    expected += (Number(s.monthly_price) || 0) * starts.length
    const startsSet = new Set(starts)
    for (const row of rowsByStudent.get(s.id) ?? []) {
      const r = row as { paid?: boolean; month?: string; amount_paid?: number }
      if (r.paid && r.month && startsSet.has(r.month)) {
        collected += Number(r.amount_paid) || 0
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

  return { students: normalizedStudents, payments, currency: CURRENCY_CODE, expected, collected }
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
  const monthKey = month ?? duePeriodKey(cycleDue ?? firstOfNextMonth(), cycleFrequency)

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
