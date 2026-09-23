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

describe('getPeriodKey (tracer: monthly compat)', () => {
  it('monthly period key equals legacy billing month key', async () => {
    const { getPeriodKey, getBillingMonthKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-06-15'), 'monthly', 10)).toBe(
      getBillingMonthKey(new Date('2024-06-15'), 10),
    )
  })

  it('weekly cycle starts on anchor weekday (anchor 1 = 2024-01-01 Monday)', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-06-15'), 'weekly', 1)).toBe('2024-06-10')
  })

  it('biweekly anchor 1 cycles every 14 days from 2024-01-01', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-06-15'), 'biweekly', 1)).toBe('2024-06-03')
  })

  it('weekly anchor wraps every 7 (anchor 8 behaves like anchor 1)', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-06-15'), 'weekly', 8)).toBe(
      getPeriodKey(new Date('2024-06-15'), 'weekly', 1),
    )
  })

  it('weekly anchor 2 shifts cycle by one day vs anchor 1', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-06-15'), 'weekly', 2)).toBe('2024-06-11')
  })

  it('weekly crosses month boundary (2024-06-01 Sat -> 2024-05-27 Mon)', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-06-01'), 'weekly', 1)).toBe('2024-05-27')
  })

  it('weekly leap week (2024-03-01 Fri -> 2024-02-26 Mon)', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-03-01'), 'weekly', 1)).toBe('2024-02-26')
  })

  it('defaults unknown/null frequency to monthly (legacy rows)', async () => {
    const { getPeriodKey, getBillingMonthKey } = await import('@/lib/billing-period')
    const d = new Date('2024-06-05')
    expect(getPeriodKey(d, null, 10)).toBe(getBillingMonthKey(d, 10))
    expect(getPeriodKey(d, undefined, 10)).toBe(getBillingMonthKey(d, 10))
  })

  it('biweekly crosses month boundary staying on 14-day grid', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-06-01'), 'biweekly', 1)).toBe('2024-05-20')
  })

  it('monthly leap day respects payment-day threshold', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-02-29'), 'monthly', 30)).toBe('2024-01-01')
    expect(getPeriodKey(new Date('2024-02-29'), 'monthly', 29)).toBe('2024-02-01')
  })

  it('monthly due date clamps anchor 31 to April 30', async () => {
    const { getPeriodDueDate } = await import('@/lib/billing-period')
    const d = getPeriodDueDate('2024-04-01', 'monthly', 31)
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2024, 4, 30])
  })

  it('weekly due date equals cycle start', async () => {
    const { getPeriodDueDate } = await import('@/lib/billing-period')
    const d = getPeriodDueDate('2024-06-10', 'weekly', 1)
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2024, 6, 10])
  })

  it('due info keeps amount unprorated (contract for pushes/pay screen)', async () => {
    const { getDuePeriodInfo } = await import('@/lib/billing-period')
    const info = getDuePeriodInfo(new Date('2024-06-15'), 'weekly', 1, 200)
    expect(info.periodKey).toBe('2024-06-10')
    expect(info.amount).toBe(200)
  })

  it('biweekly anchor wraps every 14 (anchor 15 behaves like anchor 1)', async () => {
    const { getPeriodKey } = await import('@/lib/billing-period')
    expect(getPeriodKey(new Date('2024-06-15'), 'biweekly', 15)).toBe(
      getPeriodKey(new Date('2024-06-15'), 'biweekly', 1),
    )
  })
})
