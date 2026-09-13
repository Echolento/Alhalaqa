import { describe, it, expect } from 'vitest'
import { sanitizeNextPath, DEFAULT_AUTH_NEXT_PATH } from '../auth-redirect'

describe('sanitizeNextPath', () => {
  it('passes through valid internal paths', () => {
    expect(sanitizeNextPath('/auth/update-password')).toBe('/auth/update-password')
    expect(sanitizeNextPath('/dashboard/payments')).toBe('/dashboard/payments')
  })

  it('falls back for missing input', () => {
    expect(sanitizeNextPath(null)).toBe(DEFAULT_AUTH_NEXT_PATH)
    expect(sanitizeNextPath(undefined)).toBe(DEFAULT_AUTH_NEXT_PATH)
    expect(sanitizeNextPath('')).toBe(DEFAULT_AUTH_NEXT_PATH)
  })

  it('blocks open redirects', () => {
    expect(sanitizeNextPath('https://evil.com')).toBe(DEFAULT_AUTH_NEXT_PATH)
    expect(sanitizeNextPath('//evil.com/phish')).toBe(DEFAULT_AUTH_NEXT_PATH)
    expect(sanitizeNextPath('/\\evil.com')).toBe(DEFAULT_AUTH_NEXT_PATH)
    expect(sanitizeNextPath('/dash\nboard')).toBe(DEFAULT_AUTH_NEXT_PATH)
  })
})
