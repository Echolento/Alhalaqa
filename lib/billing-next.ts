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

/** Arabic weekday name, Sunday = 0 (JS getDay convention). */
export function weekdayNameAr(weekday: number): string {
  return ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][weekday] ?? ''
}

/**
 * The first boundary of a schedule on or AFTER the given calendar date.
 * Monthly = the 1st; weekly/biweekly = the chosen weekday (including that day).
 * A missing weekday falls back to the date's own weekday.
 */
export function firstBoundaryOnOrAfter(
  iso: string,
  frequency: BillingFrequency | null | undefined,
  weekday?: number | null,
): string {
  const freq = normalizeFrequency(frequency)
  const date = parseISODate(iso)
  if (freq === 'monthly') {
    if (date.getDate() === 1) return toISODate(date)
    return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
  }
  const wd =
    typeof weekday === 'number' && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
      ? weekday
      : date.getDay()
  const delta = (wd - date.getDay() + 7) % 7
  return toISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta))
}

/**
 * First bill for a NEW student. Monthly starts on the 1st; weekly/biweekly on
 * the teacher's chosen weekday. Added exactly on a boundary → due that same day.
 */
export function firstBillDate(
  frequency: BillingFrequency | null | undefined,
  today: Date = new Date(),
  weekday?: number | null,
): string {
  return firstBoundaryOnOrAfter(toISODate(today), frequency, weekday)
}

/**
 * Next due after the given due date is settled. Weekly +7d, biweekly +14d,
 * monthly +1mo clamped to month end (Jan 31 → Feb 28). Unknown frequency
 * behaves as monthly.
 */
export function advanceDueDate(dueISO: string, frequency: BillingFrequency | null | undefined): string {
  const freq = normalizeFrequency(frequency)
  const due = parseISODate(dueISO)
  // Calendar-day stepping, never +N*DAY_MS: a ms window that spans a DST
  // fall-back lands on local 23:00 the day before — weekly loses a day.
  if (freq === 'weekly' || freq === 'biweekly') {
    const next = new Date(due)
    next.setDate(due.getDate() + (freq === 'weekly' ? 7 : 14))
    return toISODate(next)
  }
  const day = due.getDate()
  const next = new Date(due.getFullYear(), due.getMonth() + 1, 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return toISODate(next)
}

/** The due date one interval BEFORE the given one (mirror of advanceDueDate). */
export function previousDueDate(dueISO: string, frequency: BillingFrequency | null | undefined): string {
  const freq = normalizeFrequency(frequency)
  const due = parseISODate(dueISO)
  if (freq === 'weekly' || freq === 'biweekly') {
    const prev = new Date(due)
    prev.setDate(due.getDate() - (freq === 'weekly' ? 7 : 14))
    return toISODate(prev)
  }
  const day = due.getDate()
  const prev = new Date(due.getFullYear(), due.getMonth() - 1, 1)
  const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()
  prev.setDate(Math.min(day, lastDay))
  return toISODate(prev)
}

/**
 * History key of the cycle immediately BEFORE the outstanding one. Used to tell
 * "the family already settled the previous period" so a just-paid student that
 * ratchets to a new unpaid cycle doesn't read as a failed registration.
 */
export function previousCycleKey(dueISO: string, frequency: BillingFrequency | null | undefined): string {
  return duePeriodKey(previousDueDate(dueISO, frequency), normalizeFrequency(frequency))
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
