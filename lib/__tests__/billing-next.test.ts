// lib/__tests__/billing-next.test.ts
// Next-due engine: one explicit date per student drives everything.
// Prepay (pay BEFORE the period), full cycle price, advance anchored to
// the DUE date (late payment never drifts the rhythm).

import { describe, it, expect } from 'vitest'
import {
  firstOfNextMonth,
  advanceDueDate,
  duePeriodKey,
  dueOverdueInfo,
  isValidDueDate,
  formatDueDateAr,
} from '@/lib/billing-next'

describe('firstOfNextMonth', () => {
  it('returns the 1st of the following month', () => {
    expect(firstOfNextMonth(new Date(2026, 8, 20))).toBe('2026-10-01')
    expect(firstOfNextMonth(new Date(2026, 11, 5))).toBe('2027-01-01')
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
