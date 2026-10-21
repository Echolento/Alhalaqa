import { describe, it, expect } from 'vitest'
import { applyPaidOverride, getPaymentStatus } from '@/lib/payment-status'

describe('getPaymentStatus', () => {
  it('paid maps to subtle green pill + check, no red', () => {
    const s = getPaymentStatus('paid')
    expect(s.label).toBe('مدفوع')
    expect(s.icon).toBe('check')
    expect(s.iconClass).toBe('text-emerald-600')
    expect(s.cardClass).toContain('bg-emerald-50')
    expect(s.cardClass).toContain('border-r-emerald-500')
    expect(s.badgeClass).toContain('bg-emerald-100')
    expect(s.badgeClass).toContain('text-emerald-700')
    expect(s.badgeClass).not.toContain('animate-pulse')
  })

  it('pending proof maps to amber instead of red', () => {
    const s = getPaymentStatus('pending')
    expect(s.label).toBe('قيد المراجعة')
    expect(s.icon).toBe('clock')
    expect(s.iconClass).toBe('text-amber-600')
    expect(s.cardClass).toContain('bg-amber-50')
    expect(s.cardClass).toContain('border-r-amber-500')
    expect(s.badgeClass).toContain('bg-amber-100')
  })

  it('not-yet-due maps to sky, not paid and not red', () => {
    const s = getPaymentStatus('not_due')
    expect(s.label).toBe('مش مستحق')
    expect(s.icon).toBe('clock')
    expect(s.iconClass).toBe('text-sky-600')
    expect(s.cardClass).toContain('bg-sky-50')
    expect(s.cardClass).toContain('border-r-sky-500')
    expect(s.badgeClass).toContain('bg-sky-100')
    expect(s.badgeClass).not.toContain('text-red')
  })

  it('unpaid maps to subtle red pill + clock, no solid red', () => {
    const s = getPaymentStatus('unpaid')
    expect(s.label).toBe('لم يدفع')
    expect(s.icon).toBe('clock')
    expect(s.iconClass).toBe('text-red-600')
    expect(s.cardClass).toContain('bg-red-50')
    expect(s.cardClass).toContain('border-r-red-500')
    expect(s.badgeClass).toContain('bg-red-100')
    expect(s.badgeClass).toContain('text-red-700')
    expect(s.badgeClass).not.toContain('bg-red-600')
    expect(s.badgeClass).not.toContain('animate-pulse')
  })
})

describe('applyPaidOverride', () => {
  it('shows paid immediately after a local mark-paid', () => {
    expect(applyPaidOverride('not_due', true)).toBe('paid')
    expect(applyPaidOverride('unpaid', true)).toBe('paid')
    expect(applyPaidOverride('pending', true)).toBe('paid')
  })

  it('restores the server state when a local paid row is undone', () => {
    expect(applyPaidOverride('paid', false)).toBe('unpaid')
    expect(applyPaidOverride('not_due', false)).toBe('not_due')
    expect(applyPaidOverride('pending', false)).toBe('pending')
  })
})
