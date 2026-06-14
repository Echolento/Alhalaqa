import { describe, it, expect } from 'vitest'
import {
  formatMonthKey,
  getCurrentMonthKey,
  getMonthKey,
  prevMonthKey,
  nextMonthKey,
  getBillingMonthKey,
  getCurrentBillingMonthKey,
} from '@/lib/billing-period'

describe('formatMonthKey', () => {
  it('formats year and month into YYYY-MM-01', () => {
    expect(formatMonthKey(2024, 6)).toBe('2024-06-01')
    expect(formatMonthKey(2024, 12)).toBe('2024-12-01')
    expect(formatMonthKey(2024, 1)).toBe('2024-01-01')
  })
})

describe('getMonthKey', () => {
  it('converts a date to YYYY-MM-01', () => {
    expect(getMonthKey(new Date('2024-06-15'))).toBe('2024-06-01')
    expect(getMonthKey(new Date('2024-12-01'))).toBe('2024-12-01')
  })
})

describe('prevMonthKey', () => {
  it('returns previous month key', () => {
    expect(prevMonthKey('2024-06-01')).toBe('2024-05-01')
    expect(prevMonthKey('2024-01-01')).toBe('2023-12-01')
  })
})

describe('nextMonthKey', () => {
  it('returns next month key', () => {
    expect(nextMonthKey('2024-06-01')).toBe('2024-07-01')
    expect(nextMonthKey('2024-12-01')).toBe('2025-01-01')
  })
})

describe('getCurrentMonthKey', () => {
  it('returns current month formatted', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    expect(getCurrentMonthKey()).toBe(expected)
  })
})

describe('getBillingMonthKey', () => {
  it('returns current month when date >= paymentDay', () => {
    expect(getBillingMonthKey(new Date('2024-06-15'), 10)).toBe('2024-06-01')
    expect(getBillingMonthKey(new Date('2024-06-10'), 10)).toBe('2024-06-01')
  })

  it('returns previous month when date < paymentDay', () => {
    expect(getBillingMonthKey(new Date('2024-06-05'), 10)).toBe('2024-05-01')
  })

  it('defaults paymentDay to 1', () => {
    expect(getBillingMonthKey(new Date('2024-06-01'))).toBe('2024-06-01')
    expect(getBillingMonthKey(new Date('2024-06-02'))).toBe('2024-06-01')
  })

  it('handles year boundary', () => {
    expect(getBillingMonthKey(new Date('2024-01-05'), 10)).toBe('2023-12-01')
  })

  it('handles paymentDay of 31', () => {
    expect(getBillingMonthKey(new Date('2024-01-31'), 31)).toBe('2024-01-01')
    expect(getBillingMonthKey(new Date('2024-02-01'), 31)).toBe('2024-01-01')
  })
})

describe('getCurrentBillingMonthKey', () => {
  it('returns billing month for today', () => {
    const now = new Date()
    const result = getCurrentBillingMonthKey()
    expect(result).toMatch(/^\d{4}-\d{2}-01$/)
  })
})
