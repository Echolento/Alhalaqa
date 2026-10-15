'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from './action-context'
import { getCurrentMonthKey, getPeriodDueDate, cycleStartsInMonth, normalizeFrequency, type BillingFrequency } from './billing-period'
import { duePeriodKey, firstOfNextMonth, outstandingCycleKey, previousCycleKey, toISODate } from './billing-next'
import { advanceStudentCycle } from './billing-cycle'
import { logActivity } from './log-activity'
import { assertOwnsStudent } from './ownership'

export async function getTeacherPayments(month?: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return { students: [], payments: [], currency: 'SAR', expected: 0, collected: 0 }
  const { user, supabase } = ctx

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, currency, default_monthly_price')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!teacher) return { students: [], payments: [], currency: 'SAR', expected: 0, collected: 0 }

  const monthKey = month || getCurrentMonthKey()

  const { data: students } = await supabase
    .from('students')
    .select('id, name, phone, monthly_price, payment_day, frequency, next_due_date, claimed_by')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  const today = new Date()
  const normalizedStudents = (students || []).map(s => {
    const frequency = normalizeFrequency((s as any).frequency)
    // Every student is viewed against their OUTSTANDING cycle (next_due_date,
    // the source of truth) — the same cycle the payer pay screen and the cron
    // use. The selected `month` drives only the expected/collected totals, never
    // the per-student status (a wall-clock month made the list disagree with the
    // payer and read a lapsed student as paid).
    const cycleKey = outstandingCycleKey(s, today)
    return {
      id: s.id,
      full_name: s.name || 'طالب',
      monthly_price: s.monthly_price || teacher.default_monthly_price || 0,
      phone: (s as any).phone ?? null,
      payment_day: s.payment_day || 1,
      frequency,
      next_due_date: ((s as any).next_due_date ?? null) as string | null,
      claimed_by: (s as any).claimed_by ?? null,
      currentMonthKey: cycleKey,
    }
  })

  // Pending-confirmation proofs turn the card amber instead of red. Matched by
  // (student, outstanding cycle) — the SAME period the pay screen uses. A stale
  // pending proof for a cycle that already advanced must not amber the current one.
  const pendingKeys = new Set<string>()
  {
    const ids = normalizedStudents.map(s => s.id)
    if (ids.length > 0) {
      const { data: pendingProofs } = await supabase
        .from('payment_proofs')
        .select('student_id, period_key')
        .eq('status', 'pending')
        .in('student_id', ids)
      for (const proof of pendingProofs || []) {
        const p = proof as { student_id: string; period_key: string }
        pendingKeys.add(`${p.student_id}_${p.period_key}`)
      }
    }
  }
  for (const s of normalizedStudents) {
    (s as any).hasPendingProof = pendingKeys.has(`${s.id}_${s.currentMonthKey}`)
  }

  // Payments: the row for each student's OUTSTANDING cycle (currentMonthKey),
  // or nothing → unpaid. No latest-row fallback: the shown cycle is the owed
  // cycle, so a missing row means the family owes it.
  const ids = normalizedStudents.map(s => s.id)
  const rowsByStudent = new Map<string, Record<string, unknown>[]>()
  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from('student_payments')
      .select('*')
      .in('student_id', ids)
    for (const row of rows || []) {
      const r = row as Record<string, unknown>
      const key = r.student_id as string
      const list = rowsByStudent.get(key) ?? []
      list.push(r)
      rowsByStudent.set(key, list)
    }
  }
  const payments = normalizedStudents
    .map(s => {
      const rows = (rowsByStudent.get(s.id) ?? [])
        .slice()
        .sort((a, b) => String(b.month).localeCompare(String(a.month)))
      // The shown cycle IS the outstanding cycle for every frequency, so an
      // absent row means unpaid — no "latest row" fallback (that made a lapsed
      // student read as paid whenever an older cycle was settled).
      return rows.filter(p => p.month === s.currentMonthKey)[0]
    })
    .filter(Boolean)

  // "Previous period paid" reassurance: the outstanding cycle is unpaid but the
  // one right before it was settled — so a student who just paid (and ratcheted
  // to a fresh unpaid cycle) doesn't read as if the toggle never registered.
  // A cycle that isn't DUE YET counts as settled too: a student due on the 18th
  // is not "لم يدفع" on the 14th.
  const todayISO = toISODate(today)
  for (const s of normalizedStudents) {
    const rows = rowsByStudent.get(s.id) ?? []
    const outstandingPaid = rows.some(
      r => (r as { month?: string; paid?: boolean }).month === s.currentMonthKey && (r as { paid?: boolean }).paid,
    )
    const dueISO = ((s as { next_due_date?: string | null }).next_due_date) ?? firstOfNextMonth(today)
    const settled = outstandingPaid || dueISO > todayISO
    ;(s as { settled?: boolean }).settled = settled
    const prevKey = previousCycleKey(dueISO, s.frequency)
    ;(s as { paidLastPeriod?: boolean }).paidLastPeriod =
      !settled && rows.some(r => (r as { month?: string; paid?: boolean }).month === prevKey && (r as { paid?: boolean }).paid)
  }

  // Month totals honour frequency: an interval student contributes one price
  // per cycle that STARTS in the selected month (weekly ≈ 4, biweekly ≈ 2),
  // and collected counts only paid cycles inside that month.
  let expected = 0
  let collected = 0
  for (const s of normalizedStudents) {
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

  return { students: normalizedStudents, payments, currency: teacher.currency, expected, collected }
}

export async function updateStudentMonthlyPrice(studentId: string, price: number, month?: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

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

  if (newPaid) {
    await advanceStudentCycle(service, studentId, monthKey, cycleFrequency, cycleDue)
  } else {
    // Undo reverses the advance too: point the outstanding cycle back at the
    // now-unpaid period's DUE date (period keys are month-firsts — restoring
    // the real due date keeps monthly payment days intact), so the payer's view
    // re-syncs instead of still reading the advanced cycle as paid.
    // Never moves it later (only retreats when the untoggled cycle is older).
    const retreatDue = toISODate(getPeriodDueDate(monthKey, cycleFrequency, cyclePayDay))
    if (!cycleDue || retreatDue < cycleDue) {
      await service.from('students').update({ next_due_date: retreatDue }).eq('id', studentId)
    }
    // Revoke accepted receipts for the reopened cycle so the payer's history
    // stops claiming "مقبول". Silent (no push) — undo is a teacher correction;
    // the receipt image is kept as an audit trail.
    await service
      .from('payment_proofs')
      .update({ status: 'undone', updated_at: new Date().toISOString() })
      .eq('student_id', studentId)
      .eq('period_key', monthKey)
      .eq('status', 'verified')
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
