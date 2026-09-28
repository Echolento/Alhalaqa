// lib/__tests__/phone-claim-actions.test.ts
// Phone-pull claim flow: lookup by phone (pre-login, unclaimed-only,
// rate-limited), claim-by-phone (session, skips others' rows), unlink
// (owner-only recovery for typo'd numbers). Mocks at boundaries only.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  lookupStudentsByPhone,
  claimByPhone,
  unlinkStudent,
} from '@/lib/claim-actions'

const mockSupabase = {
  auth: { getUser: vi.fn() },
}

const ctx: {
  rows: Record<string, unknown>
  updates: Record<string, unknown[]>
} = { rows: {}, updates: {} }

function chainFor(table: string): Record<string, unknown> {
  const b: Record<string, any> = {}
  const chain = () => b
  b.select = vi.fn(chain)
  b.eq = vi.fn(chain)
  b.is = vi.fn(chain)
  b.insert = vi.fn(() => Promise.resolve({ error: null }))
  b.update = vi.fn((row: unknown) => {
    ctx.updates[table] = [...(ctx.updates[table] ?? []), row]
    return b
  })
  b.delete = vi.fn(() => b)
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: ctx.rows[table] ?? null }))
  b.then = undefined
  return b
}

function listChain(table: string, rowsKey: string) {
  const b = chainFor(table) as Record<string, any>
  b.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: ctx.rows[rowsKey] ?? [], error: null }).then(resolve)
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

const PAYER_USER = 'payer-user-1'
const OTHER_USER = 'other-user-9'

function matchRow(id = 's1', name = 'Karim', teacherId = 't1', teacherName = 'Sheikh Ali') {
  return {
    id,
    name,
    teacher_id: teacherId,
    claimed_by: null,
    teachers: { profile_id: 'p1', profiles: { full_name: teacherName } },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ctx.rows = {}
  ctx.updates = {}
  mockService.from.mockImplementation((table: string) => {
    if (table === 'students') return listChain(table, 'studentsList')
    return chainFor(table)
  })
})

describe('lookupStudentsByPhone', () => {
  it('rejects a malformed number without touching students', async () => {
    const res = await lookupStudentsByPhone('12345')
    expect((res as { error?: string }).error).toBeTruthy()
  })

  it('returns unclaimed matches with teacher names', async () => {
    ctx.rows.studentsList = [matchRow()]
    const res = await lookupStudentsByPhone('01055556666')
    expect((res as { students?: unknown[] }).students).toEqual([
      { studentId: 's1', studentName: 'Karim', teacherId: 't1', teacherName: 'Sheikh Ali' },
    ])
  })

  it('returns empty when nothing matches (no oracle detail)', async () => {
    ctx.rows.studentsList = []
    const res = await lookupStudentsByPhone('01055556666')
    expect((res as { students?: unknown[] }).students).toEqual([])
  })

  it('throttles after too many attempts', async () => {
    ctx.rows.claim_redeem_attempts = {
      key: 'k',
      attempts: 10,
      window_started_at: new Date().toISOString(),
    }
    // Force the counter read to hit the exhausted row.
    mockService.from.mockImplementation((table: string) => {
      if (table === 'claim_redeem_attempts') {
        const b = chainFor(table) as Record<string, any>
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: ctx.rows.claim_redeem_attempts }),
        )
        return b
      }
      if (table === 'students') return listChain(table, 'studentsList')
      return chainFor(table)
    })
    const res = await lookupStudentsByPhone('01055556666')
    expect((res as { error?: string }).error).toBeTruthy()
  })
})

describe('claimByPhone', () => {
  it('rejects without a session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await claimByPhone('01055556666')
    expect((res as { error?: string }).error).toBeTruthy()
  })

  it('claims every unclaimed match for the caller', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    ctx.rows.studentsList = [matchRow('s1'), matchRow('s2', 'Layla')]
    const res = await claimByPhone('01055556666')
    expect((res as { success?: boolean }).success).toBe(true)
    expect((res as { claimed?: unknown[] }).claimed).toHaveLength(2)
    expect(ctx.updates.students ?? []).toHaveLength(2)
  })

  it('skips rows claimed by someone else (no steal)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    const stolen = { ...matchRow('s9'), claimed_by: OTHER_USER }
    ctx.rows.studentsList = [matchRow('s1'), stolen]
    const res = await claimByPhone('01055556666')
    expect((res as { claimed?: Array<{ studentId: string }> }).claimed?.map((c) => c.studentId)).toEqual([
      's1',
    ])
  })
})

describe('unlinkStudent', () => {
  it('rejects without a session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await unlinkStudent('s1')
    expect((res as { error?: string }).error).toBeTruthy()
  })

  it('rejects when the caller does not own the row', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: OTHER_USER } } })
    ctx.rows.students = { id: 's1', claimed_by: PAYER_USER }
    // Single-row read path.
    mockService.from.mockImplementation((table: string) => chainFor(table))
    const res = await unlinkStudent('s1')
    expect((res as { error?: string }).error).toBeTruthy()
    expect(ctx.updates.students ?? []).toHaveLength(0)
  })

  it('nulls claimed_by for the owner (typo recovery)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    ctx.rows.students = { id: 's1', claimed_by: PAYER_USER }
    mockService.from.mockImplementation((table: string) => chainFor(table))
    const res = await unlinkStudent('s1')
    expect((res as { success?: boolean }).success).toBe(true)
    expect(ctx.updates.students ?? []).toHaveLength(1)
  })
})
