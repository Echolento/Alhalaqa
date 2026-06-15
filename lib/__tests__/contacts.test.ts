import { describe, it, expect } from 'vitest'
import { normalizePhone, findDuplicates } from '@/lib/contacts'

describe('normalizePhone', () => {
  it('strips non-digit characters', () => {
    expect(normalizePhone('+20 123 456 789')).toBe('20123456789')
  })

  it('converts local 0 prefix to 20', () => {
    expect(normalizePhone('01234567890')).toBe('201234567890')
  })

  it('strips 00 prefix', () => {
    expect(normalizePhone('00201234567890')).toBe('201234567890')
  })

  it('returns digits as-is when no special prefix', () => {
    expect(normalizePhone('201234567890')).toBe('201234567890')
  })

  it('handles empty string', () => {
    expect(normalizePhone('')).toBe('')
  })
})

describe('findDuplicates', () => {
  const existing = [
    { name: 'أحمد علي', phone: '+201234567890' },
    { name: 'محمد حسن', phone: null },
  ]

  it('flags duplicate by phone (normalized match)', () => {
    const contacts = [{ name: 'أحمد', phone: '01234567890' }]
    expect(findDuplicates(contacts, existing)).toEqual([true])
  })

  it('flags duplicate by name (case-insensitive)', () => {
    const contacts = [{ name: 'أحمد علي', phone: '01111111111' }]
    expect(findDuplicates(contacts, existing)).toEqual([true])
  })

  it('returns false for new contact', () => {
    const contacts = [{ name: 'خالد', phone: '01111111111' }]
    expect(findDuplicates(contacts, existing)).toEqual([false])
  })

  it('handles empty existing list', () => {
    const contacts = [{ name: 'خالد', phone: '01111111111' }]
    expect(findDuplicates(contacts, [])).toEqual([false])
  })

  it('handles multiple contacts with mixed duplicates', () => {
    const contacts = [
      { name: 'جديد', phone: '01111111111' },
      { name: 'أحمد علي', phone: '0999999999' },
    ]
    expect(findDuplicates(contacts, existing)).toEqual([false, true])
  })

  it('handles contact with empty name', () => {
    const contacts = [{ name: '', phone: '0999999999' }]
    expect(findDuplicates(contacts, existing)).toEqual([false])
  })
})
