// lib/__tests__/claim-actions.test.ts
// #36 slice 8/8 — invite / claim server actions (issue, preview, redeem,
// status, rate-limit, wrong-teacher isolation).
// STATUS: UNVERIFIED — written test-first, never executed (ZERO-shell lane).
// Pending shell: `npm run test -- lib/__tests__/claim-actions.test.ts`
// Mocks at boundaries only (supabase server/service, log-activity,
// next/headers); the pure issuer/redeemer/rate gates stay real.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --------------------------------------------------------------------------
// Mocks (boundaries only)
// --------------------------------------------------------------------------

const mockSupabase = {
  auth: { getUser: vi.fn() },
}

const ctx: {
  rows: Record<string, unknown>
  inserts: Record<string, unknown>
  updates: Record<string, unknown[]>
  deletes: string[]
} = { rows: {}, inserts: {}, updates: {}, deletes: [] }

function chainFor(table: string): Record<string, unknown> {
  const b: Record<string, any> = {}
  const chain = () => b
  b.select = vi.fn(chain)
  b.eq = vi.fn(chain)
  b.is = vi.fn(chain)
  b.gt = vi.fn(chain)
  b.order = vi.fn(chain)
  b.limit = vi.fn(chain)
  b.insert = vi.fn((row: unknown) => {
    ctx.inserts[table] = row
    return Promise.resolve({ error: null })
  })
  b.update = vi.fn((row: unknown) => {
    ctx.updates[table] = [...(ctx.updates[table] ?? []), row]
    return b
  })
  b.delete = vi.fn(() => {
    ctx.deletes.push(table)
    return b
  })
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: ctx.rows[table] ?? null }))
  b.single = vi.fn(() => Promise.resolve({ data: ctx.rows[table] ?? null }))
  return b
}

const mockService = {
  from: vi.fn((table: string) => chainFor(table)),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

const mockLog = vi.fn()
vi.mock('@/lib/log-activity', () => ({
  logActivity: (...args: unknown[]) => mockLog(...args),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}))

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const TEACHER_USER = 'teacher-user-1'
const PAYER_USER = 'payer-user-1'
const STUDENT_ID = 'stu-1'
const TEACHER_ID = 't1'

function liveTokenRow() {
  return {
    id: 'tok-1',
    student_id: STUDENT_ID,
    teacher_id: TEACHER_ID,
    token_hash: 'PLACEHOLDER',
    expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    used_at: null,
    revoked_at: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ctx.rows = {}
  ctx.inserts = {}
  ctx.updates = {}
  ctx.deletes = []
  ctx.rows.students = {
    id: STUDENT_ID,
    teacher_id: TEACHER_ID,
    name: 'أحمد',
    claimed_by: null,
  }
  ctx.rows.teachers = { id: TEACHER_ID, profile_id: TEACHER_USER }
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: TEACHER_USER } } })
  mockLog.mockResolvedValue(undefined)
})

// --------------------------------------------------------------------------
// issueClaimLink
// --------------------------------------------------------------------------

describe('issueClaimLink (teacher-owned, regenerate revokes)', () => {
  it('mints a link, stores ONLY the sha256 hash, and revokes prior live tokens', async () => {
    const { issueClaimLink } = await import('@/lib/claim-actions')
    const { hashClaimToken } = await import('@/lib/claim-tokens')

    const result = await issueClaimLink(STUDENT_ID)

    expect((result as { claimUrl?: string }).claimUrl).toMatch(/^\/claim\?token=clm_/)
    const raw = new URL((result as { claimUrl: string }).claimUrl, 'http://x').searchParams.get(
      'token',
    ) as string
    const stored = ctx.inserts['claim_tokens'] as { token_hash: string; expires_at: string }
    // HASH-NOT-PLAINTEXT: stored value is the 64-hex sha256 of the raw bearer.
    expect(stored.token_hash).toBe(hashClaimToken(raw))
    expect(stored.token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(stored.token_hash).not.toContain(raw)
    // 7-day expiry persisted.
    const ttl = Date.parse(stored.expires_at) - Date.now()
    expect(ttl).toBeGreaterThan(6.5 * 24 * 60 * 60 * 1000)
    expect(ttl).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000)
    // Regenerate path: prior live tokens revoked before insert.
    expect(ctx.updates['claim_tokens']).toHaveLength(1)
    expect(
      (ctx.updates['claim_tokens'][0] as { revoked_at?: string }).revoked_at,
    ).toBeTruthy()
    expect(mockLog).toHaveBeenCalledOnce()
  })

  it('returns Forbidden with no writes when the student belongs to another teacher', async () => {
    ctx.rows.students = { id: STUDENT_ID, teacher_id: 't-other', name: 'أحمد', claimed_by: null }
    const { issueClaimLink } = await import('@/lib/claim-actions')

    const result = await issueClaimLink(STUDENT_ID)

    expect((result as { error?: string }).error).toBe('Forbidden')
    expect(ctx.inserts['claim_tokens']).toBeUndefined()
    expect(ctx.updates['claim_tokens']).toBeUndefined()
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('returns Unauthorized without touching the service client when signed out', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { issueClaimLink } = await import('@/lib/claim-actions')

    const result = await issueClaimLink(STUDENT_ID)

    expect((result as { error?: string }).error).toBe('Unauthorized')
    expect(mockService.from).not.toHaveBeenCalled()
  })
})

// --------------------------------------------------------------------------
// getClaimStatus (derivable from students.claimed_by)
// --------------------------------------------------------------------------

describe('getClaimStatus', () => {
  it('reports unclaimed with no active invite, then claimed after linking', async () => {
    const { getClaimStatus } = await import('@/lib/claim-actions')

    const before = await getClaimStatus(STUDENT_ID)
    expect(before).toMatchObject({ status: 'unclaimed', hasActiveInvite: false })

    ctx.rows.students = {
      id: STUDENT_ID,
      teacher_id: TEACHER_ID,
      name: 'أحمد',
      claimed_by: PAYER_USER,
    }
    const after = await getClaimStatus(STUDENT_ID)
    expect(after).toMatchObject({ status: 'claimed', claimedBy: PAYER_USER })
  })

  it('surfaces a live invite with its expiry', async () => {
    ctx.rows['claim_tokens'] = { id: 'tok-9', expires_at: new Date(Date.now() + 10_000).toISOString() }
    const { getClaimStatus } = await import('@/lib/claim-actions')

    const result = await getClaimStatus(STUDENT_ID)
    expect((result as { hasActiveInvite?: boolean }).hasActiveInvite).toBe(true)
    expect((result as { inviteExpiresAt?: string }).inviteExpiresAt).toBeTruthy()
  })

  it('is Forbidden for the wrong teacher', async () => {
    ctx.rows.students = { id: STUDENT_ID, teacher_id: 't-other', claimed_by: null }
    const { getClaimStatus } = await import('@/lib/claim-actions')

    const result = await getClaimStatus(STUDENT_ID)
    expect((result as { error?: string }).error).toBe('Forbidden')
  })
})

// --------------------------------------------------------------------------
// resolveClaimPreview (pre-login, names only)
// --------------------------------------------------------------------------

describe('resolveClaimPreview', () => {
  it('resolves names for a live token without leaking hash or raw secret', async () => {
    const { generateClaimToken, hashClaimToken } = await import('@/lib/claim-tokens')
    const raw = generateClaimToken()
    ctx.rows['claim_tokens'] = { ...liveTokenRow(), token_hash: hashClaimToken(raw) }
    ctx.rows.profiles = { full_name: 'الشيخ محمد' }
    const { resolveClaimPreview } = await import('@/lib/claim-actions')

    const result = await resolveClaimPreview(raw)

    expect(result).toMatchObject({
      state: 'valid',
      studentName: 'أحمد',
      teacherName: 'الشيخ محمد',
    })
    expect(JSON.stringify(result)).not.toContain(hashClaimToken(raw))
    expect(JSON.stringify(result)).not.toContain(raw)
  })

  it('maps expired / used / revoked / unknown to distinct copy states', async () => {
    const { generateClaimToken, hashClaimToken } = await import('@/lib/claim-tokens')
    const { resolveClaimPreview } = await import('@/lib/claim-actions')

    const raw = generateClaimToken()
    ctx.rows['claim_tokens'] = {
      ...liveTokenRow(),
      token_hash: hashClaimToken(raw),
      expires_at: new Date(Date.now() - 1_000).toISOString(),
    }
    expect(((await resolveClaimPreview(raw)) as { state?: string }).state).toBe('expired')

    ctx.rows['claim_tokens'] = {
      ...liveTokenRow(),
      token_hash: hashClaimToken(raw),
      used_at: new Date().toISOString(),
    }
    expect(((await resolveClaimPreview(raw)) as { state?: string }).state).toBe('used')

    ctx.rows['claim_tokens'] = {
      ...liveTokenRow(),
      token_hash: hashClaimToken(raw),
      revoked_at: new Date().toISOString(),
    }
    expect(((await resolveClaimPreview(raw)) as { state?: string }).state).toBe('revoked')

    ctx.rows['claim_tokens'] = null
    const unknown = await resolveClaimPreview(generateClaimToken())
    expect((unknown as { state?: string }).state).toBe('invalid')
    expect((unknown as { error?: string }).error).toBeTruthy()
  })
})

// --------------------------------------------------------------------------
// redeemClaim (rate-limited, single-use, no-steal)
// --------------------------------------------------------------------------

describe('redeemClaim happy path', () => {
  it('links the caller profile, consumes the token, clears attempts, logs', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    const { generateClaimToken, hashClaimToken } = await import('@/lib/claim-tokens')
    const raw = generateClaimToken()
    ctx.rows['claim_tokens'] = { ...liveTokenRow(), token_hash: hashClaimToken(raw) }
    const { redeemClaim } = await import('@/lib/claim-actions')

    const result = await redeemClaim(raw, { attemptKey: 'test-key-1' })

    expect(result).toMatchObject({ success: true, studentId: STUDENT_ID, studentName: 'أحمد' })
    // Token consumed (single-use mark with the redeemer's profile).
    expect(ctx.updates['claim_tokens']).toHaveLength(1)
    expect(ctx.updates['claim_tokens'][0]).toMatchObject({ used_by_profile_id: PAYER_USER })
    expect(
      (ctx.updates['claim_tokens'][0] as { used_at?: string }).used_at,
    ).toBeTruthy()
    // Row linked to the CALLER — never a client-supplied id.
    expect(ctx.updates['students']).toHaveLength(1)
    expect(ctx.updates['students'][0]).toMatchObject({ claimed_by: PAYER_USER })
    expect(ctx.deletes).toContain('claim_redeem_attempts')
    expect(mockLog).toHaveBeenCalledOnce()
  })

  it('is idempotent when the caller already owns the row (token still consumed)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    const { generateClaimToken, hashClaimToken } = await import('@/lib/claim-tokens')
    const raw = generateClaimToken()
    ctx.rows['claim_tokens'] = { ...liveTokenRow(), token_hash: hashClaimToken(raw) }
    ctx.rows.students = { id: STUDENT_ID, teacher_id: TEACHER_ID, name: 'أحمد', claimed_by: PAYER_USER }
    const { redeemClaim } = await import('@/lib/claim-actions')

    const result = await redeemClaim(raw, { attemptKey: 'test-key-2' })

    expect(result).toMatchObject({ success: true, idempotent: true })
    expect(ctx.updates['claim_tokens']).toHaveLength(1)
    expect(ctx.updates['students']).toBeUndefined()
  })
})

describe('redeemClaim rejections', () => {
  beforeEach(() => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
  })

  it('rejects expired / reused / revoked / wrong-row tokens AND records an attempt each time', async () => {
    const { generateClaimToken, hashClaimToken } = await import('@/lib/claim-tokens')
    const { redeemClaim } = await import('@/lib/claim-actions')
    const raw = generateClaimToken()

    for (const [patch, reason] of [
      [{ expires_at: new Date(Date.now() - 1_000).toISOString() }, 'expired'],
      [{ used_at: new Date().toISOString() }, 'already_used'],
      [{ revoked_at: new Date().toISOString() }, 'revoked'],
    ] as const) {
      ctx.inserts = {}
      ctx.updates = {}
      ctx.rows['claim_tokens'] = { ...liveTokenRow(), token_hash: hashClaimToken(raw), ...patch }
      const result = await redeemClaim(raw, { attemptKey: 'test-key-3' })
      expect((result as { reason?: string }).reason).toBe(reason)
      // Attempt counter written; no link, no consume.
      expect(ctx.inserts['claim_redeem_attempts']).toBeTruthy()
      expect(ctx.updates['claim_tokens']).toBeUndefined()
      expect(ctx.updates['students']).toBeUndefined()
    }

    // Wrong-row: presented token hashes to nothing (generic invalid).
    ctx.inserts = {}
    ctx.rows['claim_tokens'] = null
    const wrong = await redeemClaim(generateClaimToken(), { attemptKey: 'test-key-3' })
    expect((wrong as { reason?: string }).reason).toBe('invalid')
    expect(ctx.inserts['claim_redeem_attempts']).toBeTruthy()
  })

  it('refuses to steal a row claimed by another profile (no consume, no relink)', async () => {
    const { generateClaimToken, hashClaimToken } = await import('@/lib/claim-tokens')
    const raw = generateClaimToken()
    ctx.rows['claim_tokens'] = { ...liveTokenRow(), token_hash: hashClaimToken(raw) }
    ctx.rows.students = {
      id: STUDENT_ID,
      teacher_id: TEACHER_ID,
      name: 'أحمد',
      claimed_by: 'other-payer',
    }
    const { redeemClaim } = await import('@/lib/claim-actions')

    const result = await redeemClaim(raw, { attemptKey: 'test-key-4' })

    expect((result as { reason?: string }).reason).toBe('already_claimed')
    expect(((result as { error?: string }).error ?? '')).toMatch(/مربوط/)
    expect(ctx.updates['claim_tokens']).toBeUndefined()
    expect(ctx.updates['students']).toBeUndefined()
  })

  it('rejects after N tries inside the window (rate-limit) without touching rows', async () => {
    const { CLAIM_MAX_ATTEMPTS } = await import('@/lib/claim-tokens')
    ctx.rows['claim_redeem_attempts'] = {
      key: 'k',
      attempts: CLAIM_MAX_ATTEMPTS,
      window_started_at: new Date().toISOString(),
    }
    const { generateClaimToken, hashClaimToken } = await import('@/lib/claim-tokens')
    const raw = generateClaimToken()
    ctx.rows['claim_tokens'] = { ...liveTokenRow(), token_hash: hashClaimToken(raw) }
    const { redeemClaim } = await import('@/lib/claim-actions')

    const result = await redeemClaim(raw, { attemptKey: 'test-key-5' })

    expect((result as { reason?: string }).reason).toBe('rate_limited')
    expect(((result as { error?: string }).error ?? '')).toMatch(/المحاولات/)
    expect(ctx.updates['claim_tokens']).toBeUndefined()
    expect(ctx.updates['students']).toBeUndefined()
  })

  it('returns Unauthorized when signed out (redeem always needs a session)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { redeemClaim } = await import('@/lib/claim-actions')

    const result = await redeemClaim('clm_anything')
    expect((result as { error?: string }).error).toBe('Unauthorized')
  })
})

describe('buildAttemptKey (no raw IPs stored)', () => {
  it('is deterministic, prefixed, hex, and hides its input', async () => {
    const { buildAttemptKey } = await import('@/lib/claim-tokens')
    const a = buildAttemptKey('user-1|1.2.3.4')
    expect(a).toBe(buildAttemptKey('user-1|1.2.3.4'))
    expect(a).toMatch(/^redeem:[0-9a-f]{64}$/)
    expect(a).not.toContain('1.2.3.4')
    expect(a).not.toContain('user-1')
    expect(a).not.toBe(buildAttemptKey('user-2|1.2.3.4'))
  })
})
