// lib/__tests__/claim-by-join-code.test.ts
// Payer claims via teacher code: phone + code → atomic RPC.
// The code is the teacher's vouch; the phone scopes it to ONE teacher's roster.
// Boundary mocks only (supabase server/service, headers, audit log).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { claimWithTeacherCode } from '@/lib/claim-actions'

const state = {
  user: { id: 'payer-1' } as { id: string } | null,
  attempts: null as null | { key: string; attempts: number; window_started_at: string },
  rpc: { data: [] as any, error: null as any },
  teacherName: 'Sheikh Ali',
  tables: [] as string[],
}

const mockService = {
  from: vi.fn((table: string) => {
    state.tables.push(table)
    const b: any = {}
    const chain = () => b
    b.select = vi.fn(chain)
    b.eq = vi.fn(chain)
    b.is = vi.fn(chain)
    b.order = vi.fn(chain)
    b.limit = vi.fn(chain)
    b.insert = vi.fn(async () => ({ error: null }))
    b.update = vi.fn(() => b)
    b.delete = vi.fn(() => b)
    b.maybeSingle = vi.fn(async () => {
      if (table === 'claim_redeem_attempts') return { data: state.attempts, error: null }
      if (table === 'teachers') {
        return { data: { id: 't1', profiles: { full_name: state.teacherName } }, error: null }
      }
      return { data: null, error: null }
    })
    return b
  }),
  rpc: vi.fn(async () => state.rpc),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => mockService,
}))

vi.mock('@/lib/log-activity', () => ({
  logActivity: vi.fn(async () => undefined),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}))

const PHONE = '01055556666'
const NORMALIZED_PHONE = '+201055556666'
const CODE = 'ABCDEFGH'

beforeEach(() => {
  vi.clearAllMocks()
  state.user = { id: 'payer-1' }
  state.attempts = null
  state.rpc = { data: [], error: null }
  state.teacherName = 'Sheikh Ali'
  state.tables = []
})

describe('claimWithTeacherCode', () => {
  it('rejects without a session', async () => {
    state.user = null
    const res = await claimWithTeacherCode(PHONE, CODE)
    expect((res as { error?: string }).error).toBeTruthy()
    expect(mockService.rpc).not.toHaveBeenCalled()
  })

  it('rejects a malformed phone before the RPC', async () => {
    const res = await claimWithTeacherCode('12345', CODE)
    expect((res as { error?: string }).error).toBeTruthy()
    expect(mockService.rpc).not.toHaveBeenCalled()
  })

  it('rejects a malformed code before the RPC', async () => {
    const res = await claimWithTeacherCode(PHONE, 'NOPE')
    expect((res as { error?: string }).error).toBeTruthy()
    expect(mockService.rpc).not.toHaveBeenCalled()
  })

  it('throttles when the attempt buckets are exhausted', async () => {
    state.attempts = {
      key: 'k',
      attempts: 10,
      window_started_at: new Date().toISOString(),
    }
    const res = await claimWithTeacherCode(PHONE, CODE)
    expect((res as { error?: string }).error).toBeTruthy()
    expect(mockService.rpc).not.toHaveBeenCalled()
  })

  it('calls the RPC with the normalized phone and code', async () => {
    state.rpc = {
      data: [{ id: 's1', name: 'Karim', teacher_id: 't1' }],
      error: null,
    }
    const res = await claimWithTeacherCode(PHONE, 'abcd-efgh')
    expect(mockService.rpc).toHaveBeenCalledWith('claim_by_join_code', {
      p_code: CODE,
      p_phone: NORMALIZED_PHONE,
      p_profile_id: 'payer-1',
    })
    expect(res).toMatchObject({ success: true })
  })

  it('returns a wrong-code error when the RPC rejects the code', async () => {
    state.rpc = { data: null, error: { message: 'join_code_invalid' } }
    const res = await claimWithTeacherCode(PHONE, CODE)
    expect((res as { success?: boolean }).success).toBeUndefined()
    expect((res as { error?: string }).error).toBeTruthy()
  })

  it('returns a no-match error when the phone matches nobody', async () => {
    state.rpc = { data: [], error: null }
    const res = await claimWithTeacherCode(PHONE, CODE)
    expect((res as { success?: boolean }).success).toBeUndefined()
    expect((res as { error?: string }).error).toBeTruthy()
  })

  it('returns the claimed students with the teacher name', async () => {
    state.rpc = {
      data: [
        { id: 's1', name: 'Karim', teacher_id: 't1' },
        { id: 's2', name: 'Layla', teacher_id: 't1' },
      ],
      error: null,
    }
    const res = await claimWithTeacherCode(PHONE, CODE)
    expect(res).toEqual({
      success: true,
      claimed: [
        { studentId: 's1', studentName: 'Karim', teacherId: 't1', teacherName: 'Sheikh Ali' },
        { studentId: 's2', studentName: 'Layla', teacherId: 't1', teacherName: 'Sheikh Ali' },
      ],
    })
  })

  it('never writes students directly (linking is the RPC; rotation-safe)', async () => {
    state.rpc = { data: [{ id: 's1', name: 'Karim', teacher_id: 't1' }], error: null }
    await claimWithTeacherCode(PHONE, CODE)
    expect(state.tables).not.toContain('students')
    expect(state.tables).not.toContain('claim_tokens')
  })
})
