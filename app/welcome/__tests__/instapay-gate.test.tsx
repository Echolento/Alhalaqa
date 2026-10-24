import { describe, it, expect, vi, beforeEach } from 'vitest'

// Regression: onboarding must never re-run for a teacher who already published
// an InstaPay contract. Any return leg to /welcome (the logged-in `/` funnel
// used to land there) was re-showing the "add InstaPay" step.
const state = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  teacher: null as Record<string, unknown> | null,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user } })) },
    from: () => {
      const builder: Record<string, any> = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => ({ data: state.teacher })),
        single: vi.fn(async () => ({ data: state.teacher })),
      }
      return builder
    },
  })),
}))

// Real `redirect` throws to stop rendering; the shared test setup stubs it as a
// no-op, which would let the page run past its guard. Mirror the real contract.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/welcome',
  useSearchParams: () => new URLSearchParams(),
}))

/** Runs the server component and returns the path it redirected to (or null). */
async function redirectPathOf(loadPage: () => Promise<() => unknown>): Promise<string | null> {
  const Page = await loadPage()
  try {
    await Page()
    return null
  } catch (err) {
    const match = /^NEXT_REDIRECT:(\S+)$/.exec((err as Error).message)
    if (!match) throw err
    return match[1]
  }
}

beforeEach(() => {
  state.user = { id: 'u1' }
  state.teacher = {
    id: 't1',
    default_monthly_price: 200,
    instapay_link: 'https://ipn.eg/S/hmza/instapay/1',
    instapay_handle: 'hmza@instapay',
  }
})

const loadInstapayPage = async () => (await import('@/app/welcome/instapay/page')).default
const loadWelcomePage = async () => (await import('@/app/welcome/page')).default

describe('/welcome/instapay completion gate', () => {
  it('sends a teacher who already set InstaPay to the dashboard', async () => {
    expect(await redirectPathOf(loadInstapayPage)).toBe('/dashboard')
  }, 30000)

  it('still shows the step when no contract exists yet', async () => {
    state.teacher = { id: 't1', default_monthly_price: 200, instapay_link: null, instapay_handle: null }
    expect(await redirectPathOf(loadInstapayPage)).toBeNull()
  }, 30000)

  it('sends a teacher without a teacher row back to step 1', async () => {
    state.teacher = null
    expect(await redirectPathOf(loadInstapayPage)).toBe('/welcome')
  }, 30000)
})

describe('/welcome completion gate', () => {
  it('sends a contracted teacher straight to the dashboard (not step 2)', async () => {
    expect(await redirectPathOf(loadWelcomePage)).toBe('/dashboard')
  }, 30000)

  it('sends a basics-done teacher with no contract on to step 2', async () => {
    state.teacher = { id: 't1', default_monthly_price: 200, instapay_link: null, instapay_handle: null }
    expect(await redirectPathOf(loadWelcomePage)).toBe('/welcome/instapay')
  }, 30000)

  it('leaves a teacher with no price on step 1', async () => {
    state.teacher = { id: 't1', default_monthly_price: 0, instapay_link: null, instapay_handle: null }
    expect(await redirectPathOf(loadWelcomePage)).toBeNull()
  }, 30000)
})
