// lib/claim-tokens.ts
// #36 slice 8/8 — PURE claim-token issuer/redeemer (no DB, no network).
// The claim token is the V1 proof of entitlement: the teacher sends it over
// the already-known WhatsApp number (no SMS OTP in V1).
//
// SECURITY POSTURE (HITL review — every decision is called out):
//   S1. 256-bit entropy: 32 random bytes via crypto.randomBytes, base64url.
//       Guessing is infeasible (2^256); the token itself is the bearer secret.
//   S2. Hash storage: only sha256(raw) is persisted (see 035 migration).
//       The raw token exists in memory + the teacher's share message only.
//       hashClaimToken is deterministic sha256 — no salt, because the token
//       already has 256-bit entropy (salt adds nothing against preimage).
//   S3. Single-use enforced in the redeemer: used_at must be NULL, and the
//       server action marks used_at in the same flow (evaluate-then-mark;
//       a true single-statement atomic consume is a follow-up — see gaps).
//   S4. 7-day expiry: CLAIM_TOKEN_TTL_MS; checked pure-side + DB-side.
//   S5. Revocable/regenerable: revoked_at column; issueClaimLink revokes all
//       prior live tokens for the student before inserting the new one.
//   S6. No oracle beyond the bearer: evaluateClaimForRedeem returns a generic
//       'not_found' for BOTH unknown-hash and hash-mismatch (wrong-row),
//       so a guesser learns nothing about which rows exist.
//   S7. Rate-limit constants live here (pure evaluation) but enforcement is
//       server-side in lib/claim-actions.ts against a DB counter table
//       (in-memory would not survive serverless instances — documented there).
//   S8. Format gate: isValidClaimTokenFormat rejects empty/overlong/malformed
//       input before any hashing (cheap reject, no timing oracle on the hash
//       lookup — the DB lookup is by equality on the hash, not string compare).

import { createHash, randomBytes } from 'crypto'

/** Token prefix (version marker + avoids confusion with other secrets). */
export const CLAIM_TOKEN_PREFIX = 'clm_'

/** 32 bytes = 256-bit entropy (S1). */
export const CLAIM_TOKEN_ENTROPY_BYTES = 32

/** 7-day expiry (S4). */
export const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** Max redeem attempts per key inside the window (S7). */
export const CLAIM_MAX_ATTEMPTS = 10

/** Rate-limit window: 10 minutes of attempts per key (S7). */
export const CLAIM_ATTEMPT_WINDOW_MS = 10 * 60 * 1000

/**
 * Issue a new raw bearer token. NEVER persist the return value — persist
 * only hashClaimToken(raw) (S2). The raw value is shown to the teacher once
 * for sharing over the known WhatsApp number.
 */
export function generateClaimToken(): string {
  const entropy = randomBytes(CLAIM_TOKEN_ENTROPY_BYTES).toString('base64url')
  return `${CLAIM_TOKEN_PREFIX}${entropy}`
}

/** sha256 hex of the raw token — the ONLY form ever stored (S2). */
export function hashClaimToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

/** Cheap format gate before any hashing/DB lookup (S8). */
export function isValidClaimTokenFormat(token: unknown): token is string {
  if (typeof token !== 'string') return false
  if (token.length !== CLAIM_TOKEN_PREFIX.length + 43) return false
  if (!token.startsWith(CLAIM_TOKEN_PREFIX)) return false
  return /^[A-Za-z0-9_-]+$/.test(token.slice(CLAIM_TOKEN_PREFIX.length))
}

/** Expiry timestamp (ISO) for a token issued at nowMs. */
export function claimExpiryFromNow(nowMs: number = Date.now()): string {
  return new Date(nowMs + CLAIM_TOKEN_TTL_MS).toISOString()
}

/** True when expiresAt is at/past now. Accepts ISO string or Date. */
export function isClaimExpired(
  expiresAt: string | Date,
  now: string | Date | number = Date.now(),
): boolean {
  const exp = new Date(expiresAt).getTime()
  const at = typeof now === 'number' ? now : new Date(now).getTime()
  if (!Number.isFinite(exp) || !Number.isFinite(at)) return true
  return exp <= at
}

export interface ClaimRowState {
  /** False when the presented token hashes to a different row (S6). */
  tokenHashMatches: boolean
  usedAt: string | null
  revokedAt: string | null
  expiresAt: string
}

export type ClaimRedeemVerdict =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_used' | 'revoked' }

/**
 * Pure single-use/expiry/revocation gate (S3/S4/S5/S6).
 * Order matters: not_found first (no oracle), then revoked, used, expired.
 * `row` is null when no row matches the presented hash.
 */
export function evaluateClaimForRedeem(
  row: ClaimRowState | null,
  now: string | Date | number = Date.now(),
): ClaimRedeemVerdict {
  if (!row || !row.tokenHashMatches) return { ok: false, reason: 'not_found' }
  if (row.revokedAt) return { ok: false, reason: 'revoked' }
  if (row.usedAt) return { ok: false, reason: 'already_used' }
  if (isClaimExpired(row.expiresAt, now)) return { ok: false, reason: 'expired' }
  return { ok: true }
}

export interface RateLimitState {
  attempts: number
  /** ms epoch when the current window started. */
  windowStartedAtMs: number
}

export type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number }

/**
 * Pure sliding-window gate (S7). A stale window (older than
 * CLAIM_ATTEMPT_WINDOW_MS) resets to allowed — the server action deletes or
 * resets the persisted counter when the window lapses.
 */
export function evaluateClaimRateLimit(
  state: RateLimitState,
  nowMs: number = Date.now(),
): RateLimitVerdict {
  const windowAge = nowMs - state.windowStartedAtMs
  if (!Number.isFinite(windowAge) || windowAge < 0) return { allowed: true }
  if (windowAge >= CLAIM_ATTEMPT_WINDOW_MS) return { allowed: true }
  if (state.attempts < CLAIM_MAX_ATTEMPTS) return { allowed: true }
  return { allowed: false, retryAfterMs: CLAIM_ATTEMPT_WINDOW_MS - windowAge }
}

/** Frozen claim-screen URL contract: /claim?token=<raw> (raw NEVER stored). */
export function buildClaimUrl(rawToken: string): string {
  return `/claim?token=${encodeURIComponent(rawToken)}`
}

/**
 * Destination for the payer magic-link email: after the OTP exchange the
 * auth callback must land back on the claim screen with the token intact.
 * Relative-only (open-redirect safe — the callback route additionally runs
 * sanitizeNextPath on ?next=).
 */
export function buildClaimOtpNext(rawToken: string): string {
  return buildClaimUrl(rawToken)
}

/** Full /auth/callback URL (path form) carrying the claim screen as ?next=. */
export function buildClaimOtpCallbackPath(rawToken: string): string {
  return `/auth/callback?next=${encodeURIComponent(buildClaimOtpNext(rawToken))}`
}
