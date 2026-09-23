import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.CRON_SECRET = 'test-secret'
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub-test'
process.env.VAPID_PRIVATE_KEY = 'priv-test'

const mockSendEmail = vi.fn()
const mockSendPush = vi.fn()
const mockGetOverdue = vi.fn()

vi.mock('@/lib/email-actions', () => ({
  sendOverdueEmail: (...args: any[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/push', () => ({
  sendPushNotification: (...args: any[]) => mockSendPush(...args),
}))

vi.mock('@/lib/overdue', () => ({
  getOverdueStudents: (...args: any[]) => mockGetOverdue(...args),
}))

vi.mock('@/lib/billing-period', () => ({
  getBillingMonthKey: () => '2026-09-01',
  getPeriodKey: () => '2026-09-01',
}))

type TableData = {
  teachersList: any[]
  studentsList: any[]
  paymentsList: any[]
  subscription: any | null
}

let tableData: TableData = {
  teachersList: [],
  studentsList: [],
  paymentsList: [],
  subscription: null,
}

function makeBuilder(table: string): any {
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(() => {
    if (table === 'push_subscriptions') return Promise.resolve({ data: tableData.subscription })
    return Promise.resolve({ data: null })
  })
  builder.then = (resolve: any) => {
    let data: any[] = []
    if (table === 'teachers') data = tableData.teachersList
    else if (table === 'students') data = tableData.studentsList
    else if (table === 'student_payments') data = tableData.paymentsList
    return Promise.resolve({ data }).then(resolve)
  }
  return builder
}

const mockService: any = {
  from: vi.fn((table: string) => makeBuilder(table)),
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
  },
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub-test'
  process.env.VAPID_PRIVATE_KEY = 'priv-test'
  tableData = {
    teachersList: [{ id: 't1', profile_id: 'prof-1', auto_reminders_enabled: true }],
    studentsList: [{ id: 's1', name: 'أحمد', payment_day: 5 }],
    paymentsList: [],
    subscription: { endpoint: 'https://push.example/x', p256dh: 'p', auth: 'a' },
  }
  mockService.auth.admin.getUserById.mockResolvedValue({ data: { user: { email: 't@example.com' } } })
  mockGetOverdue.mockReturnValue([{ id: 's1', name: 'أحمد', daysOverdue: 5 }])
  mockSendEmail.mockResolvedValue({ sent: true })
  mockSendPush.mockResolvedValue(true)
})

describe('GET /api/cron (push fan-out)', () => {
  it('sends teacher digest push plus email when VAPID configured', async () => {
    const { GET } = await import('@/app/api/cron/route')
    const req = new Request('http://localhost/api/cron', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendPush).toHaveBeenCalledOnce()
    const [sub, payload] = mockSendPush.mock.calls[0]
    expect(sub.endpoint).toBe('https://push.example/x')
    expect(payload.title).toContain('تذكير')
    expect(payload.url).toBe('/dashboard')
    expect(body.sent).toBe(1)
  })

  it('skips push with logged reason when VAPID absent but still sends email', async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { GET } = await import('@/app/api/cron/route')
    const req = new Request('http://localhost/api/cron', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendPush).not.toHaveBeenCalled()
    expect(body.sent).toBe(1)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('VAPID'))
    logSpy.mockRestore()
  })

  it('honours auto-reminders toggle off: email sent, push skipped', async () => {
    tableData.teachersList = [{ id: 't1', profile_id: 'prof-1', auto_reminders_enabled: false }]

    const { GET } = await import('@/app/api/cron/route')
    const req = new Request('http://localhost/api/cron', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendPush).not.toHaveBeenCalled()
    expect(body.sent).toBe(1)
    expect(body.results[0].push.reason).toBe('auto_reminders_disabled')
  })

  it('skips push when teacher has no subscription but still sends email', async () => {
    tableData.subscription = null

    const { GET } = await import('@/app/api/cron/route')
    const req = new Request('http://localhost/api/cron', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendPush).not.toHaveBeenCalled()
    expect(body.sent).toBe(1)
    expect(body.results[0].push.reason).toBe('no_subscription')
  })
})
