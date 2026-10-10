// lib/billing-next.ts
// Next-due engine (pure): ONE explicit date per student drives scheduling.
// Prepay model — next_due_date is the START of the period being paid for,
// full cycle price, no proration. Advancement anchors to the DUE date so a
// late payment never drifts the rhythm. Grace/overdue counts from the due
// date. Local-day math (same convention as lib/billing-period.ts).

import { normalizeFrequency, type BillingFrequency } from '@/lib/billing-period'

const DAY_MS = 24 * 60 * 60 * 1000

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Strict YYYY-MM-DD calendar-date gate (teacher-typed next-due input). */
export function isValidDueDate(input: unknown): input is string {
  if (typeof input !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false
  return toISODate(parseISODate(input)) === input
}

/** Roster display: "1 أكتوبر" (day + Arabic month). Null → em dash. */
export function formatDueDateAr(iso: string | null | undefined): string {
  if (!iso || !isValidDueDate(iso)) return '—'
  return parseISODate(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
}

/** Default first bill: the 1st of next month (pointed out in UI copy). */
export function firstOfNextMonth(from: Date = new Date()): string {
  return toISODate(new Date(from.getFullYear(), from.getMonth() + 1, 1))
}

/**
 * Next due after the given due date is settled. Weekly +7d, biweekly +14d,
 * monthly +1mo clamped to month end (Jan 31 → Feb 28). Unknown frequency
 * behaves as monthly.
 */
export function advanceDueDate(dueISO: string, frequency: BillingFrequency | null | undefined): string {
  const freq = normalizeFrequency(frequency)
  const due = parseISODate(dueISO)
  if (freq === 'weekly') return toISODate(new Date(due.getTime() + 7 * DAY_MS))
  if (freq === 'biweekly') return toISODate(new Date(due.getTime() + 14 * DAY_MS))
  const day = due.getDate()
  const next = new Date(due.getFullYear(), due.getMonth() + 1, 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return toISODate(next)
}

/**
 * History key for proofs/payments, derived from the due date being paid.
 * Monthly keys by due month (YYYY-MM-01); weekly/biweekly by the due date
 * itself (cycle-start convention).
 */
export function duePeriodKey(dueISO: string, frequency: BillingFrequency | null | undefined): string {
  const freq = normalizeFrequency(frequency)
  const due = parseISODate(dueISO)
  if (freq === 'monthly') return toISODate(new Date(due.getFullYear(), due.getMonth(), 1))
  return toISODate(due)
}

/** Overdue = past due date + grace window; days count from the due date. */
export function dueOverdueInfo(
  dueISO: string,
  today: Date = new Date(),
  graceDays: number = 3,
): { overdue: boolean; daysOverdue: number } {
  const due = parseISODate(dueISO)
  const start = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysOverdue = Math.floor((now.getTime() - start.getTime()) / DAY_MS)
  return { overdue: daysOverdue >= graceDays, daysOverdue: Math.max(0, daysOverdue) }
}

/**
 * The student's outstanding due date: next_due_date, or the systemic first
 * bill (1st of next month) for legacy rows without one. Single source for
 * the "never the wall clock" convention.
 */
export function outstandingDueISO(
  row: { next_due_date?: string | null },
  today: Date = new Date(),
): string {
  return row.next_due_date ?? firstOfNextMonth(today)
}

/**
 * The outstanding cycle's period key — derived from the outstanding due date
 * + frequency. The one helper every nag/proof/pay path should use instead of
 * re-deriving `duePeriodKey(next_due_date ?? firstOfNextMonth(), freq)`.
 */
export function outstandingCycleKey(
  row: { next_due_date?: string | null; frequency?: unknown },
  today: Date = new Date(),
): string {
  return duePeriodKey(outstandingDueISO(row, today), normalizeFrequency(row.frequency))
}
