import { describe, it, expect } from 'vitest'
import {
  buildInviteWhatsAppText,
  buildInviteWhatsAppUrl,
  buildRemindWhatsAppText,
  buildRemindWhatsAppUrl,
  buildWhatsAppUrl,
  canWhatsApp,
  toWaMeDigits,
} from '@/lib/whatsapp-share'

describe('toWaMeDigits', () => {
  it('strips + and spaces for wa.me', () => {
    expect(toWaMeDigits('+20 101 234 5678')).toBe('201012345678')
  })

  it('returns empty for missing phone', () => {
    expect(toWaMeDigits(null)).toBe('')
    expect(toWaMeDigits(undefined)).toBe('')
  })
})

describe('canWhatsApp', () => {
  it('accepts a full Egyptian number', () => {
    expect(canWhatsApp('+201012345678')).toBe(true)
  })

  it('rejects empty/short numbers', () => {
    expect(canWhatsApp(null)).toBe(false)
    expect(canWhatsApp('123')).toBe(false)
  })
})

describe('buildWhatsAppUrl', () => {
  it('builds a free wa.me link with encoded text', () => {
    const url = buildWhatsAppUrl('+201012345678', 'السلام عليكم')
    expect(url.startsWith('https://wa.me/201012345678?text=')).toBe(true)
    expect(url).toContain(encodeURIComponent('السلام عليكم'))
  })
})

describe('buildRemindWhatsAppText', () => {
  it('includes the student name in Arabic', () => {
    expect(buildRemindWhatsAppText({ studentName: 'أحمد' })).toContain('أحمد')
  })

  it('appends amount + currency when given', () => {
    const text = buildRemindWhatsAppText({ studentName: 'أحمد', amount: 200, currency: 'ج.م' })
    expect(text).toContain('200')
    expect(text).toContain('ج.م')
  })
})

describe('buildRemindWhatsAppUrl', () => {
  it('targets the payer digits with the remind text', () => {
    const url = buildRemindWhatsAppUrl({ phone: '+201012345678', studentName: 'أحمد' })
    expect(url.startsWith('https://wa.me/201012345678?text=')).toBe(true)
    expect(decodeURIComponent(url)).toContain('أحمد')
  })
})

describe('buildInviteWhatsAppText/Url', () => {
  it('carries the invite URL for the guardian', () => {
    const text = buildInviteWhatsAppText({ studentName: 'ليلى', inviteUrl: '/pay?student=s1&invite=1' })
    expect(text).toContain('ليلى')
    expect(text).toContain('/pay?student=s1')
  })

  it('builds a wa.me invite link', () => {
    const url = buildInviteWhatsAppUrl({
      phone: '+201012345678',
      studentName: 'ليلى',
      inviteUrl: '/pay?student=s1&invite=1',
    })
    expect(url.startsWith('https://wa.me/201012345678?text=')).toBe(true)
  })
})
