// lib/__tests__/billing-cycle.test.ts
// advanceStudentCycle — the one-way next-due ratchet. Moved out of the
// proof-verdict action file; these lock the behavior in its new home.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const ctx: any = {}

const mockService: any = {
  from: vi.fn((table: string) => {
    if (table === 'students') {
      return {
        update: vi.fn((payload: any) => {
          ctx.lastStudentUpdate = payload
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        }),
      }
    }
    return {}
  }),
}

beforeEach(() => {
  vi.clearAllMocks()
  ctx.lastStudentUpdate = null
})

describe('advanceStudentCycle', () => {
  it('advances one interval past the settled period when the stored due is at/before it', async () => {
    const { advanceStudentCycle } = await import('@/lib/billing-cycle')

    const next = await advanceStudentCycle(
      mockService,
      'stu-1',
      '2026-09-01',
      'monthly',
      '2026-09-01',
    )

    expect(next).toBe('2026-10-01')
    expect(ctx.lastStudentUpdate).toEqual({ next_due_date: '2026-10-01' })
  })

  it('treats a null stored due as "advance from the settled period" (legacy rows)', async () => {
    const { advanceStudentCycle } = await import('@/lib/billing-cycle')

    const next = await advanceStudentCycle(mockService, 'stu-1', '2026-09-20', 'weekly', null)

    expect(next).toBe('2026-09-27')
    expect(ctx.lastStudentUpdate).toEqual({ next_due_date: '2026-09-27' })
  })

  it('never retreats an already-advanced date (returns null, no write)', async () => {
    const { advanceStudentCycle } = await import('@/lib/billing-cycle')

    const next = await advanceStudentCycle(
      mockService,
      'stu-1',
      '2026-09-01',
      'monthly',
      '2026-11-01',
    )

    expect(next).toBeNull()
    expect(ctx.lastStudentUpdate).toBeNull()
  })

  it('defaults unknown frequency to monthly', async () => {
    const { advanceStudentCycle } = await import('@/lib/billing-cycle')

    const next = await advanceStudentCycle(mockService, 'stu-1', '2026-09-01', undefined, '2026-09-01')

    expect(next).toBe('2026-10-01')
  })
})
