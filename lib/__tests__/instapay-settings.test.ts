import { describe, it, expect, vi, beforeEach } from 'vitest'

function createBuilder() {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
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

const mockService = {
  from: vi.fn(() => createBuilder()),
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/log-activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}))

function createFormData(values: Record<string, string>): FormData {
  const fd = new FormData()
  Object.entries(values).forEach(([k, v]) => fd.append(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
  })
  mockService.from.mockImplementation(() => {
    const b = createBuilder()
    b.upsert = vi.fn().mockResolvedValue({ error: null })
    return b
  })
})

describe('updateTeacherSettings InstaPay', () => {
  it('rejects a lookalike InstaPay link with an Arabic explanation', async () => {
    const { updateTeacherSettings } = await import('@/lib/auth-actions')
    const result = await updateTeacherSettings(
      createFormData({
        default_monthly_price: '150',
        instapay_link: 'https://ipn-eg.com/S/abc123',
      }),
    )
    expect(result.error).toMatch(/ipn\.eg/)
    expect(mockService.from).not.toHaveBeenCalled()
  })

  it('derives the handle from the share link path and saves it', async () => {
    let upsertPayload: any = null
    mockService.from.mockImplementation((table?: string) => {
      const b = createBuilder()
      b.upsert = vi.fn().mockImplementation((data: any) => {
        if (table === 'teachers') upsertPayload = data
        return Promise.resolve({ error: null })
      })
      return b
    })

    const { updateTeacherSettings } = await import('@/lib/auth-actions')
    const { getInstaPayContract } = await import('@/lib/instapay')
    const result = await updateTeacherSettings(
      createFormData({
        default_monthly_price: '150',
        instapay_link: 'https://ipn.eg/S/ahmed.ali/instapay/12345',
      }),
    )
    expect(result.success).toBe(true)
    expect(upsertPayload.instapay_link).toBe('https://ipn.eg/S/ahmed.ali/instapay/12345')
    expect(upsertPayload.instapay_handle).toBe('ahmed.ali@instapay')
    const contract = getInstaPayContract({
      instapay_link: upsertPayload.instapay_link,
      instapay_handle: upsertPayload.instapay_handle,
    })
    expect(contract.instapayLink).toBe('https://ipn.eg/S/ahmed.ali/instapay/12345')
    expect(contract.instapayHandle).toBe('ahmed.ali@instapay')
  })

  it('leaves the handle null when the link path does not parse', async () => {
    let upsertPayload: any = null
    mockService.from.mockImplementation((table?: string) => {
      const b = createBuilder()
      b.upsert = vi.fn().mockImplementation((data: any) => {
        if (table === 'teachers') upsertPayload = data
        return Promise.resolve({ error: null })
      })
      return b
    })

    const { updateTeacherSettings } = await import('@/lib/auth-actions')
    const result = await updateTeacherSettings(
      createFormData({
        default_monthly_price: '150',
        instapay_link: 'https://ipn.eg/S/-/instapay/12345',
      }),
    )
    expect(result.success).toBe(true)
    expect(upsertPayload.instapay_handle).toBeNull()
  })
})
