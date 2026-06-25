import { describe, it, expect, vi, beforeEach } from 'vitest'

function createBuilder() {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
  }
  return builder
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => createBuilder()),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
  })
})

describe('registerPushSubscription', () => {
  it('saves subscription to push_subscriptions table', async () => {
    let upsertPayload: any
    mockSupabase.from.mockImplementation((_table?: string) => {
      const b = createBuilder()
      b.upsert = vi.fn().mockImplementation((data: any, _opts: any) => {
        if (_table === 'push_subscriptions') upsertPayload = data
        return { ...b }
      })
      return b
    })

    const { registerPushSubscription } = await import('@/lib/push-actions')
    const result = await registerPushSubscription({
      endpoint: 'https://example.com/push',
      keys: { p256dh: 'abc123', auth: 'def456' },
    })

    expect(result.success).toBe(true)
    expect(upsertPayload.profile_id).toBe('user-1')
    expect(upsertPayload.endpoint).toBe('https://example.com/push')
    expect(upsertPayload.p256dh).toBe('abc123')
    expect(upsertPayload.auth).toBe('def456')
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { registerPushSubscription } = await import('@/lib/push-actions')
    const result = await registerPushSubscription({
      endpoint: 'https://example.com/push',
      keys: { p256dh: 'abc', auth: 'def' },
    })
    expect(result.error).toBe('Unauthorized')
  })
})

describe('unregisterPushSubscription', () => {
  it('deletes subscription for current user', async () => {
    let deletedProfileId = ''
    mockSupabase.from.mockImplementation((_table?: string) => {
      const b = createBuilder()
      b.delete = vi.fn().mockReturnValue({
        ...b,
        eq: vi.fn().mockImplementation((_col: string, val: string) => {
          if (_table === 'push_subscriptions') deletedProfileId = val
          return Promise.resolve({ error: null })
        }),
      })
      return b
    })

    const { unregisterPushSubscription } = await import('@/lib/push-actions')
    const result = await unregisterPushSubscription()

    expect(result.success).toBe(true)
    expect(deletedProfileId).toBe('user-1')
  })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { unregisterPushSubscription } = await import('@/lib/push-actions')
    expect((await unregisterPushSubscription()).error).toBe('Unauthorized')
  })
})
