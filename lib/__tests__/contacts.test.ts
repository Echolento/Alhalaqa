import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  normalizePhone,
  findDuplicates,
  pickContacts,
  isContactPickerAvailable,
  ContactPickerError,
} from '@/lib/contacts'

function installContacts(select: unknown) {
  Object.defineProperty(navigator, 'contacts', { value: { select }, configurable: true })
}

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).contacts
})

describe('pickContacts', () => {
  it('reports a missing API as unsupported', async () => {
    expect(isContactPickerAvailable()).toBe(false)
    await expect(pickContacts()).rejects.toMatchObject({ reason: 'unsupported' })
  })

  it('classifies a refused picker as blocked and keeps the original error', async () => {
    const original = new TypeError('Unable to open a contact picker')
    installContacts(vi.fn().mockRejectedValue(original))
    expect(isContactPickerAvailable()).toBe(true)

    const error = await pickContacts().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ContactPickerError)
    expect((error as ContactPickerError).reason).toBe('blocked')
    expect((error as ContactPickerError).message).toContain('Unable to open a contact picker')
    expect((error as ContactPickerError).original).toBe(original)
  })

  it('treats AbortError as a cancel, not a failure', async () => {
    installContacts(
      vi.fn().mockRejectedValue(Object.assign(new Error('dismissed'), { name: 'AbortError' })),
    )
    await expect(pickContacts()).resolves.toEqual([])
  })

  it('maps name/tel arrays to flat strings, tolerating missing fields', async () => {
    installContacts(
      vi.fn().mockResolvedValue([
        { name: ['أحمد'], tel: ['01012345678'] },
        { tel: ['01111111111'] },
        {},
      ]),
    )
    await expect(pickContacts()).resolves.toEqual([
      { name: 'أحمد', phone: '01012345678' },
      { name: '', phone: '01111111111' },
      { name: '', phone: '' },
    ])
  })

  it('treats a non-array result as an empty selection', async () => {
    installContacts(vi.fn().mockResolvedValue(undefined))
    await expect(pickContacts()).resolves.toEqual([])
  })
})

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
