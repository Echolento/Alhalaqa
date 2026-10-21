// lib/__tests__/join-codes.test.ts
// Pure teacher join-code helpers (no DB, no network).
// 8 unambiguous chars: A-H J-N P-Z 2-9 (drops I/O/0/1).
// Stored raw (8 chars); displayed as XXXX-XXXX.

import { describe, it, expect } from 'vitest'
import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  formatJoinCode,
  generateJoinCode,
  isValidJoinCodeFormat,
  normalizeJoinCode,
} from '@/lib/join-codes'

describe('JOIN_CODE_ALPHABET', () => {
  it('has 32 unambiguous characters and drops I/O/0/1', () => {
    expect(JOIN_CODE_ALPHABET).toHaveLength(32)
    for (const bad of ['I', 'O', '0', '1']) {
      expect(JOIN_CODE_ALPHABET).not.toContain(bad)
    }
    expect(new Set(JOIN_CODE_ALPHABET).size).toBe(32)
  })
})

describe('generateJoinCode', () => {
  it('returns exactly 8 characters from the alphabet', () => {
    const code = generateJoinCode()
    expect(code).toHaveLength(JOIN_CODE_LENGTH)
    for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch)
    expect(isValidJoinCodeFormat(code)).toBe(true)
  })

  it('is random across many draws', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i += 1) seen.add(generateJoinCode())
    expect(seen.size).toBeGreaterThan(190)
  })

  it('accepts an injected rng (deterministic for tests)', () => {
    expect(generateJoinCode(() => 0)).toBe('AAAAAAAA')
    expect(generateJoinCode(() => 31)).toBe('99999999')
  })
})

describe('normalizeJoinCode', () => {
  it('uppercases and strips spaces/dashes', () => {
    expect(normalizeJoinCode('abcdefgh')).toBe('ABCDEFGH')
    expect(normalizeJoinCode('ABCD-EFGH')).toBe('ABCDEFGH')
    expect(normalizeJoinCode('  abcd efgh ')).toBe('ABCDEFGH')
    expect(normalizeJoinCode('ab-cd efg h')).toBe('ABCDEFGH')
  })

  it('returns empty for non-strings', () => {
    expect(normalizeJoinCode(null)).toBe('')
    expect(normalizeJoinCode(undefined)).toBe('')
    expect(normalizeJoinCode(123)).toBe('')
  })

  it('does not silently drop other punctuation', () => {
    expect(normalizeJoinCode('ABCD!EFG')).toBe('ABCD!EFG')
    expect(isValidJoinCodeFormat('ABCD!EFG')).toBe(false)
  })
})

describe('formatJoinCode', () => {
  it('renders XXXX-XXXX for display', () => {
    expect(formatJoinCode('ABCDEFGH')).toBe('ABCD-EFGH')
    expect(formatJoinCode('ABCD-EFGH')).toBe('ABCD-EFGH')
    expect(formatJoinCode('abcd efgh')).toBe('ABCD-EFGH')
  })

  it('leaves malformed input as normalized text (no fake dash)', () => {
    expect(formatJoinCode('ABC')).toBe('ABC')
  })
})

describe('isValidJoinCodeFormat', () => {
  it('accepts 8-char codes with or without dashes/spaces', () => {
    expect(isValidJoinCodeFormat('ABCDEFGH')).toBe(true)
    expect(isValidJoinCodeFormat('ABCD-EFGH')).toBe(true)
    expect(isValidJoinCodeFormat('abcd efgh')).toBe(true)
    expect(isValidJoinCodeFormat('ZZZZ9999')).toBe(true)
  })

  it('rejects wrong length, ambiguous chars and non-strings', () => {
    expect(isValidJoinCodeFormat('')).toBe(false)
    expect(isValidJoinCodeFormat('ABCDEFG')).toBe(false)
    expect(isValidJoinCodeFormat('ABCDEFGHJ')).toBe(false)
    expect(isValidJoinCodeFormat('ABCDEFGI')).toBe(false)
    expect(isValidJoinCodeFormat('ABCDEFG0')).toBe(false)
    expect(isValidJoinCodeFormat('ABCDEFG1')).toBe(false)
    expect(isValidJoinCodeFormat('ABCDEFGO')).toBe(false)
    expect(isValidJoinCodeFormat(null)).toBe(false)
    expect(isValidJoinCodeFormat(undefined)).toBe(false)
  })
})
