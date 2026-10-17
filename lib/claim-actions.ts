'use server'

// lib/claim-actions.ts
// #36 slice 8/8 — invite / claim identity server actions.
// IMPORTS ONLY from frozen lanes (never edits them):
//   assertOwnsStudent (lib/ownership.ts) + service-role writes (#25 posture)
//   + logActivity (lib/log-activity.ts, typed ActionType)
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

import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/action-context'
import { assertOwnsStudent, getOwnTeacherId } from '@/lib/ownership'
import { logActivity } from '@/lib/log-activity'
import {
  CLAIM_ATTEMPT_WINDOW_MS,
  buildAttemptKey,
  buildClaimUrl,
  claimExpiryFromNow,
  evaluateClaimForRedeem,
  evaluateClaimRateLimit,
  generateClaimToken,
  hashClaimToken,
  isValidClaimTokenFormat,
} from '@/lib/claim-tokens'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/phone-utils'
import { HUB_UNKNOWN_TEACHER_LABEL } from '@/lib/payer-hub'

type Service = ReturnType<typeof createServiceClient>

/**
 * Absolute site base for links shared OUTSIDE the app (WhatsApp). A relative
 * /claim?token= path is untappable gibberish in a chat — the parent needs a
 * real https Alhalaqa link. Request host first, env fallback, never throws.
 */
async function getShareBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? 'https'
      return `${proto}://${host}`
    }
  } catch {
    // Fall through to env.
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '')
}

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

async function readClientIp(): Promise<string> {
  try {
    const h = await headers()
    const forwarded = h.get('x-forwarded-for')
    return (forwarded?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown').slice(0, 128)
  } catch {
    return 'unknown'
  }
}

async function deriveAttemptKey(userId: string): Promise<string> {
  const ip = await readClientIp()
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
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  // One roundtrip instead of two: fetch the row + the caller's teacher id
  // together, then compare in code (same check as assertOwnsStudent).
  const [{ data: student }, ownerTeacherId] = await Promise.all([
    service
      .from('students')
      .select('id, teacher_id')
      .is('deleted_at', null)
      .eq('id', studentId)
      .maybeSingle(),
    getOwnTeacherId(service, user.id),
  ])
  if (!student) return { error: 'الطالب غير موجود' }
  const studentTeacherId = (student as { teacher_id: string }).teacher_id
  if (!ownerTeacherId || ownerTeacherId !== studentTeacherId) return { error: 'Forbidden' }

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

  const mint = () =>
    service.from('claim_tokens').insert({
      student_id: studentId,
      teacher_id: ownerTeacherId,
      token_hash: hashClaimToken(rawToken),
      expires_at: expiresAt,
    })
  let { error: insertError } = await mint()
  // Concurrent regenerate vs the one-live-token index: on unique-violation,
  // check whose token is live before touching anything. Revoking blindly
  // would kill the concurrent winner's just-minted link.
  if (insertError && String((insertError as { code?: string }).code) === '23505') {
    const { data: live } = await service
      .from('claim_tokens')
      .select('token_hash')
      .eq('student_id', studentId)
      .is('used_at', null)
      .is('revoked_at', null)
      .maybeSingle()
    if ((live as { token_hash?: string } | null)?.token_hash !== hashClaimToken(rawToken)) {
      return { error: 'تم إنشاء رابط آخر للتو — أعد إصدار الرابط' }
    }
    await service
      .from('claim_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('student_id', studentId)
      .is('used_at', null)
      .is('revoked_at', null)
    ;({ error: insertError } = await mint())
  }
  if (insertError) return { error: 'تعذر إنشاء رابط الدعوة — حاول مرة أخرى' }

  // Atomicity close: a delete landing between the liveness read above and
  // this insert would mint a live link on a trashed row. Re-validate and
  // self-revoke the just-issued token when the row is gone.
  const { data: stillLive } = await service
    .from('students')
    .select('id')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()
  if (!stillLive) {
    await service
      .from('claim_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashClaimToken(rawToken))
    return { error: 'الطالب غير موجود' }
  }

  await logActivity(
    {
      actionType: 'claim_link_issued',
      entityType: 'student',
      entityId: studentId,
      details: { description: `دعوة ولي أمر — ${(student as { id: string }).id}` },
    },
    user.id,
  )

  const base = await getShareBaseUrl()
  // Absolute share link (https://site/claim?token=...). buildClaimUrl stays
  // relative-only for the in-app OTP ?next= path (open-redirect safe).
  return { claimUrl: `${base}${buildClaimUrl(rawToken)}`, expiresAt }
}

/** Claim status per student — derivable from students.claimed_by. */
export async function getClaimStatus(studentId: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, claimed_by')
    .is('deleted_at', null)
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
    service.from('students').select('id, name').is('deleted_at', null).eq('id', row.student_id).maybeSingle(),
    service.from('teachers').select('id, profile_id').eq('id', row.teacher_id).maybeSingle(),
  ])

  const s = (student ?? null) as { name?: string | null } | null
  const t = (teacher ?? null) as { profile_id?: string } | null

  // A live link for a soft-deleted student reports revoked, never valid:
  // the row is gone, so is the invitation. Never leak the student id here.
  if (!s) {
    return { error: CLAIM_COPY.claimRevokedDescription, state: 'revoked' as ClaimPreviewState }
  }

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
export async function redeemClaim(rawToken: string, _opts?: { attemptKey?: string }) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx
  const nowMs = Date.now()
  // Server-derived keys only: a client-supplied attemptKey would let callers
  // rotate buckets per guess. The per-user global bucket binds even when the
  // IP is spoofed via forwarded headers.
  const attemptKey = await deriveAttemptKey(user.id)
  const globalKey = buildAttemptKey(`redeem-global|${user.id}`)
  const isLimited = async () =>
    (await isRateLimited(service, attemptKey, nowMs)) ||
    (await isRateLimited(service, globalKey, nowMs))
  const record = async () => {
    await recordAttempt(service, attemptKey, nowMs)
    await recordAttempt(service, globalKey, nowMs)
  }
  const clear = async () => {
    await clearAttempts(service, attemptKey)
    await clearAttempts(service, globalKey)
  }

  if (await isLimited()) {
    return { error: CLAIM_COPY.claimRateLimitedDescription, reason: 'rate_limited' as const }
  }

  // Format-invalid guesses still cost an attempt (R4).
  if (!isValidClaimTokenFormat(rawToken)) {
    await record()
    return { error: CLAIM_COPY.claimInvalidDescription, reason: 'invalid' as const }
  }

  const tokenHash = hashClaimToken(rawToken)

  // Best-effort read for truthful error messages only (failures are
  // monotonic: expired/used/revoked never un-happen). The RPC below is
  // authoritative — a row deleted after this read still fails closed.
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
    await record()
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

  // One atomic transaction (consume_claim RPC): token mark + payer link
  // against a live student. No evaluate-then-mark gap for a concurrent
  // delete to burn the token while reporting phantom success.
  const { data: studentId, error: consumeError } = await service.rpc('consume_claim', {
    p_token_hash: tokenHash,
    p_profile_id: user.id,
  })
  if (consumeError) {
    await record()
    const msg = String((consumeError as { message?: string }).message ?? '')
    if (msg.includes('claim_taken')) {
      return { error: CLAIM_COPY.claimAlreadyClaimedDescription, reason: 'already_claimed' as const }
    }
    return { error: CLAIM_COPY.claimInvalidDescription, reason: 'invalid' as const }
  }

  const { data: student } = await service
    .from('students')
    .select('id, teacher_id, name, claimed_by, phone')
    .is('deleted_at', null)
    .eq('id', studentId as string)
    .maybeSingle()
  const s = (student ?? null) as StudentClaimRow | null
  if (!s) {
    await record()
    return { error: CLAIM_COPY.claimInvalidDescription, reason: 'invalid' as const }
  }
  // Defense-in-depth: the RPC guarantees ownership, but a future RPC change
  // must never silently report success to a non-owner.
  if (s.claimed_by && s.claimed_by !== user.id) {
    await record()
    return { error: CLAIM_COPY.claimAlreadyClaimedDescription, reason: 'already_claimed' as const }
  }

  const studentName = s.name || 'طالب'

  await clear()

  await logActivity(
    {
      actionType: 'claim_redeemed',
      entityType: 'student',
      entityId: s.id,
      details: { student_name: studentName, description: `ربط ولي أمر — ${studentName}` },
    },
    user.id,
  )

  return {
    success: true as const,
    idempotent: (s.claimed_by === user.id) as boolean,
    studentId: s.id,
    studentName,
    claimedPhone: ((s as { phone?: string | null }).phone ?? null) as string | null,
  }
}

export interface ClaimedHubStudent {
  studentId: string
  studentName: string
  teacherId: string
  teacherName: string
}

/**
 * Payer home list (A3): every student whose claimed_by is the caller, with
 * the teacher display name. Session-scoped — never a global list. Teacher
 * names resolve teachers -> profiles.full_name; missing names fall back to
 * the neutral label (the hub component owns the final fallback too).
 */
export async function listMyClaimedStudents() {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const { data, error } = (await service
    .from('students')
    .select('id, name, teacher_id, teachers!inner(profile_id, profiles!inner(full_name))')
    .is('deleted_at', null)
    .eq('claimed_by', user.id)) as unknown as {
    data: Array<{
      id: string
      name: string | null
      teacher_id: string
      teachers: { profile_id: string | null; profiles: { full_name: string | null } | null } | null
    }> | null
    error: unknown
  }
  if (error) return { error: 'تعذر تحميل القائمة — حاول مرة أخرى' }

  const students: ClaimedHubStudent[] = (data ?? []).map((s) => ({
    studentId: s.id,
    studentName: s.name || 'طالب',
    teacherId: s.teacher_id,
    teacherName:
      (s.teachers?.profiles?.full_name || '').trim() || HUB_UNKNOWN_TEACHER_LABEL,
  }))
  return { students }
}

/**
 * Conditional مدفوعاتي gate (B): true when the caller owns ≥1 claimed row —
 * i.e. this teacher is ALSO a payer. Session-less callers and teachers
 * without claims get false (the shortcut stays hidden).
 */
export async function callerHasClaimedStudents(): Promise<boolean> {
  const listed = await listMyClaimedStudents()
  if ((listed as { error?: string }).error) return false
  return (((listed as { students?: unknown[] }).students ?? []).length ?? 0) > 0
}

interface PhoneMatchRow {
  id: string
  name: string | null
  teacher_id: string
  claimed_by: string | null
  teachers: { profile_id: string | null; profiles: { full_name: string | null } | null } | null
}

function toHubStudent(s: PhoneMatchRow): ClaimedHubStudent {
  return {
    studentId: s.id,
    studentName: s.name || 'طالب',
    teacherId: s.teacher_id,
    teacherName: (s.teachers?.profiles?.full_name || '').trim() || HUB_UNKNOWN_TEACHER_LABEL,
  }
}

/**
 * Phone-pull discovery (phone flow): exact E.164 match, unclaimed rows
 * only, no session required (pre-login, like resolveClaimPreview R5).
 * Rate-limited per IP+phone against enumeration; invalid numbers and
 * empty results share one shape (no oracle beyond the match list).
 */
export async function lookupStudentsByPhone(rawPhone: string) {
  const phone = formatPhoneNumber((rawPhone ?? '').trim())
  if (!isValidPhoneNumber(phone)) return { error: CLAIM_COPY.phoneClaimInvalidPhone }

  const service = createServiceClient()
  const nowMs = Date.now()
  const ip = await readClientIp()
  const key = buildAttemptKey(`phone-lookup|${ip}|${phone}`)
  // Global per-IP bucket alongside the per-phone one: sweeping many distinct
  // numbers must hit a wall even though each number gets a fresh bucket.
  const globalKey = buildAttemptKey(`phone-lookup-global|${ip}`)
  if (
    (await isRateLimited(service, key, nowMs)) ||
    (await isRateLimited(service, globalKey, nowMs))
  ) {
    return { error: CLAIM_COPY.claimRateLimitedDescription }
  }
  await recordAttempt(service, key, nowMs)
  await recordAttempt(service, globalKey, nowMs)

  const { data, error } = (await service
    .from('students')
    .select('id, name, teacher_id, claimed_by, teachers!inner(profile_id, profiles!inner(full_name))')
    .is('deleted_at', null)
    .eq('phone', phone)
    .is('claimed_by', null)) as unknown as { data: PhoneMatchRow[] | null; error: unknown }
  if (error) return { error: CLAIM_COPY.phoneClaimLookupFail }

  return { students: (data ?? []).filter((s) => !s.claimed_by).map(toHubStudent) }
}

/**
 * Phone-pull claim (phone flow): links EVERY unclaimed row under the
 * caller's phone to the caller's own profile. Requires a session (magic-link
 * OTP first) — the phone routes, the session proves (same posture as R6).
 * Rows claimed by someone else are excluded twice: by the DB filter and by
 * the in-code skip (no steal, like R7). Single tap, whole family.
 */
export async function claimByPhone(rawPhone: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const phone = formatPhoneNumber((rawPhone ?? '').trim())
  if (!isValidPhoneNumber(phone)) return { error: CLAIM_COPY.phoneClaimInvalidPhone }

  const nowMs = Date.now()
  const attemptKey = await deriveAttemptKey(user.id)
  const globalKey = buildAttemptKey(`claim-global|${user.id}`)
  if (
    (await isRateLimited(service, attemptKey, nowMs)) ||
    (await isRateLimited(service, globalKey, nowMs))
  ) {
    return { error: CLAIM_COPY.claimRateLimitedDescription }
  }
  // Every call costs attempts in both buckets (checked above): the throttle
  // actually increments instead of only gating on other flows' traffic.
  await recordAttempt(service, attemptKey, nowMs)
  await recordAttempt(service, globalKey, nowMs)

  const { data, error } = (await service
    .from('students')
    .select('id, name, teacher_id, claimed_by, teachers!inner(profile_id, profiles!inner(full_name))')
    .is('deleted_at', null)
    .eq('phone', phone)
    .is('claimed_by', null)) as unknown as { data: PhoneMatchRow[] | null; error: unknown }
  if (error) return { error: CLAIM_COPY.phoneClaimFail }

  const nowIso = new Date(nowMs).toISOString()
  const claimed: ClaimedHubStudent[] = []
  for (const s of data ?? []) {
    if (!s || s.claimed_by) continue
    const { error: linkError } = (await service
      .from('students')
      .update({ claimed_by: user.id })
      .is('deleted_at', null)
      .eq('id', s.id)
      .is('claimed_by', null)) as unknown as { error: unknown }
    if (linkError) continue
    claimed.push(toHubStudent({ ...s, claimed_by: user.id }))
    await logActivity(
      {
        actionType: 'claim_redeemed',
        entityType: 'student',
        entityId: s.id,
        details: { student_name: s.name || 'طالب', description: `ربط برقم الهاتف — ${s.name || 'طالب'}` },
      },
      user.id,
    )
  }

  // Throttle accounting: misses accumulate (a sweep of numbers must hit the
  // wall); only an actual link resets the buckets.
  if (claimed.length > 0) {
    await clearAttempts(service, attemptKey)
    await clearAttempts(service, globalKey)
  }
  return { success: true as const, claimed }
}

/**
 * Typo recovery (phone flow): the owner unlinks their own row
 * (claimed_by back to null). Strangers get Forbidden; the row survives —
 * only the link is cut, so re-claiming (phone or invite link) just works.
 */
export async function unlinkStudent(studentId: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx
  const { data: student } = await service
    .from('students')
    .select('id, claimed_by')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()
  const s = (student ?? null) as { id: string; claimed_by: string | null } | null
  if (!s) return { error: 'الطالب غير موجود' }
  if (s.claimed_by !== user.id) return { error: 'Forbidden' }

  const { error: updateError } = (await service
    .from('students')
    .update({ claimed_by: null })
    .is('deleted_at', null)
    .eq('id', studentId)) as unknown as { error: unknown }
  if (updateError) return { error: CLAIM_COPY.phoneClaimUnlinkFail }

  await logActivity(
    {
      actionType: 'claim_unlinked',
      entityType: 'student',
      entityId: studentId,
      details: { description: 'فك ربط برقم الهاتف' },
    },
    user.id,
  )
  return { success: true as const }
}

/**
 * Payer-owned phone correction (A2). The caller must own the row
 * (students.claimed_by === caller) — the teacher cannot be impersonated and
 * a stranger cannot rewrite someone else's reachability. Normalizes via
 * phone-utils; invalid numbers never write.
 */
export async function updateClaimedPhone(studentId: string, rawPhone: string) {
  const ctx = await requireUser()
  if ('error' in ctx) return ctx
  const { user, service } = ctx

  const { data: student } = await service
    .from('students')
    .select('id, claimed_by')
    .is('deleted_at', null)
    .eq('id', studentId)
    .maybeSingle()
  const s = (student ?? null) as { id: string; claimed_by: string | null } | null
  if (!s) return { error: 'الطالب غير موجود' }
  if (s.claimed_by !== user.id) return { error: 'Forbidden' }

  const phone = formatPhoneNumber((rawPhone ?? '').trim())
  if (!isValidPhoneNumber(phone)) return { error: CLAIM_COPY.claimPhoneInvalid }

  const { error: updateError } = (await service
    .from('students')
    .update({ phone })
    .is('deleted_at', null)
    .eq('id', studentId)) as unknown as { error: unknown }
  if (updateError) return { error: CLAIM_COPY.claimPhoneSaveFail }

  return { success: true as const, phone }
}
