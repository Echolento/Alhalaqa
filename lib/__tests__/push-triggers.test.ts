import { describe, it, expect, vi, beforeEach } from 'vitest'

function createBuilder() {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
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

const mockService: any = {
  from: vi.fn(() => createBuilder()),
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

const mockSendPush = vi.fn()

vi.mock('@/lib/push', () => ({
  sendPushNotification: (...args: any[]) => mockSendPush(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-user-1' } } })
  mockService.from.mockImplementation((table: string) => {
    const b = createBuilder()
    if (table === 'teachers') {
      b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 't1' } })
    } else if (table === 'students') {
      b.maybeSingle = vi.fn().mockResolvedValue({ data: { teacher_id: 't1' } })
    } else if (table === 'push_subscriptions') {
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: { endpoint: 'https://push.example/payer', p256dh: 'p', auth: 'a' },
      })
    }
    return b
  })
  mockSendPush.mockResolvedValue(true)
})

describe('triggerManualRemind', () => {
  it('sends payer remind via mocked transport when teacher owns the student', async () => {
    const { triggerManualRemind } = await import('@/lib/push-triggers')
    const result = await triggerManualRemind({
      studentId: 'stu-1',
      payerProfileId: 'payer-1',
      studentName: 'أحمد',
      periodKey: '2026-09-01',
    })

    expect(result.success).toBe(true)
    expect(mockSendPush).toHaveBeenCalledOnce()
    const [sub, payload] = mockSendPush.mock.calls[0]
    expect(sub.endpoint).toBe('https://push.example/payer')
    expect(payload.url).toBe('/pay?student=stu-1&period=2026-09-01')
    expect(payload.body).toContain('أحمد')
  })

  it('returns Forbidden when the student belongs to another teacher', async () => {
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder()
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 't1' } })
      } else if (table === 'students') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { teacher_id: 't-other' } })
      } else {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: null })
      }
      return b
    })

    const { triggerManualRemind } = await import('@/lib/push-triggers')
    const result = await triggerManualRemind({
      studentId: 'stu-x',
      payerProfileId: 'payer-1',
      studentName: 'أحمد',
    })

    expect(result.error).toBe('Forbidden')
    expect(mockSendPush).not.toHaveBeenCalled()
  })
})
