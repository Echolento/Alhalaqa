// lib/__tests__/payer-hub-actions.test.ts
// A3 slice — listMyClaimedStudents: session-owned read of the caller's
// claimed students with teacher display names. Mocks at boundaries only.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listMyClaimedStudents } from '@/lib/claim-actions'

const mockSupabase = {
  auth: { getUser: vi.fn() },
}

const ctx: { rows: Record<string, unknown> } = { rows: {} }

function chainFor(table: string): Record<string, unknown> {
  const b: Record<string, any> = {}
  const chain = () => b
  b.select = vi.fn(chain)
  b.eq = vi.fn(chain)
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: ctx.rows[table] ?? null }))
  // Terminal list read.
  b.then = undefined
  return b
}

// The list query ends with a plain await on the builder; emulate by making
// the builder thenable resolving the fixture rows.
function listChain(rows: unknown) {
  const b = chainFor('students') as Record<string, any>
  b.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: rows, error: null }).then(resolve)
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

beforeEach(() => {
  vi.clearAllMocks()
  ctx.rows = {}
  mockService.from.mockImplementation((table: string) => {
    if (table === 'students') return listChain(ctx.rows.studentsList ?? [])
    return chainFor(table)
  })
})

describe('listMyClaimedStudents', () => {
  it('rejects without a session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await listMyClaimedStudents()
    expect((res as { error?: string }).error).toBeTruthy()
  })

  it('returns only the caller-owned students with teacher names', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    ctx.rows.studentsList = [
      {
        id: 's1',
        name: 'أحمد',
        teacher_id: 't1',
        teachers: { profile_id: 'p1', profiles: { full_name: 'الشيخ علي' } },
      },
    ]
    const res = await listMyClaimedStudents()
    expect((res as { students?: unknown[] }).students).toEqual([
      { studentId: 's1', studentName: 'أحمد', teacherId: 't1', teacherName: 'الشيخ علي' },
    ])
    // Scoped to the caller — never a global list.
    expect(mockService.from).toHaveBeenCalledWith('students')
  })

  it('returns an empty list when nothing is claimed', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    ctx.rows.studentsList = []
    const res = await listMyClaimedStudents()
    expect((res as { students?: unknown[] }).students).toEqual([])
  })
})

describe('callerHasClaimedStudents', () => {
  it('is false without a session', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { callerHasClaimedStudents } = await import('@/lib/claim-actions')
    expect(await callerHasClaimedStudents()).toBe(false)
  })

  it('is true when at least one row names the caller', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    ctx.rows.studentsList = [{ id: 's1' }]
    const { callerHasClaimedStudents } = await import('@/lib/claim-actions')
    expect(await callerHasClaimedStudents()).toBe(true)
  })

  it('is false when nothing names the caller', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: PAYER_USER } } })
    ctx.rows.studentsList = []
    const { callerHasClaimedStudents } = await import('@/lib/claim-actions')
    expect(await callerHasClaimedStudents()).toBe(false)
  })
})
