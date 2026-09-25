import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.CRON_SECRET = 'test-secret'
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub-test'
process.env.VAPID_PRIVATE_KEY = 'priv-test'

const mockSendEmail = vi.fn()
const mockSendPush = vi.fn()

vi.mock('@/lib/email-actions', () => ({
  sendOverdueEmail: (...args: any[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/push', () => ({
  sendPushNotification: (...args: any[]) => mockSendPush(...args),
}))

// September = Cairo UTC+3. Hours below pin exact Cairo trigger windows.
const AT_08 = new Date('2026-09-24T05:00:00Z') // 08:00 Cairo
const AT_10 = new Date('2026-09-24T07:00:00Z') // 10:00 Cairo
const AT_20 = new Date('2026-09-24T17:00:00Z') // 20:00 Cairo
const AT_03 = new Date('2026-09-24T00:00:00Z') // 03:00 Cairo (dead hour)

type TableData = {
  teachersList: any[]
  studentsList: any[]
  paymentsList: any[]
  proofsList: any[]
  subscriptionByProfile: Record<string, any>
  claimRows: any[] | null // null = claim succeeds; [] = already fired
}

let tableData: TableData

function makeBuilder(table: string): any {
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder.upsert = vi.fn(() => ({
    select: vi.fn(() =>
      Promise.resolve({ data: tableData.claimRows ?? [{ trigger: 'x' }], error: null }),
    ),
  }))
  builder.maybeSingle = vi.fn(() => {
    if (table === 'push_subscriptions') {
      return Promise.resolve({ data: null })
    }
    return Promise.resolve({ data: null })
  })
  builder.then = (resolve: any) => {
    let data: any[] = []
    if (table === 'teachers') data = tableData.teachersList
    else if (table === 'students') data = tableData.studentsList
    else if (table === 'student_payments') data = tableData.paymentsList
    else if (table === 'payment_proofs') data = tableData.proofsList
    return Promise.resolve({ data }).then(resolve)
  }
  return builder
}

// push_subscriptions needs profile-scoped answers: capture the last eq call.
const mockService: any = {
  from: vi.fn((table: string) => {
    const builder = makeBuilder(table)
    if (table === 'push_subscriptions') {
      const calls: Array<{ col: string; val: unknown }> = []
      builder.eq = vi.fn((col: string, val: unknown) => {
        calls.push({ col, val })
        return builder
      })
      builder.maybeSingle = vi.fn(() => {
        const profile = calls.find((c) => c.col === 'profile_id')?.val as string
        return Promise.resolve({
          data: tableData.subscriptionByProfile[profile] ?? null,
        })
      })
    }
    return builder
  }),
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
  },
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

const TEACHER_SUB = { endpoint: 'https://push.example/teacher', p256dh: 'p', auth: 'a' }
const PAYER_SUB = { endpoint: 'https://push.example/payer', p256dh: 'p', auth: 'a' }

function baseData(): TableData {
  return {
    teachersList: [{ id: 't1', profile_id: 'prof-1', default_monthly_price: 200, currency: 'EGP' }],
    studentsList: [
      {
        id: 's1',
        name: 'أحمد',
        phone: '+2010',
        monthly_price: 200,
        payment_day: 5,
        frequency: 'monthly',
        claimed_by: 'payer-1',
      },
    ],
    paymentsList: [],
    proofsList: [],
    subscriptionByProfile: { 'prof-1': TEACHER_SUB, 'payer-1': PAYER_SUB },
    claimRows: null,
  }
}

function authedReq() {
  return new Request('http://localhost/api/cron', {
    headers: { authorization: 'Bearer test-secret' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  process.env.CRON_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub-test'
  process.env.VAPID_PRIVATE_KEY = 'priv-test'
  tableData = baseData()
  mockService.auth.admin.getUserById.mockResolvedValue({
    data: { user: { email: 't@example.com' } },
  })
  mockSendEmail.mockResolvedValue({ sent: true })
  mockSendPush.mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/cron (timing engine)', () => {
  it('rejects without the cron secret', async () => {
    const { GET } = await import('@/app/api/cron/route')
    const res = await GET(new Request('http://localhost/api/cron'))
    expect(res.status).toBe(401)
  })

  it('10:00 nags the claimed overdue payer, skips email', async () => {
    vi.setSystemTime(AT_10)
    const { GET } = await import('@/app/api/cron/route')
    const body = await (await GET(authedReq())).json()

    expect(body.triggers).toContain('payer_nag')
    // Nag + escalation share the 10:00 run: one payer push, one teacher push.
    const payerCalls = mockSendPush.mock.calls.filter(
      ([sub]: any[]) => sub.endpoint === 'https://push.example/payer',
    )
    expect(payerCalls.length).toBe(1)
    expect(payerCalls[0][1].url).toContain('/pay?student=s1')
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(body.results[0].triggers.payer_nag.sent).toBe(1)
  })

  it('10:00 skips unclaimed payers and pending-review rows', async () => {
    vi.setSystemTime(AT_10)
    tableData.studentsList = [
      { ...tableData.studentsList[0], id: 's1', claimed_by: null },
      {
        id: 's2',
        name: 'ليلى',
        phone: '+2011',
        monthly_price: 200,
        payment_day: 5,
        frequency: 'monthly',
        claimed_by: 'payer-2',
      },
    ]
    tableData.proofsList = [{ student_id: 's2', period_key: '2026-09-01' }]
    tableData.subscriptionByProfile['payer-2'] = PAYER_SUB

    const { GET } = await import('@/app/api/cron/route')
    const body = await (await GET(authedReq())).json()

    const payerCalls = mockSendPush.mock.calls.filter(
      ([sub]: any[]) => (sub.endpoint as string).includes('/payer'),
    )
    expect(payerCalls.length).toBe(0)
    expect(body.results[0].triggers.payer_nag.sent).toBe(0)
    expect(body.results[0].triggers.payer_nag.skipped).toBe(2)
  })

  it('10:00 escalates to the teacher from overdue day 3', async () => {
    vi.setSystemTime(AT_10)
    // payment_day 5, today Sep 24 → 19 days overdue. Default fixture suffices.
    const { GET } = await import('@/app/api/cron/route')
    const body = await (await GET(authedReq())).json()

    expect(body.triggers).toContain('escalation')
    const teacherCalls = mockSendPush.mock.calls.filter(
      ([sub]: any[]) => sub.endpoint === 'https://push.example/teacher',
    )
    expect(teacherCalls.length).toBe(1)
    expect(teacherCalls[0][1].title).toContain('تدخلك')
  })

  it('08:00 sends email + morning digest, no payer nags', async () => {
    vi.setSystemTime(AT_08)
    const { GET } = await import('@/app/api/cron/route')
    const body = await (await GET(authedReq())).json()

    expect(body.triggers).toContain('digest_morning')
    expect(body.triggers).not.toContain('payer_nag')
    expect(mockSendEmail).toHaveBeenCalledOnce()
    const teacherCalls = mockSendPush.mock.calls.filter(
      ([sub]: any[]) => sub.endpoint === 'https://push.example/teacher',
    )
    expect(teacherCalls.length).toBe(1)
    expect(teacherCalls[0][1].title).toBe('ملخص الصباح')
  })

  it('20:00 sends evening digest push only, no email', async () => {
    vi.setSystemTime(AT_20)
    const { GET } = await import('@/app/api/cron/route')
    const body = await (await GET(authedReq())).json()

    expect(body.triggers).toContain('digest_evening')
    expect(mockSendEmail).not.toHaveBeenCalled()
    expect(mockSendPush).toHaveBeenCalledOnce()
    expect(mockSendPush.mock.calls[0][1].title).toBe('ملخص المساء')
  })

  it('dead hour fires nothing', async () => {
    vi.setSystemTime(AT_03)
    const { GET } = await import('@/app/api/cron/route')
    const body = await (await GET(authedReq())).json()

    expect(body.triggers).toEqual([])
    expect(mockSendPush).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('already-fired markers skip without doubles', async () => {
    vi.setSystemTime(AT_10)
    tableData.claimRows = []
    const { GET } = await import('@/app/api/cron/route')
    const body = await (await GET(authedReq())).json()

    expect(body.results[0].triggers.payer_nag.skipped).toBe('already_fired')
    expect(mockSendPush).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('VAPID absent skips pushes but morning email still sends', async () => {
    vi.setSystemTime(AT_08)
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
    const { GET } = await import('@/app/api/cron/route')
    const body = await (await GET(authedReq())).json()

    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendPush).not.toHaveBeenCalled()
    expect(body.results[0].triggers.digest_morning.push.reason).toBe('vapid_not_configured')
  })
})
