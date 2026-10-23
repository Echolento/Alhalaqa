// lib/__tests__/billing-next.test.ts
// Next-due engine: one explicit date per student drives everything.
// Prepay (pay BEFORE the period), full cycle price, advance anchored to
// the DUE date (late payment never drifts the rhythm).

import { describe, it, expect } from 'vitest'
import {
  firstOfNextMonth,
  firstBillDate,
  firstBoundaryOnOrAfter,
  weekdayNameAr,
  advanceDueDate,
  previousDueDate,
  previousCycleKey,
  duePeriodKey,
  dueOverdueInfo,
  isValidDueDate,
  formatDueDateAr,
  outstandingDueISO,
  outstandingCycleKey,
} from '@/lib/billing-next'

describe('firstOfNextMonth', () => {
  it('returns the 1st of the following month', () => {
    expect(firstOfNextMonth(new Date(2026, 8, 20))).toBe('2026-10-01')
    expect(firstOfNextMonth(new Date(2026, 11, 5))).toBe('2027-01-01')
  })
})

describe('firstBillDate', () => {
  it('monthly → 1st of next month', () => {
    expect(firstBillDate('monthly', new Date(2026, 8, 20))).toBe('2026-10-01')
  })

  it('weekly/biweekly → a near cycle boundary, never a month out', () => {
    const today = new Date(2026, 9, 12)
    const monthOut = firstOfNextMonth(today)
    const weekly = firstBillDate('weekly', today)
    const biweekly = firstBillDate('biweekly', today)
    // The old default billed a whole month out; the fix keeps it within a cycle.
    expect(weekly < monthOut).toBe(true)
    expect(biweekly < monthOut).toBe(true)
    const days = (new Date(weekly).getTime() - today.getTime()) / 86_400_000
    expect(days).toBeGreaterThanOrEqual(0)
    expect(days).toBeLessThanOrEqual(14)
  })

  it('weekly/biweekly land on the teacher-chosen weekday', () => {
    // Saturday = 6, from Thursday 2026-10-22.
    expect(firstBillDate('weekly', new Date(2026, 9, 22), 6)).toBe('2026-10-24')
    expect(firstBillDate('biweekly', new Date(2026, 9, 22), 6)).toBe('2026-10-24')
    expect(firstBillDate('weekly', new Date(2026, 9, 22), 4)).toBe('2026-10-22')
  })

  it('a student added on the boundary is due that same day', () => {
    expect(firstBillDate('monthly', new Date(2026, 10, 1))).toBe('2026-11-01')
    expect(firstBoundaryOnOrAfter('2026-11-01', 'monthly')).toBe('2026-11-01')
  })

  it('names weekdays for schedule copy', () => {
    expect(weekdayNameAr(6)).toBe('السبت')
  })
})

describe('previousCycleKey', () => {
  it('weekly → the prior 7-day cycle key', () => {
    expect(previousDueDate('2026-10-12', 'weekly')).toBe('2026-10-05')
    expect(previousCycleKey('2026-10-12', 'weekly')).toBe('2026-10-05')
  })

  it('monthly → the prior month key', () => {
    expect(previousCycleKey('2026-10-15', 'monthly')).toBe('2026-09-01')
  })
})

describe('advanceDueDate', () => {
  it('weekly advances 7 days', () => {
    expect(advanceDueDate('2026-09-20', 'weekly')).toBe('2026-09-27')
  })

  it('biweekly advances 14 days', () => {
    expect(advanceDueDate('2026-09-20', 'biweekly')).toBe('2026-10-04')
  })

  it('monthly advances one month, clamped to month end', () => {
    expect(advanceDueDate('2026-09-05', 'monthly')).toBe('2026-10-05')
    expect(advanceDueDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(advanceDueDate('2026-10-01', 'monthly')).toBe('2026-11-01')
  })

  it('defaults unknown frequencies to monthly', () => {
    expect(advanceDueDate('2026-09-05', null)).toBe('2026-10-05')
  })
})

// Calendar stepping must round-trip across every DST window: +N*DAY_MS
// arithmetic broke this for weeks spanning a fall-back (~2 days a year).
describe('advance/previous round-trip (DST-safe stepping)', () => {
  it.each([
    ['2026-10-23', 'weekly'], // spans Egypt's Oct 29 fall-back
    ['2026-10-25', 'weekly'], // due date inside the transition week
    ['2026-04-23', 'weekly'], // spans Egypt's Apr 24 spring-forward
    ['2026-10-16', 'biweekly'],
    ['2026-10-20', 'biweekly'], // spans the fall-back inside 14 days
  ] as const)('%s (%s) round-trips both directions', (due, freq) => {
    expect(previousDueDate(advanceDueDate(due, freq), freq)).toBe(due)
    expect(advanceDueDate(previousDueDate(due, freq), freq)).toBe(due)
  })

  it('stays exactly 7 / 14 calendar days across a DST window', () => {
    expect(advanceDueDate('2026-10-23', 'weekly')).toBe('2026-10-30')
    expect(advanceDueDate('2026-10-23', 'biweekly')).toBe('2026-11-06')
    expect(previousDueDate('2026-10-30', 'weekly')).toBe('2026-10-23')
  })
})

describe('duePeriodKey', () => {
  it('monthly keys by the due month', () => {
    expect(duePeriodKey('2026-10-01', 'monthly')).toBe('2026-10-01')
    expect(duePeriodKey('2026-10-05', 'monthly')).toBe('2026-10-01')
  })

  it('weekly/biweekly key by the due date itself', () => {
    expect(duePeriodKey('2026-09-20', 'weekly')).toBe('2026-09-20')
    expect(duePeriodKey('2026-09-20', 'biweekly')).toBe('2026-09-20')
  })
})

describe('formatDueDateAr', () => {
  it('renders day + Arabic month for roster display', () => {
    expect(formatDueDateAr('2026-10-01')).toContain('أكتوبر')
    expect(formatDueDateAr('2026-10-01')).toContain('١')
    expect(formatDueDateAr(null)).toBe('—')
  })
})

describe('isValidDueDate', () => {
  it('accepts real calendar dates, rejects garbage', () => {
    expect(isValidDueDate('2026-11-03')).toBe(true)
    expect(isValidDueDate('not-a-date')).toBe(false)
    expect(isValidDueDate('2026-13-01')).toBe(false)
    expect(isValidDueDate('2026-02-30')).toBe(false)
    expect(isValidDueDate('')).toBe(false)
  })
})

describe('dueOverdueInfo', () => {
  it('is not overdue before the due date', () => {
    expect(dueOverdueInfo('2026-10-01', new Date(2026, 8, 20)).overdue).toBe(false)
  })

  it('honors the grace window', () => {
    expect(dueOverdueInfo('2026-10-01', new Date(2026, 9, 2), 3).overdue).toBe(false)
    expect(dueOverdueInfo('2026-10-01', new Date(2026, 9, 5), 3).overdue).toBe(true)
  })

  it('counts days overdue from the due date', () => {
    expect(dueOverdueInfo('2026-10-01', new Date(2026, 9, 5), 3).daysOverdue).toBe(4)
  })
})

// Characterization for the "outstanding cycle" convention: every nag/proof/pay
// path derives the period from next_due_date (never the wall clock); legacy
// rows without one bill the 1st of next month.
describe('outstandingDueISO', () => {
  it('returns the stored next_due_date when present', () => {
    expect(outstandingDueISO({ next_due_date: '2026-10-05' })).toBe('2026-10-05')
  })

  it('falls back to the 1st of next month for legacy rows', () => {
    expect(outstandingDueISO({}, new Date(2026, 8, 20))).toBe('2026-10-01')
    expect(outstandingDueISO({ next_due_date: null }, new Date(2026, 8, 20))).toBe('2026-10-01')
  })
})

describe('outstandingCycleKey', () => {
  it('monthly keys by the due month', () => {
    expect(outstandingCycleKey({ next_due_date: '2026-10-05', frequency: 'monthly' })).toBe('2026-10-01')
  })

  it('weekly/biweekly key by the due date itself', () => {
    expect(outstandingCycleKey({ next_due_date: '2026-09-20', frequency: 'weekly' })).toBe('2026-09-20')
    expect(outstandingCycleKey({ next_due_date: '2026-09-20', frequency: 'biweekly' })).toBe('2026-09-20')
  })

  it('defaults unknown/missing frequency to monthly', () => {
    expect(outstandingCycleKey({ next_due_date: '2026-10-05' })).toBe('2026-10-01')
    expect(outstandingCycleKey({ next_due_date: '2026-10-05', frequency: 'garbage' })).toBe('2026-10-01')
  })

  it('legacy rows (no due date) key off the 1st of next month', () => {
    expect(outstandingCycleKey({}, new Date(2026, 8, 20))).toBe('2026-10-01')
  })
})
