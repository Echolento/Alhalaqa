import { describe, it, expect, vi } from 'vitest'

function createBuilder() {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn(() => builder),
  }
  return builder
}

const mockSupabase = {
  auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })) },
  from: vi.fn(() => {
    const b = createBuilder()
    b.single = vi.fn(() => Promise.resolve({ data: { full_name: 'معلم' } }))
    b.insert = vi.fn(() => Promise.resolve({ error: null }))
    return b
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockSupabase),
}))

// Webhook fetch hangs forever — logActivity must NOT wait on it.
let releaseWebhook!: () => void
vi.mock('@/lib/discord-webhook', () => ({
  sendDiscordWebhook: vi.fn(
    () => new Promise<void>((resolve) => { releaseWebhook = resolve })
  ),
}))

describe('logActivity never blocks on webhook', () => {
  it('resolves while webhook still pending', async () => {
    const { logActivity } = await import('@/lib/log-activity')
    const pending = logActivity({ actionType: 'payment_toggle', entityType: 'student_payment' })
    const winner = await Promise.race([
      pending.then(() => 'resolved'),
      new Promise((r) => setTimeout(() => r('timeout'), 2000)),
    ])
    releaseWebhook()
    await pending
    expect(winner).toBe('resolved')
  })
})
