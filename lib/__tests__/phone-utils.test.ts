import { describe, it, expect } from 'vitest'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/phone-utils'

describe('formatPhoneNumber', () => {
  it('formats 11-digit Egyptian number starting with 0', () => {
    expect(formatPhoneNumber('01012345678')).toBe('+201012345678')
  })

  it('formats 10-digit number (already stripped leading 0)', () => {
    expect(formatPhoneNumber('1012345678')).toBe('+201012345678')
  })

  it('formats 12-digit number starting with 20', () => {
    expect(formatPhoneNumber('201012345678')).toBe('+201012345678')
  })

  it('formats number already in +20 format', () => {
    expect(formatPhoneNumber('+201012345678')).toBe('+201012345678')
  })

  it('strips non-digit characters', () => {
    expect(formatPhoneNumber('010 123 45678')).toBe('+201012345678')
    expect(formatPhoneNumber('010-123-45678')).toBe('+201012345678')
  })

  it('returns empty string for empty input', () => {
    expect(formatPhoneNumber('')).toBe('')
  })

  it('returns raw input for unrecognised format', () => {
    expect(formatPhoneNumber('123')).toBe('123')
  })
})

describe('isValidPhoneNumber', () => {
  it('accepts valid +20 number with 10 digits', () => {
    expect(isValidPhoneNumber('+201012345678')).toBe(true)
  })

  it('rejects number without +20 prefix', () => {
    expect(isValidPhoneNumber('01012345678')).toBe(false)
  })

  it('rejects null or undefined', () => {
    expect(isValidPhoneNumber(null)).toBe(false)
    expect(isValidPhoneNumber(undefined)).toBe(false)
  })

  it('rejects too few digits', () => {
    expect(isValidPhoneNumber('+20123')).toBe(false)
  })

  it('rejects too many digits', () => {
    expect(isValidPhoneNumber('+2010123456789')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidPhoneNumber('')).toBe(false)
  })
})
