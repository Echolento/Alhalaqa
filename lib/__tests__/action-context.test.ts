// lib/__tests__/action-context.test.ts
// requireUser — the single auth preamble every server action now runs.
// Locks the "no session => Unauthorized" contract and the context shape.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSupabase = { auth: { getUser: mockGetUser } }
const mockServiceSentinel = { tag: 'service-client' }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockServiceSentinel),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireUser', () => {
  it('returns the session user, anon client, and a service client when authed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const { requireUser } = await import('@/lib/action-context')

    const ctx = await requireUser()

    expect('error' in ctx).toBe(false)
    if (!('error' in ctx)) {
      expect(ctx.user).toEqual({ id: 'u1' })
      expect(ctx.supabase).toBe(mockSupabase)
      expect(ctx.service).toBe(mockServiceSentinel)
    }
  })

  it('returns the Unauthorized shape when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { requireUser } = await import('@/lib/action-context')

    const ctx = await requireUser()

    expect(ctx).toEqual({ error: 'Unauthorized' })
  })
})
