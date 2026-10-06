import { describe, it, expect, vi, beforeEach } from 'vitest'

// PWA launch target: role-aware routing with an install-audience fallback.
let userResult: { data: { user: unknown } }
let teacherResult: { data: unknown }
let audienceCookie: string | undefined

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: vi.fn(async () => userResult) } })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => teacherResult }) }),
    }),
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'alhalaqa_audience' && audienceCookie ? { value: audienceCookie } : undefined,
  })),
}))

function locationOf(res: Response): string {
  return res.headers.get('Location') ?? ''
}

beforeEach(() => {
  vi.clearAllMocks()
  userResult = { data: { user: null } }
  teacherResult = { data: null }
  audienceCookie = undefined
})

describe('GET /start (PWA launch)', () => {
  it('sends a signed-in teacher to the dashboard', async () => {
    userResult = { data: { user: { id: 'u1' } } }
    teacherResult = { data: { id: 't1' } }
    const { GET } = await import('@/app/start/route')
    const res = await GET(new Request('https://x.test/start'))
    expect(locationOf(res)).toBe('https://x.test/dashboard')
  })

  it('sends a signed-in payer to the pay hub', async () => {
    userResult = { data: { user: { id: 'u1' } } }
    teacherResult = { data: null }
    const { GET } = await import('@/app/start/route')
    const res = await GET(new Request('https://x.test/start'))
    expect(locationOf(res)).toBe('https://x.test/pay')
  })

  it('signed out with a teacher audience cookie goes to teacher login', async () => {
    audienceCookie = 'teacher'
    const { GET } = await import('@/app/start/route')
    const res = await GET(new Request('https://x.test/start'))
    expect(locationOf(res)).toBe('https://x.test/auth/login')
  })

  it('signed out defaults to the payer surface', async () => {
    audienceCookie = 'payer'
    const { GET } = await import('@/app/start/route')
    const res = await GET(new Request('https://x.test/start'))
    expect(locationOf(res)).toBe('https://x.test/pay')
  })
})
