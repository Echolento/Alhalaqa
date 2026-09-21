import { describe, it, expect } from 'vitest'
import { getPaymentStatus } from '@/lib/payment-status'

describe('getPaymentStatus', () => {
  it('paid maps to green language', () => {
    const s = getPaymentStatus(true)
    expect(s.label).toBe('مدفوع')
    expect(s.cardClass).toContain('bg-emerald-50')
    expect(s.avatarClass).toContain('emerald')
    expect(s.icon).toBe('check')
    expect(s.badgeClass ?? '').not.toContain('animate-pulse')
  })

  it('unpaid maps to red language with edge + pulsing badge', () => {
    const s = getPaymentStatus(false)
    expect(s.label).toBe('لم يدفع')
    expect(s.cardClass).toContain('bg-red-50')
    expect(s.cardClass).toContain('border-r-red-500')
    expect(s.avatarClass).toContain('red')
    expect(s.icon).toBe('user')
    expect(s.badgeClass).toContain('animate-pulse')
  })
})
