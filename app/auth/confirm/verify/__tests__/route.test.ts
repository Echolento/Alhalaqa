import { describe, it, expect, vi, beforeEach } from 'vitest'

// The token is consumed ONLY here, via POST from the confirm page's button.
let verifyResult: { error: unknown; data?: unknown }
let getUserResult: { data: { user: unknown } }

const mockSupabase = {
  auth: {
    verifyOtp: vi.fn(async () => verifyResult),
    getUser: vi.fn(async () => getUserResult),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

const mockService = {
  from: vi.fn(() => {
    const builder: Record<string, any> = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      update: vi.fn(() => builder),
      upsert: vi.fn(async () => ({ error: null })),
      single: vi.fn(async () => ({ data: { role: 'student' } })),
      maybeSingle: vi.fn(async () => ({ data: { default_monthly_price: 0 } })),
    }
    return builder
  }),
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

function post(fields: Record<string, string>): Request {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return new Request('https://x.test/auth/confirm/verify', { method: 'POST', body: fd })
}

function locationOf(res: Response): string {
  return res.headers.get('Location') ?? ''
}

beforeEach(() => {
  vi.clearAllMocks()
  verifyResult = { error: null, data: { user: { id: 'user-1' } } }
  getUserResult = { data: { user: null } }
})

describe('POST /auth/confirm/verify (consumes the token on a gesture)', () => {
  it('verifies token_hash and redirects to the next destination', async () => {
    const { POST } = await import('@/app/auth/confirm/verify/route')
    const res = await POST(post({ token_hash: 'abc', type: 'email', next: '/welcome' }))
    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'abc' })
    expect(locationOf(res)).toBe('https://x.test/welcome')
    expect(res.status).toBe(303)
  })

  it('payer flow never bootstraps teacher identity', async () => {
    const { POST } = await import('@/app/auth/confirm/verify/route')
    const res = await POST(post({ token_hash: 'abc', type: 'email', next: '/claim?token=tok' }))
    expect(locationOf(res)).toBe('https://x.test/claim?token=tok')
    const tables = mockService.from.mock.calls.map((c) => c[0] as string)
    expect(tables).not.toContain('teachers')
  })

  it('accepts an absolute same-origin next', async () => {
    const { POST } = await import('@/app/auth/confirm/verify/route')
    const res = await POST(post({ token_hash: 'abc', type: 'email', next: 'https://x.test/pay' }))
    expect(locationOf(res)).toBe('https://x.test/pay')
  })

  it('drops an evil next to the default', async () => {
    const { POST } = await import('@/app/auth/confirm/verify/route')
    const res = await POST(post({ token_hash: 'abc', type: 'email', next: 'https://evil.com' }))
    expect(locationOf(res)).toBe('https://x.test/welcome')
  })

  it('continues when the link was already used but a session exists', async () => {
    verifyResult = { error: { message: 'One-time token not found' } }
    getUserResult = { data: { user: { id: 'user-1' } } }
    const { POST } = await import('@/app/auth/confirm/verify/route')
    const res = await POST(
      post({ token_hash: 'abc', type: 'recovery', next: '/auth/update-password' }),
    )
    expect(locationOf(res)).toBe('https://x.test/auth/update-password')
  })

  it('redirects to error (carrying next) when verify fails and no session', async () => {
    verifyResult = { error: { message: 'expired' } }
    getUserResult = { data: { user: null } }
    const { POST } = await import('@/app/auth/confirm/verify/route')
    const res = await POST(post({ token_hash: 'abc', type: 'email', next: '/pay' }))
    expect(locationOf(res)).toContain('/auth/error?reason=confirm_failed')
    expect(decodeURIComponent(locationOf(res))).toContain('next=/pay')
  })

  it('redirects to error when token_hash is missing', async () => {
    const { POST } = await import('@/app/auth/confirm/verify/route')
    const res = await POST(post({ type: 'email' }))
    expect(mockSupabase.auth.verifyOtp).not.toHaveBeenCalled()
    expect(locationOf(res)).toContain('/auth/error?reason=confirm_failed')
  })
})
