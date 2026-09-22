import { describe, it, expect } from 'vitest'
import { getPaymentStatus } from '@/lib/payment-status'

describe('getPaymentStatus', () => {
  it('paid maps to subtle green pill + check, no red', () => {
    const s = getPaymentStatus(true)
    expect(s.label).toBe('مدفوع')
    expect(s.icon).toBe('check')
    expect(s.cardClass).toContain('bg-emerald-50')
    expect(s.cardClass).toContain('border-r-emerald-500')
    expect(s.badgeClass).toContain('bg-emerald-100')
    expect(s.badgeClass).toContain('text-emerald-700')
    expect(s.badgeClass).not.toContain('animate-pulse')
  })

  it('unpaid maps to subtle red pill + clock, no solid red', () => {
    const s = getPaymentStatus(false)
    expect(s.label).toBe('لم يدفع')
    expect(s.icon).toBe('clock')
    expect(s.cardClass).toContain('bg-red-50')
    expect(s.cardClass).toContain('border-r-red-500')
    expect(s.badgeClass).toContain('bg-red-100')
    expect(s.badgeClass).toContain('text-red-700')
    expect(s.badgeClass).not.toContain('bg-red-600')
    expect(s.badgeClass).not.toContain('animate-pulse')
  })
})
