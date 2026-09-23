'use server'

// lib/claim-actions.ts
// #36 slice 8/8 — invite / claim identity server actions.
// IMPORTS ONLY from frozen lanes (never edits them):
//   assertOwnsStudent (lib/ownership.ts) + service-role writes (#25 posture)
//   + logActivity (lib/log-activity.ts, additive `as never` casts)
//   + pure issuer/redeemer/rate gate (lib/claim-tokens.ts)
//   + Arabic strings (lib/claim-copy.ts, single source).
//
// SECURITY POSTURE (HITL review):
//   R1. Every write goes through the service-role client with an explicit
//       ownership check; RLS on claim_tokens is teacher-SELECT-only and
//       claim_redeem_attempts has NO policies at all (service-only).
//   R2. Raw tokens are NEVER persisted, logged, or returned except once:
//       issueClaimLink returns the raw bearer to the teacher for sharing.
//       The DB holds only sha256(raw) (UNIQUE, 64-char CHECK).
//   R3. Regenerate revokes: issueClaimLink stamps revoked_at on ALL live
//       (unused + unrevoked) tokens for the student before inserting.
//   R4. Rate-limit is DB-backed (claim_redeem_attempts) keyed by
//       sha256(userId|ip) — never raw IPs. In-memory would not survive
//       serverless instances, hence the table. Format-invalid guesses count
//       toward the limit (cheap throttle on enumeration).
//   R5. resolveClaimPreview is intentionally pre-login (the payer has no
//       session yet) and returns ONLY display names + a state — never the
//       hash, never the raw token, never other students.
//   R6. redeemClaim requires a session (magic-link OTP first): the link
//       targets the caller's own profile id. A valid token can only ever
//       link the student to the LOGGED-IN profile — never an arbitrary id
//       from the client.
//   R7. already-claimed-by-other is a terminal error (no steal): a second
//       payer holding a (revoked-or-live) token cannot take over the row.
//       Only the teacher can change claimed_by (future slice — see gaps).
//   R8. Single-use is evaluate-then-mark (two service writes, like the #34
//       verdict slice). A true single-statement atomic consume RPC is a
//       follow-up — see gaps in the slice report.

import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assertOwnsStudent } from '@/lib/ownership'
import { logActivity } from '@/lib/log-activity'
import {
  CLAIM_ATTEMPT_WINDOW_MS,
  CLAIM_MAX_ATTEMPTS,
  buildClaimUrl,
  claimExpiryFromNow,
  evaluateClaimForRedeem,
  evaluateClaimRateLimit,
  generateClaimToken,
  hashClaimToken,
  isValidClaimTokenFormat,
} from '@/lib/claim-tokens'
import { CLAIM_COPY } from '@/lib/claim-copy'

type Service = ReturnType<typeof createServiceClient>

interface ClaimTokenRow {
  id: string
  student_id: string
  teacher_id: string
  token_hash: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
}

interface StudentClaimRow {
  id: string
  teacher_id: string
  name: string | null
  claimed_by: string | null
}

/**
 * Rate-limit key: 'redeem:' + sha256(userId|ip). Raw IPs are never stored
 * (R4). Exported for unit tests; production derives it from the session +
 * request headers, tests pass opts.attemptKey to override.
 */
export function buildAttemptKey(parts: string): string {
  return `redeem:${createHash('sha256').update(parts, 'utf8').digest('hex')}`
}

async function deriveAttemptKey(userId: string): Promise<string> {
  let ip = 'unknown'
  try {
    const h = await headers()
    const forwarded = h.get('x-forwarded-for')
    ip = (forwarded?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown').slice(0, 128)
  } catch {
    ip = 'unknown'
  }
  return buildAttemptKey(`${userId}|${ip}`)
}

async function readCounter(service: Service, key: string) {
  const { data } = await service
    .from('claim_redeem_attempts')
    .select('key, attempts, window_started_at')
    .eq('key', key)
    .maybeSingle()
  return (data ?? null) as {
    key: string
    attempts: number
    window_started_at: string
  } | null
}

async function isRateLimited(service: Service, key: string, nowMs: number): Promise<boolean> {
  const row = await readCounter(service, key)
  if (!row) return false
  const verdict = evaluateClaimRateLimit(
    {
      attempts: Number(row.attempts) || 0,
      windowStartedAtMs: new Date(row.window_started_at).getTime(),
    },
    nowMs,
  )
  return !verdict.allowed
}

async function recordAttempt(service: Service, key: string, nowMs: number) {
  const nowIso = new Date(nowMs).toISOString()
  const row = await readCounter(service, key)
  if (!row) {
    await service.from('claim_redeem_attempts').insert({
      key,
      attempts: 1,
      window_started_at: nowIso,
      updated_at: nowIso,
    })
    return
  }
  const windowAge = nowMs - new Date(row.window_started_at).getTime()
  if (!Number.isFinite(windowAge) || windowAge >= CLAIM_ATTEMPT_WINDOW_MS) {
    await service
      .from('claim_redeem_attempts')
      .update({ attempts: 1, window_started_at: nowIso, updated_at: nowIso })
      .eq('key', key)
    return
  }
  await service
    .from('claim_redeem_attempts')
    .update({ attempts: (Number(row.attempts) || 0) + 1, updated_at: nowIso })
    .eq('key', key)
}

async function clearAttempts(service: Service, key: string) {
  await service.from('claim_redeem_attempts').delete().eq('key', key)
}

/**
 * Teacher-owned: mint a fresh invite link for a student. Regenerating revokes
 * all prior live tokens for that student (R3). Wrong teacher => Forbidden.
 */
export async function issueClaimLink(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const service = createServiceClient()

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) return { error: 'الطالب غير موجود' }

  const ownerTeacherId = await assertOwnsStudent(service, user.id, studentId)
  if (!ownerTeacherId) return { error: 'Forbidden' }

  const nowIso = new Date().toISOString()

  // Revoke every live token for this student BEFORE minting (R3).
  await service
    .from('claim_tokens')
    .update({ revoked_at: nowIso })
    .eq('student_id', studentId)
    .is('used_at', null)
    .is('revoked_at', null)

  // Raw bearer exists here and in the returned URL only — the row stores
  // the sha256 hash (R2).
  const rawToken = generateClaimToken()
  const expiresAt = claimExpiryFromNow()

  const { error: insertError } = await service.from('claim_tokens').insert({
    student_id: studentId,
    teacher_id: ownerTeacherId,
    token_hash: hashClaimToken(rawToken),
    expires_at: expiresAt,
  })
  if (insertError) return { error: 'تعذر إنشاء رابط الدعوة — حاول مرة أخرى' }

  await logActivity(
    {
      actionType: 'claim_link_issued' as never,
      entityType: 'student',
      entityId: studentId,
      details: { description: `دعوة ولي أمر — ${(student as { id: string }).id}` },
    } as never,
    user.id,
  )

  return { claimUrl: buildClaimUrl(rawToken), expiresAt }
}

/** Claim status per student — derivable from students.claimed_by. */
export async function getClaimStatus(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const service = createServiceClient()

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, claimed_by')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) return { error: 'الطالب غير موجود' }

  const ownerTeacherId = await assertOwnsStudent(service, user.id, studentId)
  if (!ownerTeacherId) return { error: 'Forbidden' }

  const s = student as unknown as StudentClaimRow

  const { data: invite } = await service
    .from('claim_tokens')
    .select('id, expires_at')
    .eq('student_id', studentId)
    .is('used_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const live = (invite ?? null) as { id: string; expires_at: string } | null

  return {
    status: (s.claimed_by ? 'claimed' : 'unclaimed') as 'claimed' | 'unclaimed',
    claimedBy: s.claimed_by,
    hasActiveInvite: !!live,
    inviteExpiresAt: live?.expires_at ?? null,
  }
}

export type ClaimPreviewState = 'valid' | 'invalid' | 'expired' | 'used' | 'revoked'

/**
 * Pre-login token -> names preview for /claim?token= (R5). No session
 * required; returns display names only. Rate-limit is deliberately NOT
 * applied here (read-only, no side effects) — brute force still needs a
 * 256-bit guess per try and learns names only for the exact bearer.
 */
export async function resolveClaimPreview(rawToken: string) {
  if (!isValidClaimTokenFormat(rawToken)) {
    return { error: CLAIM_COPY.claimInvalidDescription, state: 'invalid' as ClaimPreviewState }
  }

  const service = createServiceClient()
  const tokenHash = hashClaimToken(rawToken)

  const { data: token } = await service
    .from('claim_tokens')
    .select('id, student_id, teacher_id, expires_at, used_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  const row = (token ?? null) as ClaimTokenRow | null
  const verdict = evaluateClaimForRedeem(
    row ? { tokenHashMatches: true, usedAt: row.used_at, revokedAt: row.revoked_at, expiresAt: row.expires_at } : null,
  )
  if (!verdict.ok) {
    switch (verdict.reason) {
      case 'expired':
        return { error: CLAIM_COPY.claimExpiredDescription, state: 'expired' as ClaimPreviewState }
      case 'already_used':
        return { error: CLAIM_COPY.claimUsedDescription, state: 'used' as ClaimPreviewState }
      case 'revoked':
        return { error: CLAIM_COPY.claimRevokedDescription, state: 'revoked' as ClaimPreviewState }
      default:
        return { error: CLAIM_COPY.claimInvalidDescription, state: 'invalid' as ClaimPreviewState }
    }
  }
  if (!row) return { error: CLAIM_COPY.claimInvalidDescription, state: 'invalid' as ClaimPreviewState }

  const [{ data: student }, { data: teacher }] = await Promise.all([
    service.from('students').select('id, name').eq('id', row.student_id).maybeSingle(),
    service.from('teachers').select('id, profile_id').eq('id', row.teacher_id).maybeSingle(),
  ])

  const s = (student ?? null) as { name?: string | null } | null
  const t = (teacher ?? null) as { profile_id?: string } | null

  let teacherName = 'المعلم'
  if (t?.profile_id) {
    const { data: profile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', t.profile_id)
      .maybeSingle()
    teacherName = ((profile as { full_name?: string | null } | null)?.full_name || 'المعلم') as string
  }

  return {
    state: 'valid' as ClaimPreviewState,
    studentId: row.student_id,
    studentName: (s?.name || 'طالب') as string,
    teacherName,
  }
}

/**
 * Payer links THEIR OWN logged-in profile to the student named by the token
 * (R6). Requires a session (magic-link OTP first — see claim-screen.tsx).
 * Rate-limited per profile+IP (R4); single-use + expiry via the pure gate.
 */
export async function redeemClaim(rawToken: string, opts?: { attemptKey?: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const service = createServiceClient()
  const nowMs = Date.now()
  const attemptKey = opts?.attemptKey ?? (await deriveAttemptKey(user.id))

  if (await isRateLimited(service, attemptKey, nowMs)) {
    return { error: CLAIM_COPY.claimRateLimitedDescription, reason: 'rate_limited' as const }
  }

  // Format-invalid guesses still cost an attempt (R4).
  if (!isValidClaimTokenFormat(rawToken)) {
    await recordAttempt(service, attemptKey, nowMs)
    return { error: CLAIM_COPY.claimInvalidDescription, reason: 'invalid' as const }
  }

  const tokenHash = hashClaimToken(rawToken)
  const { data: token } = await service
    .from('claim_tokens')
    .select('id, student_id, teacher_id, expires_at, used_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  const row = (token ?? null) as ClaimTokenRow | null
  const verdict = evaluateClaimForRedeem(
    row
      ? { tokenHashMatches: true, usedAt: row.used_at, revokedAt: row.revoked_at, expiresAt: row.expires_at }
      : null,
    nowMs,
  )

  if (!verdict.ok) {
    await recordAttempt(service, attemptKey, nowMs)
    switch (verdict.reason) {
      case 'expired':
        return { error: CLAIM_COPY.claimExpiredDescription, reason: 'expired' as const }
      case 'already_used':
        return { error: CLAIM_COPY.claimUsedDescription, reason: 'already_used' as const }
      case 'revoked':
        return { error: CLAIM_COPY.claimRevokedDescription, reason: 'revoked' as const }
      default:
        return { error: CLAIM_COPY.claimInvalidDescription, reason: 'invalid' as const }
    }
  }
  if (!row) {
    await recordAttempt(service, attemptKey, nowMs)
    return { error: CLAIM_COPY.claimInvalidDescription, reason: 'invalid' as const }
  }

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, name, claimed_by')
    .eq('id', row.student_id)
    .maybeSingle()
  const s = (student ?? null) as StudentClaimRow | null
  if (!s) {
    await recordAttempt(service, attemptKey, nowMs)
    return { error: CLAIM_COPY.claimInvalidDescription, reason: 'invalid' as const }
  }

  // No steal: a row claimed by another profile stays claimed (R7).
  if (s.claimed_by && s.claimed_by !== user.id) {
    return { error: CLAIM_COPY.claimAlreadyClaimedDescription, reason: 'already_claimed' as const }
  }

  const nowIso = new Date(nowMs).toISOString()
  const studentName = s.name || 'طالب'

  // Mark the token consumed (single-use, R8) + link the caller's profile.
  // Idempotent when the caller already owns the row: consume the token,
  // keep claimed_by, report idempotent success.
  await service
    .from('claim_tokens')
    .update({ used_at: nowIso, used_by_profile_id: user.id })
    .eq('id', row.id)

  if (!s.claimed_by) {
    await service.from('students').update({ claimed_by: user.id }).eq('id', s.id)
  }

  await clearAttempts(service, attemptKey)

  await logActivity(
    {
      actionType: 'claim_redeemed' as never,
      entityType: 'student',
      entityId: s.id,
      details: { student_name: studentName, description: `ربط ولي أمر — ${studentName}` },
    } as never,
    user.id,
  )

  return {
    success: true as const,
    idempotent: (s.claimed_by === user.id) as boolean,
    studentId: s.id,
    studentName,
  }
}

// Re-exported for the report: documents the enforced constants in one place.
export const CLAIM_RATE_LIMIT_DOC = {
  maxAttempts: CLAIM_MAX_ATTEMPTS,
  windowMs: CLAIM_ATTEMPT_WINDOW_MS,
} as const
