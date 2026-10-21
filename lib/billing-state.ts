// lib/billing-state.ts
// The ONE source of truth for "a student's billing state". Every surface
// (teacher list, student profile, payer pay screen, cron, overdue, reminder)
// derives its cycle + status from here instead of re-inventing the rule.
// Pure: no DB, no network — the interface IS the test surface.

import { normalizeFrequency } from '@/lib/billing-period'
import { dueOverdueInfo, duePeriodKey, outstandingDueISO, previousCycleKey, toISODate } from '@/lib/billing-next'
import { describePeriod } from '@/lib/period-label'

export interface BillingStudent {
  frequency?: unknown
  next_due_date?: string | null
  payment_day?: number | null
}

export interface PaymentRow {
  month: string
  paid: boolean
}

export interface ProofRow {
  period_key: string
  status: string
}

/** The four states every UI surface renders. Precedence is paid → pending → not due → unpaid. */
export type PaymentState = 'paid' | 'pending' | 'not_due' | 'unpaid'

export interface BillingState {
  /** The outstanding cycle's history key (month-first for monthly, cycle-start date for weekly/biweekly). */
  cycleKey: string
  /** The outstanding cycle's due date (YYYY-MM-DD). */
  dueISO: string
  /** Human payer-facing label for the cycle. */
  periodLabel: string
  /** A settled payment row exists for cycleKey. */
  isPaidForPeriod: boolean
  /** A pending receipt exists for cycleKey. */
  isPending: boolean
  /** The outstanding cycle was explicitly reopened (unpaid row or revoked receipt). */
  isReopened: boolean
  /** Paid for the cycle OR the cycle is not due yet (and not reopened) → nothing owed. */
  isSettled: boolean
  /** Due today/past, not settled, no pending receipt. */
  isOverdue: boolean
  /** The single state the dashboard renders; never re-derive this in components. */
  paymentState: PaymentState
  /** Not settled, but the immediately-preceding cycle is settled. */
  paidLastPeriod: boolean
  /** Days past the due date (0 when not past). */
  daysOverdue: number
}

export function billingState(input: {
  student: BillingStudent
  payments: PaymentRow[]
  proofs?: ProofRow[]
  today?: Date
}): BillingState {
  const today = input.today ?? new Date()
  const freq = normalizeFrequency(input.student.frequency)
  const dueISO = outstandingDueISO(input.student, today)
  const cycleKey = duePeriodKey(dueISO, freq)

  const isPaidForPeriod = input.payments.some((p) => p.month === cycleKey && p.paid)
  const isPending = (input.proofs ?? []).some(
    (p) => p.period_key === cycleKey && p.status === 'pending',
  )
  // A cycle that was settled/reviewed and then reopened (teacher undo, or a
  // rejected receipt) is owed again — even if its due date is still ahead.
  const isReopened =
    input.payments.some((p) => p.month === cycleKey && !p.paid) ||
    (input.proofs ?? []).some(
      (p) => p.period_key === cycleKey && (p.status === 'rejected' || p.status === 'undone'),
    )
  const isSettled = isPaidForPeriod || (dueISO > toISODate(today) && !isReopened)
  const isOverdue = !isSettled && !isPending
  const paymentState: PaymentState = isPaidForPeriod
    ? 'paid'
    : isPending
      ? 'pending'
      : isSettled
        ? 'not_due'
        : 'unpaid'
  const { daysOverdue } = dueOverdueInfo(dueISO, today, 0)
  const prevKey = previousCycleKey(dueISO, freq)
  const paidLastPeriod =
    !isSettled && input.payments.some((p) => p.month === prevKey && p.paid)

  return {
    cycleKey,
    dueISO,
    periodLabel: describePeriod(cycleKey, freq, today).payerLabel,
    isPaidForPeriod,
    isPending,
    isReopened,
    isSettled,
    isOverdue,
    paymentState,
    paidLastPeriod,
    daysOverdue,
  }
}
