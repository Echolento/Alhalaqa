import { describe, it, expect } from 'vitest'
import { biweeklyOrderInMonth, describePeriod } from '@/lib/period-label'

describe('describePeriod', () => {
  it('monthly shows month/year only, no date', () => {
    const labels = describePeriod('2026-09-01', 'monthly')
    expect(labels.payerLabel).toContain('سبتمبر')
    expect(labels.payerLabel).not.toContain('01')
    expect(labels.teacherLabel).toBe(labels.payerLabel)
  })

  it('weekly shows this-week + full Arabic range', () => {
    const today = new Date(2026, 6, 3) // inside the Jul 1–7 week (local, TZ-robust)
    const labels = describePeriod('2026-07-01', 'weekly', today)
    expect(labels.payerLabel).toContain('هذا الأسبوع')
    expect(labels.payerLabel).toContain('يوليو')
    // 7-day span: Jul 1 → Jul 7.
    expect(labels.teacherLabel).toContain('–')
  })

  it('weekly label tells the truth for past and future cycles', () => {
    const today = new Date(2026, 6, 3)
    expect(describePeriod('2026-06-24', 'weekly', today).payerLabel).toContain('الأسبوع الماضي')
    expect(describePeriod('2026-07-08', 'weekly', today).payerLabel).toContain('الأسبوع القادم')
    expect(describePeriod('2026-06-10', 'weekly', today).payerLabel).toContain('قبل')
  })

  it('biweekly labels cycle order within the month', () => {
    const first = describePeriod('2026-09-02', 'biweekly')
    expect(first.payerLabel).toContain('الأولى')
    expect(first.payerLabel).toContain('سبتمبر')
    const second = describePeriod('2026-09-16', 'biweekly')
    expect(second.payerLabel).toContain('الثانية')
    // Teacher flavor carries the 14-day range.
    expect(second.teacherLabel).toContain('–')
  })

  it('defaults unknown frequency to monthly', () => {
    expect(describePeriod('2026-09-01', null).payerLabel).toBe(
      describePeriod('2026-09-01', 'monthly').payerLabel,
    )
  })
})

describe('biweeklyOrderInMonth', () => {
  it('counts grid starts inside the calendar month', () => {
    expect(biweeklyOrderInMonth('2026-09-02')).toBe(1)
    expect(biweeklyOrderInMonth('2026-09-16')).toBe(2)
    expect(biweeklyOrderInMonth('2026-09-30')).toBe(3)
  })
})
