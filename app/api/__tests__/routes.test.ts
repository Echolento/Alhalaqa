import { describe, it, expect, vi, beforeEach } from 'vitest'

function createBuilder() {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
  }
  return builder
}

const mockSupabase = {
  auth: {
    exchangeCodeForSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(() => createBuilder()),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/teachers/[id]/display', () => {
  it('returns teacher full name on success', async () => {
    const { GET } = await import('@/app/api/teachers/[id]/display/route')
    const mockData = { profile: { full_name: 'أحمد علي' } }

    const builder = createBuilder()
    builder.single.mockResolvedValue({ data: mockData, error: null })
    mockSupabase.from.mockReturnValue(builder)
    builder.select.mockReturnValue(builder)
    builder.eq.mockReturnValue(builder)

    const response = await GET(new Request('http://localhost'), { params: { id: 'teacher-1' } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.full_name).toBe('أحمد علي')
  })

  it('returns 404 when teacher not found', async () => {
    const { GET } = await import('@/app/api/teachers/[id]/display/route')

    const builder = createBuilder()
    builder.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
    mockSupabase.from.mockReturnValue(builder)
    builder.select.mockReturnValue(builder)
    builder.eq.mockReturnValue(builder)

    const response = await GET(new Request('http://localhost'), { params: { id: 'nonexistent' } })
    expect(response.status).toBe(404)
  })
})

describe('GET /auth/callback', () => {
  it('redirects on successful code exchange', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null })

    const url = new URL('http://localhost/auth/callback?code=valid-code')
    const response = await GET(new Request(url))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/dashboard')
  })

  it('redirects to error page on failure', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid' } })

    const url = new URL('http://localhost/auth/callback?code=bad-code')
    const response = await GET(new Request(url))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/error')
  })

  it('redirects to error page when no code provided', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const response = await GET(new Request('http://localhost/auth/callback'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/error')
  })
})
