// lib/period-label.ts
// PURE human labels for billing periods (no DB, no network).
// Raw period keys (cycle-start dates like 2026-09-01) confuse everyone:
//   - monthly  → month/year only: سبتمبر 2026
//   - biweekly → cycle order in month: الدفعة الأولى — سبتمبر 2026
//   - weekly   → هذا الأسبوع + full Arabic range: ١ يوليو – ٧ يوليو
// Teacher flavor always carries the range (backend needs precision);
// payer flavor carries it for weekly only (due screen + hero).

import {
  normalizeFrequency,
  type BillingFrequency,
} from '@/lib/billing-period'

const DAY_MS = 24 * 60 * 60 * 1000

function parseKey(periodKey: string): Date {
  const [y, m, d] = periodKey.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

function monthYear(d: Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

function dayMonth(d: Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(d)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

/**
 * Biweekly cycle order (1-based) within the period's calendar month.
 * Cycles are consecutive 14-day blocks on the student's grid; order counts
 * how many cycle starts fall in-month up to and including this one.
 */
export function biweeklyOrderInMonth(periodKey: string): number {
  const start = parseKey(periodKey)
  const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  // Walk back to the grid block containing monthStart, then count forward.
  let cursor = new Date(start.getTime())
  while (cursor.getTime() - 14 * DAY_MS >= monthStart.getTime()) {
    cursor = new Date(cursor.getTime() - 14 * DAY_MS)
  }
  let order = 0
  const limit = start.getTime()
  // Guard: a month holds at most 3 biweekly starts; cap iterations anyway.
  for (let i = 0; i < 6; i++) {
    if (cursor.getTime() > limit) break
    if (cursor.getTime() >= monthStart.getTime()) order++
    cursor = new Date(cursor.getTime() + 14 * DAY_MS)
  }
  return Math.max(1, order)
}

const AR_ORDINALS = ['الأولى', 'الثانية', 'الثالثة'] as const

export interface PeriodLabels {
  payerLabel: string
  teacherLabel: string
}

export function describePeriod(
  periodKey: string,
  frequency?: BillingFrequency | null,
): PeriodLabels {
  const freq = normalizeFrequency(frequency)
  const start = parseKey(periodKey)
  const my = monthYear(start)

  if (freq === 'weekly') {
    const range = `${dayMonth(start)} – ${dayMonth(addDays(start, 6))}`
    return {
      payerLabel: `هذا الأسبوع (${range})`,
      teacherLabel: range,
    }
  }

  if (freq === 'biweekly') {
    const order = biweeklyOrderInMonth(periodKey)
    const ordinal = AR_ORDINALS[Math.min(order, 3) - 1]
    const range = `${dayMonth(start)} – ${dayMonth(addDays(start, 13))}`
    return {
      payerLabel: `الدفعة ${ordinal} — ${my}`,
      teacherLabel: `الدفعة ${ordinal} — ${my} (${range})`,
    }
  }

  return { payerLabel: my, teacherLabel: my }
}
