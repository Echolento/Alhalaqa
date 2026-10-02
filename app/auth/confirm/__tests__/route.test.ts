import { describe, it, expect, vi, beforeEach } from 'vitest'

// Email-link login uses token_hash + verifyOtp (no PKCE code verifier), so it
// works when the email is opened in a different browser/WebView than the one
// that requested it. These tests pin that contract and the safe redirect.
let verifyResult: { error: unknown; data?: unknown }

const mockSupabase = {
  auth: {
    verifyOtp: vi.fn(async () => verifyResult),
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

function locationOf(res: Response): string {
  return res.headers.get('Location') ?? ''
}

beforeEach(() => {
  vi.clearAllMocks()
  verifyResult = { error: null, data: { user: { id: 'user-1' } } }
})

describe('GET /auth/confirm (email link, no verifier)', () => {
  it('verifies token_hash and redirects to the next destination', async () => {
    const { GET } = await import('@/app/auth/confirm/route')
    const res = await GET(
      new Request('https://x.test/auth/confirm?token_hash=abc&type=email&next=%2Fwelcome'),
    )
    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'abc' })
    expect(locationOf(res)).toBe('https://x.test/welcome')
  })

  it('payer flow never bootstraps teacher identity', async () => {
    const { GET } = await import('@/app/auth/confirm/route')
    const res = await GET(
      new Request(
        'https://x.test/auth/confirm?token_hash=abc&type=email&next=%2Fclaim%3Ftoken%3Dtok',
      ),
    )
    expect(locationOf(res)).toBe('https://x.test/claim?token=tok')
    const tables = mockService.from.mock.calls.map((c) => c[0] as string)
    expect(tables).not.toContain('teachers')
  })

  it('accepts an absolute same-origin next (template sends .RedirectTo)', async () => {
    const { GET } = await import('@/app/auth/confirm/route')
    const res = await GET(
      new Request(
        'https://x.test/auth/confirm?token_hash=abc&type=email&next=https%3A%2F%2Fx.test%2Fpay',
      ),
    )
    expect(locationOf(res)).toBe('https://x.test/pay')
  })

  it('drops an evil next to the default', async () => {
    const { GET } = await import('@/app/auth/confirm/route')
    const res = await GET(
      new Request(
        'https://x.test/auth/confirm?token_hash=abc&type=email&next=https%3A%2F%2Fevil.com',
      ),
    )
    expect(locationOf(res)).toBe('https://x.test/welcome')
  })

  it('redirects to error when verifyOtp fails', async () => {
    verifyResult = { error: { message: 'expired' } }
    const { GET } = await import('@/app/auth/confirm/route')
    const res = await GET(
      new Request('https://x.test/auth/confirm?token_hash=abc&type=email&next=%2Fwelcome'),
    )
    expect(locationOf(res)).toBe('https://x.test/auth/error?reason=confirm_failed')
  })

  it('redirects to error when token_hash is missing', async () => {
    const { GET } = await import('@/app/auth/confirm/route')
    const res = await GET(new Request('https://x.test/auth/confirm?type=email'))
    expect(mockSupabase.auth.verifyOtp).not.toHaveBeenCalled()
    expect(locationOf(res)).toBe('https://x.test/auth/error?reason=confirm_failed')
  })
})
