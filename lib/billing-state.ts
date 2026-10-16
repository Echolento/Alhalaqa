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
  /** Paid for the cycle OR the cycle is not due yet → nothing owed. */
  isSettled: boolean
  /** Due today/past, not settled, no pending receipt. */
  isOverdue: boolean
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
  const isSettled = isPaidForPeriod || dueISO > toISODate(today)
  const isOverdue = !isSettled && !isPending
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
    isSettled,
    isOverdue,
    paidLastPeriod,
    daysOverdue,
  }
}
