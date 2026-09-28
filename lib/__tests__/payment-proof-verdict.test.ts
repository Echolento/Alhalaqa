// lib/__tests__/payment-proof-verdict.test.ts
// #34 slice 6/8 — verdict actions (verify / reject) + payer verdict push.
// STATUS: UNVERIFIED — written test-first, never executed (ZERO-shell lane).
// Pending shell: `npm run test -- lib/__tests__/payment-proof-verdict.test.ts`
// Push/storage mocked at boundaries; frozen URL contracts asserted
// (payScreenUrl + unpaidQueueItemUrl from lib/push-payloads.ts).

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --------------------------------------------------------------------------
// Mocks (boundaries only — ownership + payload builders stay real)
// --------------------------------------------------------------------------

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

const mockService: any = {
  from: vi.fn(),
  storage: { from: vi.fn() },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => mockService),
}))

const mockSendPush = vi.fn()
vi.mock('@/lib/push', () => ({
  sendPushNotification: (...args: any[]) => mockSendPush(...args),
}))

const mockLog = vi.fn()
vi.mock('@/lib/log-activity', () => ({
  logActivity: (...args: any[]) => mockLog(...args),
}))

// --------------------------------------------------------------------------
// Fixture context (mutated per test, read lazily by the router)
// --------------------------------------------------------------------------

const ctx: any = {}

function selectChain(data: any) {
  // Supports .select().eq().maybeSingle() AND .select().eq().eq().maybeSingle()
  // (the student_payments lookup chains two eq calls).
  const secondEq = {
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  }
  const firstEq: any = {
    eq: vi.fn(() => secondEq),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  }
  return {
    eq: vi.fn(() => firstEq),
  }
}

beforeEach(() => {
  vi.clearAllMocks()

  ctx.proof = {
    id: 'proof-1',
    student_id: 'stu-1',
    teacher_id: 't1',
    payer_profile_id: 'payer-1',
    period_key: '2026-09-01',
    status: 'pending',
    teacher_note: null,
  }
  ctx.student = {
    id: 'stu-1',
    teacher_id: 't1',
    name: 'أحمد',
    monthly_price: 200,
    frequency: 'monthly',
    next_due_date: '2026-09-01',
  }
  ctx.teacher = { id: 't1', default_monthly_price: 250 }
  ctx.subscription = { endpoint: 'https://push.example/payer', p256dh: 'p', auth: 'a' }
  ctx.existingPayment = null

  ctx.lastProofUpdate = null
  ctx.lastPaymentInsert = null
  ctx.lastPaymentUpdate = null
  ctx.paymentWriteCount = 0
  ctx.lastStudentUpdate = null

  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-user-1' } } })

  mockService.from.mockImplementation((table: string) => {
    if (table === 'payment_proofs') {
      return {
        select: vi.fn(() => selectChain(ctx.proof)),
        update: vi.fn((payload: any) => {
          ctx.lastProofUpdate = payload
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        }),
      }
    }
    if (table === 'students') {
      return {
        select: vi.fn(() => selectChain(ctx.student)),
        update: vi.fn((payload: any) => {
          ctx.lastStudentUpdate = payload
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        }),
      }
    }
    if (table === 'teachers') {
      return {
        select: vi.fn(() => selectChain(ctx.teacher)),
      }
    }
    if (table === 'student_payments') {
      return {
        select: vi.fn(() => selectChain(ctx.existingPayment)),
        update: vi.fn((payload: any) => {
          ctx.lastPaymentUpdate = payload
          ctx.paymentWriteCount += 1
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        }),
        insert: vi.fn((payload: any) => {
          ctx.lastPaymentInsert = payload
          ctx.paymentWriteCount += 1
          return Promise.resolve({ error: null })
        }),
      }
    }
    if (table === 'push_subscriptions') {
      return {
        select: vi.fn(() => selectChain(ctx.subscription)),
      }
    }
    return { select: vi.fn(() => selectChain(null)) }
  })

  mockSendPush.mockResolvedValue(true)
  mockLog.mockResolvedValue(undefined)
})

describe('verifyProof happy path', () => {
  it('flips proof to verified, marks the period paid, logs, and pushes the frozen pay URL', async () => {
    const { verifyProof } = await import('@/lib/payment-proof-verdict')

    const result = await verifyProof('proof-1')

    expect(result).toMatchObject({ success: true, proofId: 'proof-1' })
    // Atomic pair: proof flip + period paid.
    expect(ctx.lastProofUpdate).toMatchObject({ status: 'verified' })
    expect(ctx.lastPaymentInsert).toMatchObject({
      student_id: 'stu-1',
      month: '2026-09-01',
      paid: true,
      amount_paid: 200,
    })
    expect(ctx.lastPaymentInsert.paid_at).toBeTruthy()
    // Activity log (additive cast, never edits shared types).
    expect(mockLog).toHaveBeenCalledOnce()
    // Payer verdict push via the frozen pay-screen URL contract.
    expect(mockSendPush).toHaveBeenCalledOnce()
    const [sub, payload] = mockSendPush.mock.calls[0]
    expect(sub.endpoint).toBe('https://push.example/payer')
    expect(payload.url).toBe('/pay?student=stu-1&period=2026-09-01')
    expect(payload.body).toContain('أحمد')
  })
})

describe('verifyProof idempotency', () => {
  it('double-verify returns idempotent success with no further writes or push', async () => {
    ctx.proof = { ...ctx.proof, status: 'verified' }
    const { verifyProof } = await import('@/lib/payment-proof-verdict')

    const result = await verifyProof('proof-1')

    expect(result).toMatchObject({ success: true, idempotent: true })
    expect(ctx.lastProofUpdate).toBeNull()
    expect(ctx.paymentWriteCount).toBe(0)
    expect(mockSendPush).not.toHaveBeenCalled()
    expect(mockLog).not.toHaveBeenCalled()
  })
})

describe('rejectProof leaves the period unpaid', () => {
  it('flips proof to rejected with note, touches no payment rows, still notifies the payer', async () => {
    const { rejectProof } = await import('@/lib/payment-proof-verdict')

    const result = await rejectProof('proof-1', 'الصورة غير واضحة')

    expect(result).toMatchObject({ success: true, proofId: 'proof-1' })
    expect(ctx.lastProofUpdate).toMatchObject({
      status: 'rejected',
      teacher_note: 'الصورة غير واضحة',
    })
    // The period stays unpaid: zero writes to student_payments.
    expect(ctx.paymentWriteCount).toBe(0)
    expect(ctx.lastPaymentInsert).toBeNull()
    expect(ctx.lastPaymentUpdate).toBeNull()
    // Payer is still notified, with the teacher note + frozen pay URL.
    expect(mockSendPush).toHaveBeenCalledOnce()
    const [, payload] = mockSendPush.mock.calls[0]
    expect(payload.url).toBe('/pay?student=stu-1&period=2026-09-01')
    expect(payload.body).toContain('الصورة غير واضحة')
    expect(mockLog).toHaveBeenCalledOnce()
  })

  it('reject requires a teacher note', async () => {
    const { rejectProof } = await import('@/lib/payment-proof-verdict')

    const result = await rejectProof('proof-1', '   ')

    expect((result as { error?: string }).error).toMatch(/مطلوب/)
    expect(ctx.lastProofUpdate).toBeNull()
    expect(mockSendPush).not.toHaveBeenCalled()
  })
})

describe('wrong-teacher isolation', () => {
  it('returns Forbidden with no writes or push when the student belongs to another teacher', async () => {
    ctx.student = { ...ctx.student, teacher_id: 't-other' }
    ctx.proof = { ...ctx.proof, teacher_id: 't-other' }
    const { verifyProof } = await import('@/lib/payment-proof-verdict')

    const result = await verifyProof('proof-1')

    expect((result as { error?: string }).error).toBe('Forbidden')
    expect(ctx.lastProofUpdate).toBeNull()
    expect(ctx.paymentWriteCount).toBe(0)
    expect(mockSendPush).not.toHaveBeenCalled()
    expect(mockLog).not.toHaveBeenCalled()
  })

  it('reject is also Forbidden for the wrong teacher', async () => {
    ctx.student = { ...ctx.student, teacher_id: 't-other' }
    ctx.proof = { ...ctx.proof, teacher_id: 't-other' }
    const { rejectProof } = await import('@/lib/payment-proof-verdict')

    const result = await rejectProof('proof-1', 'غير واضح')

    expect((result as { error?: string }).error).toBe('Forbidden')
    expect(ctx.lastProofUpdate).toBeNull()
    expect(mockSendPush).not.toHaveBeenCalled()
  })
})

describe('verifyProof advances the next-due cycle', () => {
  it('moves next_due_date one interval past the settled period due', async () => {
    const { verifyProof } = await import('@/lib/payment-proof-verdict')

    const result = await verifyProof('proof-1')

    expect(result).toMatchObject({ success: true })
    expect(ctx.lastStudentUpdate).toMatchObject({ next_due_date: '2026-10-01' })
  })

  it('weekly settlement advances 7 days from the period due', async () => {
    ctx.student = { ...ctx.student, frequency: 'weekly', next_due_date: '2026-09-20' }
    ctx.proof = { ...ctx.proof, period_key: '2026-09-20' }
    const { verifyProof } = await import('@/lib/payment-proof-verdict')

    await verifyProof('proof-1')

    expect(ctx.lastStudentUpdate).toMatchObject({ next_due_date: '2026-09-27' })
  })

  it('never retreats an already-advanced date (double settle, same period)', async () => {
    ctx.student = { ...ctx.student, next_due_date: '2026-11-01' }
    const { verifyProof } = await import('@/lib/payment-proof-verdict')

    await verifyProof('proof-1')

    expect(ctx.lastStudentUpdate).toBeNull()
  })
})

describe('verdict push URL contract', () => {
  it('verified push URL equals the frozen payScreenUrl builder output', async () => {
    const { verifyProof } = await import('@/lib/payment-proof-verdict')
    const { payScreenUrl } = await import('@/lib/push-payloads')

    await verifyProof('proof-1')

    const [, payload] = mockSendPush.mock.calls[0]
    expect(payload.url).toBe(payScreenUrl('stu-1', '2026-09-01'))
  })
})
