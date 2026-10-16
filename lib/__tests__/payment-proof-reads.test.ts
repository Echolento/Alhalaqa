// lib/__tests__/payment-proof-reads.test.ts
// Characterization for the proof READ paths touched in the refactor:
//   - getProofReceipt: signs the proof's REAL storage_path (the old code had a
//     dead always-failing sign + re-fetch fallback).
//   - getUnpaidQueue: teacher-scoped pending queue with signed screenshot URLs.
// Supabase + storage are mocked at the boundary; ownership + labels stay real.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSupabase = { auth: { getUser: mockGetUser } }

const ctx: any = {}

const mockService: any = {
  from: vi.fn((table: string) => {
    const c: any = {}
    c.select = vi.fn(() => c)
    c.eq = vi.fn(() => c)
    c.is = vi.fn(() => c)
    if (table === 'payment_proofs') {
      c.maybeSingle = vi.fn(async () => ({ data: ctx.proof, error: null }))
      c.order = vi.fn(async () => ({ data: ctx.queue, error: null }))
    } else if (table === 'teachers') {
      c.maybeSingle = vi.fn(async () => ({ data: ctx.teacherRow, error: null }))
    } else if (table === 'students') {
      c.maybeSingle = vi.fn(async () => ({ data: ctx.studentRow, error: null }))
      c.in = vi.fn(async () => ({ data: ctx.studentsList, error: null }))
    }
    return c
  }),
  storage: {
    from: vi.fn(() => ({
      createSignedUrl: vi.fn(async (path: string) => {
        ctx.signedPaths.push(path)
        return { data: { signedUrl: `https://signed/${path}` }, error: null }
      }),
    })),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

vi.mock('@/lib/push', () => ({ sendPushNotification: vi.fn() }))
vi.mock('@/lib/log-activity', () => ({ logActivity: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  ctx.proof = {
    id: 'proof-1',
    student_id: 'stu-1',
    teacher_id: 't1',
    payer_profile_id: 'payer-1',
    period_key: '2026-09-01',
    storage_path: 't1/stu-1/2026-09-01/123-r.jpg',
    status: 'pending',
    teacher_note: null,
  }
  ctx.teacherRow = { id: 't1' }
  ctx.studentRow = { id: 'stu-1', teacher_id: 't1', name: 'أحمد', frequency: 'monthly' }
  ctx.queue = [
    {
      id: 'proof-1',
      student_id: 'stu-1',
      period_key: '2026-09-01',
      storage_path: 't1/stu-1/2026-09-01/123-r.jpg',
      status: 'pending',
      teacher_note: null,
      created_at: '2026-09-25T10:00:00Z',
    },
  ]
  ctx.studentsList = [{ id: 'stu-1', name: 'أحمد', frequency: 'monthly' }]
  ctx.signedPaths = []

  mockGetUser.mockResolvedValue({ data: { user: { id: 'teacher-user-1' } } })
})

describe('getProofReceipt', () => {
  it('signs the proof storage_path and returns display fields', async () => {
    const { getProofReceipt } = await import('@/lib/payment-proof-verdict')

    const res: any = await getProofReceipt('proof-1')

    expect(ctx.signedPaths).toEqual(['t1/stu-1/2026-09-01/123-r.jpg'])
    expect(res.proof).toMatchObject({
      id: 'proof-1',
      studentName: 'أحمد',
      frequency: 'monthly',
      imageUrl: 'https://signed/t1/stu-1/2026-09-01/123-r.jpg',
    })
  })

  it('is Forbidden for the wrong teacher and signs nothing', async () => {
    ctx.studentRow = { ...ctx.studentRow, teacher_id: 't-other' }
    const { getProofReceipt } = await import('@/lib/payment-proof-verdict')

    const res: any = await getProofReceipt('proof-1')

    expect(res.error).toBe('Forbidden')
    expect(ctx.signedPaths).toEqual([])
  })

  it('returns not-found when the proof does not exist', async () => {
    ctx.proof = null
    const { getProofReceipt } = await import('@/lib/payment-proof-verdict')

    const res: any = await getProofReceipt('missing')

    expect(res.error).toBe('الإيصال غير موجود')
    expect(ctx.signedPaths).toEqual([])
  })

  it('returns Unauthorized with no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { getProofReceipt } = await import('@/lib/payment-proof-verdict')

    const res: any = await getProofReceipt('proof-1')

    expect(res.error).toBe('Unauthorized')
  })
})

describe('getUnpaidQueue', () => {
  it('returns teacher-scoped pending items with signed URLs and period labels', async () => {
    const { getUnpaidQueue } = await import('@/lib/payment-proof-verdict')

    const res: any = await getUnpaidQueue()

    expect(res.items).toHaveLength(1)
    expect(res.items[0]).toMatchObject({
      id: 'proof-1',
      studentId: 'stu-1',
      studentName: 'أحمد',
      storagePath: 't1/stu-1/2026-09-01/123-r.jpg',
      imageUrl: 'https://signed/t1/stu-1/2026-09-01/123-r.jpg',
      status: 'pending',
    })
    expect(res.items[0].periodLabel).toBeTruthy()
  })

  it('is Forbidden when the caller has no teacher record', async () => {
    ctx.teacherRow = null
    const { getUnpaidQueue } = await import('@/lib/payment-proof-verdict')

    const res: any = await getUnpaidQueue()

    expect(res.error).toBe('Forbidden')
    expect(ctx.signedPaths).toEqual([])
  })

  it('returns Unauthorized with no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { getUnpaidQueue } = await import('@/lib/payment-proof-verdict')

    const res: any = await getUnpaidQueue()

    expect(res.error).toBe('Unauthorized')
  })
})
