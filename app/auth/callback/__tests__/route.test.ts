import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mutable fixtures per test.
let profileResult: unknown
let teacherResult: unknown

function chain(result: unknown) {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(async () => ({ error: null })),
    single: vi.fn(async () => ({ data: result })),
    maybeSingle: vi.fn(async () => ({ data: result })),
  }
  return builder
}

const mockSupabase = {
  auth: {
    exchangeCodeForSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn((table: string) =>
    table === 'profiles' ? chain(profileResult) : chain(teacherResult),
  ),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

function locationOf(res: Response): string {
  return res.headers.get('Location') ?? ''
}

beforeEach(() => {
  vi.clearAllMocks()
  profileResult = { role: 'teacher' }
  teacherResult = { default_monthly_price: 0 }
  mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null })
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
  })
})

describe('GET /auth/callback', () => {
  it('redirects to error without a code', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(new Request('https://x.test/auth/callback'))
    expect(locationOf(res)).toBe('https://x.test/auth/error')
  })

  it('redirects to error when exchange fails', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: 'bad code' },
    })
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(new Request('https://x.test/auth/callback?code=nope'))
    expect(locationOf(res)).toBe('https://x.test/auth/error')
  })

  it('honors explicit next for recovery even when onboarded', async () => {
    teacherResult = { default_monthly_price: 500 }
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(
      new Request('https://x.test/auth/callback?code=ok&next=/auth/update-password'),
    )
    expect(locationOf(res)).toBe('https://x.test/auth/update-password')
  })

  it('sends new users to welcome and bootstraps teacher identity', async () => {
    profileResult = { role: 'student' }
    teacherResult = { default_monthly_price: 0 }
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(new Request('https://x.test/auth/callback?code=ok&next=/welcome'))
    expect(locationOf(res)).toBe('https://x.test/welcome')
    expect(mockSupabase.from).toHaveBeenCalledWith('teachers')
  })

  it('sends already-onboarded users to dashboard on default welcome', async () => {
    teacherResult = { default_monthly_price: 750 }
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(new Request('https://x.test/auth/callback?code=ok&next=/welcome'))
    expect(locationOf(res)).toBe('https://x.test/dashboard')
  })

  it('sanitizes evil next to welcome', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const res = await GET(
      new Request('https://x.test/auth/callback?code=ok&next=https://evil.com'),
    )
    expect(locationOf(res)).toBe('https://x.test/welcome')
  })
})
