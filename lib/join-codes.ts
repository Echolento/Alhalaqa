// lib/join-codes.ts
// PURE teacher join-code helpers (no DB, no network).
//
// The teacher code is a class password shared 1:1 with parents. A parent types
// their phone, then the code; the server requires BOTH a valid code and a
// roster phone match before linking. It replaces the old phone-only claim
// (a typed phone was self-asserted and could be used to take over a family).
//
//   J1. 8 chars from a 32-char unambiguous alphabet (A-H J-N P-Z 2-9):
//       ~40 bits. Long enough that rate-limited guessing is hopeless, short
//       enough to read over the phone. I/O/0/1 are excluded on purpose.
//   J2. Stored raw (8 chars) in a service-role-only table; displayed to the
//       teacher and parent as XXXX-XXXX. The dash is presentation only.
//   J3. Normalization accepts lowercase, whitespace, every common dash variant
//       and dots (copy/paste noise) so a parent can type what they were told;
//       other punctuation is NOT stripped (it must fail validation rather than
//       silently vanish).

import { randomInt } from 'crypto'

/** 32 unambiguous characters — no I, O, 0 or 1 (J1). */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Raw stored length (J1). */
export const JOIN_CODE_LENGTH = 8

/** Injectable randomness seam for deterministic tests. */
export type JoinCodeRng = (maxExclusive: number) => number

const JOIN_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/

/**
 * Issue a new raw code (J1). The caller persists the raw value in the
 * service-role-only table; it is never part of a bearer URL.
 */
export function generateJoinCode(rng: JoinCodeRng = (max) => randomInt(max)): string {
  let out = ''
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    out += JOIN_CODE_ALPHABET[rng(JOIN_CODE_ALPHABET.length)] ?? ''
  }
  return out
}

/**
 * Normalize user input for comparison/validation (J3): uppercase, strip
 * whitespace, all Unicode dash variants and dots. Anything else survives and
 * fails validation.
 */
export function normalizeJoinCode(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[\s\u2010-\u2015\u2212_.\-]/g, '').toUpperCase()
}

/** Display form XXXX-XXXX (J2). Malformed input is returned normalized. */
export function formatJoinCode(input: string): string {
  const normalized = normalizeJoinCode(input)
  if (normalized.length !== JOIN_CODE_LENGTH) return normalized
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`
}

/** Cheap format gate before any DB lookup. Accepts dashed/spaced input. */
export function isValidJoinCodeFormat(input: unknown): boolean {
  return typeof input === 'string' && JOIN_CODE_RE.test(normalizeJoinCode(input))
}
