// lib/__tests__/claim-tokens.test.ts
// #36 slice 8/8 — pure issuer/redeemer + rate gate (no mocks needed).
// STATUS: UNVERIFIED — written test-first, never executed (ZERO-shell lane).
// Pending shell: `npm run test -- lib/__tests__/claim-tokens.test.ts`

import { describe, it, expect } from 'vitest'
import {
  CLAIM_ATTEMPT_WINDOW_MS,
  CLAIM_MAX_ATTEMPTS,
  CLAIM_TOKEN_TTL_MS,
  buildClaimOtpCallbackPath,
  buildClaimUrl,
  claimExpiryFromNow,
  evaluateClaimForRedeem,
  evaluateClaimRateLimit,
  generateClaimToken,
  hashClaimToken,
  isClaimExpired,
  isValidClaimTokenFormat,
} from '@/lib/claim-tokens'

describe('generateClaimToken (256-bit bearer)', () => {
  it('issues unique prefixed tokens with 43 base64url chars of entropy', () => {
    const a = generateClaimToken()
    const b = generateClaimToken()
    expect(a).not.toBe(b)
    for (const t of [a, b]) {
      expect(t.startsWith('clm_')).toBe(true)
      expect(t.length).toBe('clm_'.length + 43)
      expect(isValidClaimTokenFormat(t)).toBe(true)
    }
  })
})

describe('isValidClaimTokenFormat (cheap pre-hash gate)', () => {
  it('rejects empty, non-string, wrong-prefix, and overlong input', () => {
    expect(isValidClaimTokenFormat('')).toBe(false)
    expect(isValidClaimTokenFormat(null)).toBe(false)
    expect(isValidClaimTokenFormat(undefined)).toBe(false)
    expect(isValidClaimTokenFormat(123)).toBe(false)
    expect(isValidClaimTokenFormat('raw-plaintext-token')).toBe(false)
    expect(isValidClaimTokenFormat(`${generateClaimToken()}EXTRA`)).toBe(false)
    expect(isValidClaimTokenFormat('clm_not!base64url$chars####################!!')).toBe(false)
  })
})

describe('hashClaimToken (hash storage, never plaintext)', () => {
  it('is deterministic sha256 hex that never contains the raw token', async () => {
    const raw = generateClaimToken()
    const { createHash } = await import('crypto')
    const expected = createHash('sha256').update(raw, 'utf8').digest('hex')
    const hashed = hashClaimToken(raw)
    expect(hashed).toBe(expected)
    expect(hashed).toMatch(/^[0-9a-f]{64}$/)
    // HASH-NOT-PLAINTEXT assertion: neither the raw bearer nor any 8+ char
    // slice of it may appear in the stored value.
    expect(hashed).not.toContain(raw)
    expect(hashed).not.toContain(raw.slice(4, 16))
  })
})

describe('expiry (7-day TTL)', () => {
  it('expires exactly TTL ms after issue and reports expiry correctly', () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0)
    expect(CLAIM_TOKEN_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(claimExpiryFromNow(now)).toBe(new Date(now + CLAIM_TOKEN_TTL_MS).toISOString())
    expect(isClaimExpired(new Date(now + 1).toISOString(), now)).toBe(false)
    expect(isClaimExpired(new Date(now - 1).toISOString(), now)).toBe(true)
    expect(isClaimExpired('not-a-date', now)).toBe(true)
  })
})

describe('evaluateClaimForRedeem (single-use + revocable lifecycle)', () => {
  const live = {
    tokenHashMatches: true,
    usedAt: null,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  }

  it('accepts a live token', () => {
    expect(evaluateClaimForRedeem(live)).toEqual({ ok: true })
  })

  it('rejects reuse (already_used) once used_at is set', () => {
    expect(
      evaluateClaimForRedeem({ ...live, usedAt: new Date().toISOString() }),
    ).toEqual({ ok: false, reason: 'already_used' })
  })

  it('rejects expired tokens', () => {
    expect(
      evaluateClaimForRedeem({ ...live, expiresAt: new Date(Date.now() - 1).toISOString() }),
    ).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects revoked tokens (regenerate path)', () => {
    expect(
      evaluateClaimForRedeem({ ...live, revokedAt: new Date().toISOString() }),
    ).toEqual({ ok: false, reason: 'revoked' })
  })

  it('rejects wrong-row (hash mismatch) AND unknown rows with the SAME generic not_found (no oracle)', () => {
    expect(evaluateClaimForRedeem(null)).toEqual({ ok: false, reason: 'not_found' })
    expect(evaluateClaimForRedeem({ ...live, tokenHashMatches: false })).toEqual({
      ok: false,
      reason: 'not_found',
    })
  })
})

describe('evaluateClaimRateLimit (pure window gate)', () => {
  it(`allows under ${CLAIM_MAX_ATTEMPTS} attempts inside the window`, () => {
    const now = 1_000_000
    expect(
      evaluateClaimRateLimit({ attempts: 0, windowStartedAtMs: now - 1_000 }, now),
    ).toEqual({ allowed: true })
    expect(
      evaluateClaimRateLimit(
        { attempts: CLAIM_MAX_ATTEMPTS - 1, windowStartedAtMs: now - 1_000 },
        now,
      ),
    ).toEqual({ allowed: true })
  })

  it('rejects at the cap with a retryAfterMs inside the window', () => {
    const now = 1_000_000
    const verdict = evaluateClaimRateLimit(
      { attempts: CLAIM_MAX_ATTEMPTS, windowStartedAtMs: now - 1_000 },
      now,
    )
    expect(verdict.allowed).toBe(false)
    if (!verdict.allowed) {
      expect(verdict.retryAfterMs).toBe(CLAIM_ATTEMPT_WINDOW_MS - 1_000)
    }
  })

  it('resets once the window lapses (stale counter is allowed)', () => {
    const now = 1_000_000
    expect(
      evaluateClaimRateLimit(
        { attempts: 999, windowStartedAtMs: now - CLAIM_ATTEMPT_WINDOW_MS },
        now,
      ),
    ).toEqual({ allowed: true })
  })
})

describe('frozen claim URL contract', () => {
  it('buildClaimUrl points at /claim?token= and the OTP callback nests it as relative ?next=', () => {
    const raw = generateClaimToken()
    expect(buildClaimUrl(raw)).toBe(`/claim?token=${encodeURIComponent(raw)}`)
    const callback = buildClaimOtpCallbackPath(raw)
    expect(callback.startsWith('/auth/callback?next=')).toBe(true)
    // Relative-only: no protocol/host may leak in (open-redirect guard).
    expect(callback).not.toMatch(/^https?:\/\//)
    expect(decodeURIComponent(callback.split('next=')[1])).toBe(buildClaimUrl(raw))
  })
})
