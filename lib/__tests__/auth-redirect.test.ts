import { describe, it, expect } from 'vitest'
import {
  sanitizeNextPath,
  sanitizeRedirectTo,
  authRedirectOrigin,
  DEFAULT_AUTH_NEXT_PATH,
} from '../auth-redirect'

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

describe('sanitizeRedirectTo (email template .RedirectTo)', () => {
  const ORIGIN = 'https://www.alhalaqa.com'

  it('reduces an absolute same-origin URL to a relative path+query', () => {
    expect(sanitizeRedirectTo('https://www.alhalaqa.com/pay', ORIGIN)).toBe('/pay')
    expect(sanitizeRedirectTo('https://www.alhalaqa.com/claim?token=abc', ORIGIN)).toBe(
      '/claim?token=abc',
    )
  })

  it('passes through relative paths', () => {
    expect(sanitizeRedirectTo('/welcome', ORIGIN)).toBe('/welcome')
  })

  it('accepts the pay alias as the same site', () => {
    expect(sanitizeRedirectTo('https://pay.alhalaqa.com/claim?phone=010', ORIGIN)).toBe(
      '/claim?phone=010',
    )
  })

  it('rejects cross-origin and malformed input', () => {
    expect(sanitizeRedirectTo('https://evil.com/pay', ORIGIN)).toBe(DEFAULT_AUTH_NEXT_PATH)
    expect(sanitizeRedirectTo('//evil.com', ORIGIN)).toBe(DEFAULT_AUTH_NEXT_PATH)
    expect(sanitizeRedirectTo(null, ORIGIN)).toBe(DEFAULT_AUTH_NEXT_PATH)
  })
})

describe('authRedirectOrigin', () => {
  it('collapses the pay alias to the canonical www host', () => {
    expect(authRedirectOrigin('https://pay.alhalaqa.com')).toBe('https://www.alhalaqa.com')
    expect(authRedirectOrigin('https://pay.alhalaqa.com/claim?x=1')).toBe('https://www.alhalaqa.com')
  })

  it('leaves www and localhost untouched', () => {
    expect(authRedirectOrigin('https://www.alhalaqa.com')).toBe('https://www.alhalaqa.com')
    expect(authRedirectOrigin('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('returns non-URL input unchanged', () => {
    expect(authRedirectOrigin('not a url')).toBe('not a url')
  })
})
