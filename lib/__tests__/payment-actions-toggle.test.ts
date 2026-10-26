import { describe, it, expect, vi, beforeEach } from 'vitest'

// The dashboard toggle must never blind-settle a cycle whose receipt is waiting
// for review: the DB guard raises `proof_pending` and the action turns it into
// Arabic copy instead of leaking a raw Postgres message.
const state = vi.hoisted(() => {
  const s: Record<string, any> = {
    rpcError: null as { message: string } | null,
    rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
    cycleRow: { frequency: 'monthly', name: 'طالب', next_due_date: '2026-10-01', payment_day: 1 },
    existingRow: { id: 'pay1', paid: false } as { id: string; paid: boolean } | null,
    studentRow: { name: 'طالب', monthly_price: 100, teacher: { default_monthly_price: 100 } },
  }

  function builder(table: string) {
    let selected = ''
    const b: Record<string, any> = {
      select: vi.fn((cols: string) => {
        selected = cols || ''
        return b
      }),
      is: vi.fn(() => b),
      eq: vi.fn(() => b),
      in: vi.fn(() => b),
      maybeSingle: vi.fn(async () => ({
        data: table === 'students'
          ? selected.includes('teacher:teachers')
            ? s.studentRow
            : s.cycleRow
          : null,
      })),
      single: vi.fn(async () => ({ data: table === 'student_payments' ? s.existingRow : null })),
      insert: vi.fn(() => b),
      update: vi.fn(() => b),
      upsert: vi.fn(() => b),
    }
    return b
  }

  s.service = {
    from: vi.fn((table: string) => builder(table)),
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      s.rpcCalls.push({ fn, args })
      return { error: s.rpcError }
    }),
  }
  s.reset = () => {
    s.rpcError = null
    s.rpcCalls.length = 0
    s.existingRow = { id: 'pay1', paid: false }
  }
  return s
})

vi.mock('@/lib/action-context', () => ({
  requireUser: async () => ({ user: { id: 'u1' }, supabase: {}, service: state.service }),
}))
vi.mock('@/lib/ownership', () => ({
  assertOwnsStudent: async () => 't1',
}))
vi.mock('@/lib/log-activity', () => ({
  logActivity: vi.fn(async () => undefined),
}))

beforeEach(() => {
  state.reset()
})

describe('toggleStudentPayment + proof guard', () => {
  it('turns the DB proof_pending guard into Arabic copy', async () => {
    state.rpcError = { message: 'proof_pending' }
    const { toggleStudentPayment } = await import('@/lib/payment-actions')
    const result = await toggleStudentPayment('s1', '2026-10-01')
    expect(result).toEqual({
      error: 'يوجد إيصال قيد المراجعة لهذه الفترة — راجعه من الإيصالات',
    })
    expect(state.rpcCalls[0]?.fn).toBe('settle_cycle')
    expect(state.rpcCalls[0]?.args.p_proof_id).toBeNull()
  })

  it('still settles when no receipt is pending', async () => {
    const { toggleStudentPayment } = await import('@/lib/payment-actions')
    const result = await toggleStudentPayment('s1', '2026-10-01')
    expect(result).toEqual({ success: true })
  })

  it('keeps the deleted-student message for a trashed row', async () => {
    state.rpcError = { message: 'student_deleted' }
    const { toggleStudentPayment } = await import('@/lib/payment-actions')
    const result = await toggleStudentPayment('s1', '2026-10-01')
    expect(result).toEqual({ error: 'الطالب غير موجود' })
  })

  it('rejects a client-supplied cycle that is neither outstanding nor just settled', async () => {
    const { toggleStudentPayment } = await import('@/lib/payment-actions')
    const result = await toggleStudentPayment('s1', '2026-03-01')
    expect(result).toEqual({ error: 'دورة غير قابلة للتعديل' })
    expect(state.rpcCalls).toHaveLength(0)
  })

  it('passes the undo direction to reopen_cycle, never the guard path', async () => {
    state.existingRow = { id: 'pay1', paid: true }
    const { toggleStudentPayment } = await import('@/lib/payment-actions')
    const result = await toggleStudentPayment('s1', '2026-10-01')
    expect(result).toEqual({ success: true })
    expect(state.rpcCalls[0]?.fn).toBe('reopen_cycle')
  })
})
