import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateProofFile,
  buildProofStoragePath,
  sanitizeProofFileName,
} from '@/lib/payment-proof-validation'

// --------------------------------------------------------------------------
// Pure validation slices (no mocks needed)
// --------------------------------------------------------------------------

describe('validateProofFile', () => {
  it('rejects a non-image mime type with an Arabic explanation', () => {
    const result = validateProofFile({
      fileName: 'receipt.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100_000,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/صورة/)
  })

  it('rejects an oversize image with an Arabic explanation', () => {
    const result = validateProofFile({
      fileName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 6 * 1024 * 1024,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/5MB/)
  })

  it('accepts jpeg/png/webp within the size cap', () => {
    for (const [fileName, mimeType] of [
      ['r.jpg', 'image/jpeg'],
      ['r.png', 'image/png'],
      ['r.webp', 'image/webp'],
    ] as const) {
      const result = validateProofFile({ fileName, mimeType, sizeBytes: 500_000 })
      expect(result.ok).toBe(true)
    }
  })

  it('rejects an extension/mime mismatch (renamed pdf)', () => {
    const result = validateProofFile({
      fileName: 'evil.pdf',
      mimeType: 'image/jpeg',
      sizeBytes: 10_000,
    })
    expect(result.ok).toBe(false)
  })
})

describe('buildProofStoragePath', () => {
  it('strips path traversal from the user filename', () => {
    const path = buildProofStoragePath({
      teacherId: 't1',
      studentId: 'stu-1',
      periodKey: '2026-09-01',
      fileName: '../../etc/receipt.jpg',
      nowMs: 123,
    })
    expect(path).not.toContain('..')
    expect(path.split('/').pop()).not.toContain('/')
    // Scope prefix is intact; traversal collapsed to a basename.
    expect(path.startsWith('t1/stu-1/2026-09-01/123-')).toBe(true)
    expect(sanitizeProofFileName('../../etc/receipt.jpg')).toBe('receipt.jpg')
  })
})

// --------------------------------------------------------------------------
// Server-action slices (storage + push mocked at the boundaries)
// --------------------------------------------------------------------------

function createBuilder(table: string, ctx: any): Record<string, any> {
  const builder: Record<string, any> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn((row: any) => {
      if (table === 'payment_proofs') ctx.lastInsert = row
      return builder
    }),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  }

  builder.maybeSingle.mockImplementation(() => {
    if (table === 'students') return Promise.resolve({ data: ctx.student })
    if (table === 'teachers') return Promise.resolve({ data: ctx.teacher })
    if (table === 'push_subscriptions') return Promise.resolve({ data: ctx.subscription })
    if (table === 'payment_proofs') return Promise.resolve({ data: ctx.pendingLookup ?? null })
    return Promise.resolve({ data: null })
  })
  builder.single.mockImplementation(() => {
    if (table === 'payment_proofs' && ctx.lastInsert) {
      return Promise.resolve({ data: { id: 'proof-1' } })
    }
    return Promise.resolve({ data: null })
  })
  builder.order.mockImplementation(() => {
    if (table === 'payment_proofs') return Promise.resolve({ data: ctx.history ?? [], error: null })
    return Promise.resolve({ data: [], error: null })
  })
  return builder
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

const mockUpload = vi.fn()
const mockSignedUrl = vi.fn()
const mockService: any = {
  from: vi.fn(),
  storage: {
    from: vi.fn(() => ({ upload: mockUpload, createSignedUrl: mockSignedUrl })),
  },
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

const ctx: any = {}

beforeEach(() => {
  vi.clearAllMocks()
  ctx.student = {
    id: 'stu-1',
    teacher_id: 't1',
    name: 'أحمد',
    payment_day: 5,
    frequency: 'monthly',
    monthly_price: 200,
  }
  ctx.teacher = {
    id: 't1',
    profile_id: 'teacher-1',
    currency: 'EGP',
    default_monthly_price: 200,
    instapay_link: 'https://ipn.eg/S/abc123',
    instapay_handle: 'ahmed@instapay',
  }
  ctx.subscription = { endpoint: 'https://push.example/teacher', p256dh: 'p', auth: 'a' }
  ctx.history = []
  ctx.pendingLookup = null
  ctx.lastInsert = null

  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'payer-1' } } })
  mockService.from.mockImplementation((table: string) => createBuilder(table, ctx))
  mockUpload.mockResolvedValue({ data: { path: 't1/stu-1/x.jpg' }, error: null })
  mockSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/x.jpg' } })
  mockSendPush.mockResolvedValue(true)
})

describe('uploadPaymentProof', () => {
  it('computes the period key server-side via getPeriodKey and creates a pending proof', async () => {
    const { uploadPaymentProof } = await import('@/lib/payment-proofs')
    const { getPeriodKey, normalizeFrequency } = await import('@/lib/billing-period')

    const result = await uploadPaymentProof({
      studentId: 'stu-1',
      fileName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 400_000,
      fileBytes: new Uint8Array([1, 2, 3]),
    })

    expect(result.success).toBe(true)
    const expectedPeriod = getPeriodKey(new Date(), normalizeFrequency('monthly'), 5)
    expect(ctx.lastInsert.period_key).toBe(expectedPeriod)
    expect(ctx.lastInsert.status).toBe('pending')
    expect(ctx.lastInsert.payer_profile_id).toBe('payer-1')
  })

  it('fires the teacher push with the frozen unpaid-queue URL (no real delivery)', async () => {
    const { uploadPaymentProof } = await import('@/lib/payment-proofs')

    await uploadPaymentProof({
      studentId: 'stu-1',
      fileName: 'receipt.png',
      mimeType: 'image/png',
      sizeBytes: 100_000,
      fileBytes: new Uint8Array([9]),
    })

    expect(mockSendPush).toHaveBeenCalledOnce()
    const [sub, payload] = mockSendPush.mock.calls[0]
    expect(sub.endpoint).toBe('https://push.example/teacher')
    expect(payload.url).toBe('/dashboard/unpaid?receipt=proof-1')
    expect(payload.body).toContain('أحمد')
  })

  it('returns Unauthorized without touching storage when signed out', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const { uploadPaymentProof } = await import('@/lib/payment-proofs')

    const result = await uploadPaymentProof({
      studentId: 'stu-1',
      fileName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 100_000,
      fileBytes: new Uint8Array([1]),
    })

    expect(result.error).toBe('Unauthorized')
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockSendPush).not.toHaveBeenCalled()
  })
})

describe('ownership checks', () => {
  it('rejects a wrong teacher from the teacher queue with Forbidden', async () => {
    // Student belongs to t-other; caller owns t1.
    ctx.student = { ...ctx.student, teacher_id: 't-other' }
    const { getTeacherProofQueue } = await import('@/lib/payment-proofs')

    const result = await getTeacherProofQueue('stu-1')

    expect(result.error).toBe('Forbidden')
    expect((result as any).proofs).toBeUndefined()
  })

  it('scopes payer history to own uploads (wrong payer sees nothing of others)', async () => {
    // Caller is payer-1 but the only proofs belong to payer-2: the
    // service query is scoped by payer_profile_id, so history is empty.
    // The mock builder ignores WHERE filters, so blank the teacher row to
    // force the non-owner (payer) branch in listProofHistory.
    ctx.teacher = null
    ctx.history = []
    let scopedToPayer: unknown = null
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder(table, ctx)
      if (table === 'payment_proofs') {
        const origEq = b.eq
        b.eq = vi.fn((col: string, val: unknown) => {
          if (col === 'payer_profile_id') scopedToPayer = val
          return origEq(col, val)
        })
      }
      return b
    })
    const { listProofHistory } = await import('@/lib/payment-proofs')

    const result = await listProofHistory('stu-1')

    expect(scopedToPayer).toBe('payer-1')
    expect((result as any).proofs).toEqual([])
  })

  it('returns submission history with pending/verified/rejected statuses', async () => {
    ctx.history = [
      { id: 'p1', student_id: 'stu-1', period_key: '2026-09-01', storage_path: 'a', status: 'pending', teacher_note: null, created_at: '2026-09-02T00:00:00Z' },
      { id: 'p2', student_id: 'stu-1', period_key: '2026-08-01', storage_path: 'b', status: 'verified', teacher_note: null, created_at: '2026-08-02T00:00:00Z' },
      { id: 'p3', student_id: 'stu-1', period_key: '2026-07-01', storage_path: 'c', status: 'rejected', teacher_note: 'الصورة غير واضحة', created_at: '2026-07-02T00:00:00Z' },
    ]
    // Teacher-owner branch returns the full history.
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-user-1' } } })
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder(table, ctx)
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 't1' } })
      }
      return b
    })
    const { listProofHistory } = await import('@/lib/payment-proofs')

    const result = await listProofHistory('stu-1')

    expect((result as any).proofs.map((p: any) => p.status)).toEqual([
      'pending',
      'verified',
      'rejected',
    ])
  })

  it('attaches signed view URLs so the log opens full receipts', async () => {
    ctx.history = [
      { id: 'p1', student_id: 'stu-1', period_key: '2026-09-01', storage_path: 'a', status: 'verified', teacher_note: null, created_at: '2026-09-02T00:00:00Z' },
    ]
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-user-1' } } })
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder(table, ctx)
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 't1' } })
      }
      return b
    })
    const { listProofHistory } = await import('@/lib/payment-proofs')

    const result = await listProofHistory('stu-1')

    expect((result as any).proofs[0].imageUrl).toBe('https://signed.example/x.jpg')
    expect(mockSignedUrl).toHaveBeenCalledWith('a', 3600)
  })

  it('labels history rows human-readable (month, never raw key)', async () => {
    ctx.history = [
      { id: 'p1', student_id: 'stu-1', period_key: '2026-09-01', storage_path: 'a', status: 'verified', teacher_note: null, created_at: '2026-09-02T00:00:00Z' },
    ]
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-user-1' } } })
    mockService.from.mockImplementation((table: string) => {
      const b = createBuilder(table, ctx)
      if (table === 'teachers') {
        b.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 't1' } })
      }
      return b
    })
    const { listProofHistory } = await import('@/lib/payment-proofs')

    const result = await listProofHistory('stu-1')

    expect((result as any).proofs[0].periodLabel).toContain('سبتمبر')
  })
})

describe('getPayScreenInfo', () => {
  it('returns amount due via getDuePeriodInfo plus the InstaPay contract', async () => {
    const { getPayScreenInfo } = await import('@/lib/payment-proofs')
    const { getDuePeriodInfo, normalizeFrequency } = await import('@/lib/billing-period')

    const result = await getPayScreenInfo('stu-1')
    const expected = getDuePeriodInfo(new Date(), normalizeFrequency('monthly'), 5, 200)

    expect((result as any).amount).toBe(expected.amount)
    expect((result as any).periodKey).toBe(expected.periodKey)
    expect((result as any).instapayLink).toBe('https://ipn.eg/S/abc123')
    expect((result as any).instapayHandle).toBe('ahmed@instapay')
  })
})
