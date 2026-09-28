// lib/__tests__/claim-phone.test.ts
// A2 slice — payer-owned phone correction (updateClaimedPhone).
// Mocks at boundaries only (supabase server/service); phone-utils stays real.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateClaimedPhone } from '@/lib/claim-actions'

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
  b.update = vi.fn((row: unknown) => {
    ctx.updates[table] = [...(ctx.updates[table] ?? []), row]
    return b
  })
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: ctx.rows[table] ?? null }))
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

const PAYER_USER = 'payer-user-1'
const OTHER_USER = 'other-user-9'
const STUDENT_ID = 'stu-1'

beforeEach(() => {
  vi.clearAllMocks()
  ctx.rows = {}
  ctx.updates = {}
})

function ownStudent() {
  ctx.rows.students = { id: STUDENT_ID, claimed_by: PAYER_USER, phone: '+201000000000' }
}

describe('updateClaimedPhone', () => {
  it('rejects without a session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await updateClaimedPhone(STUDENT_ID, '01012345678')
    expect((res as { error?: string }).error).toBeTruthy()
    expect(ctx.updates.students ?? []).toHaveLength(0)
  })

  it('rejects when the caller does not own the row', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: OTHER_USER } } })
    ownStudent()
    const res = await updateClaimedPhone(STUDENT_ID, '01012345678')
    expect((res as { error?: string }).error).toBeTruthy()
    expect(ctx.updates.students ?? []).toHaveLength(0)
  })

  it('rejects an invalid phone without writing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    ownStudent()
    const res = await updateClaimedPhone(STUDENT_ID, '12345')
    expect((res as { error?: string }).error).toBeTruthy()
    expect(ctx.updates.students ?? []).toHaveLength(0)
  })

  it('normalizes and stores a valid Egyptian phone for the owner', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    ownStudent()
    const res = await updateClaimedPhone(STUDENT_ID, '01012345678')
    expect((res as { success?: boolean }).success).toBe(true)
    expect((res as { phone?: string }).phone).toBe('+201012345678')
    expect(ctx.updates.students ?? []).toHaveLength(1)
  })
})
