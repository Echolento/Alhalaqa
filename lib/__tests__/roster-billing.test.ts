import { describe, it, expect, vi } from 'vitest'
import { loadRosterBilling } from '@/lib/roster-billing'

// The shared roster read is the seam that keeps the dashboard and the cron on
// the same input. Its loading contract: live students, FULL payment history,
// pending receipts — never a window narrowed to the outstanding cycle.

type Row = Record<string, any>

function fakeClient(tables: Record<string, Row[]>) {
  const calls: Array<{ table: string; query: string[] }> = []
  return {
    calls,
    from(table: string) {
      const filters: Array<(row: Row) => boolean> = []
      const query: string[] = []
      let window: [number, number] | null = null
      calls.push({ table, query })
      const builder: any = {
        select: () => builder,
        is: (col: string, val: unknown) => {
          query.push(`is:${col}`)
          filters.push((row) => (row[col] ?? null) === val)
          return builder
        },
        eq: (col: string, val: unknown) => {
          query.push(`eq:${col}`)
          filters.push((row) => row[col] === val)
          return builder
        },
        in: (col: string, val: unknown[]) => {
          query.push(`in:${col}`)
          filters.push((row) => val.includes(row[col]))
          return builder
        },
        order: () => builder,
        range: (from: number, to: number) => {
          query.push(`range:${from}:${to}`)
          window = [from, to]
          return builder
        },
        then: (resolve: any) => {
          const filtered = (tables[table] ?? []).filter((row) => filters.every((f) => f(row)))
          const data = window ? filtered.slice(window[0], window[1] + 1) : filtered
          return Promise.resolve({ data, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
}

const student = {
  id: 's1',
  name: 'أحمد',
  phone: '+2010',
  monthly_price: 200,
  payment_day: 1,
  frequency: 'biweekly',
  next_due_date: '2026-11-07',
  starts_on: null,
  claimed_by: 'payer-1',
  teacher_id: 't1',
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('loadRosterBilling', () => {
  it('returns the settled previous cycle, not just the outstanding one', async () => {
    const client = fakeClient({
      students: [student],
      student_payments: [
        { student_id: 's1', month: '2026-09-26', paid: true, amount_paid: 200 },
        { student_id: 's1', month: '2026-10-10', paid: true, amount_paid: 200 },
      ],
      payment_proofs: [],
    })

    const roster = await loadRosterBilling(client, 't1', new Date(2026, 9, 26))

    expect(roster.entries).toHaveLength(1)
    expect(roster.payments).toHaveLength(2) // full history, both cycles
    expect(roster.entries[0].state.paymentState).toBe('paid')
    expect(roster.entries[0].state.isSettled).toBe(true)
  })

  it('groups pending receipts and deep-links only the outstanding cycle one', async () => {
    const client = fakeClient({
      students: [student],
      student_payments: [{ student_id: 's1', month: '2026-10-24', paid: true }],
      payment_proofs: [
        { id: 'p-old', student_id: 's1', period_key: '2026-10-10', status: 'pending' },
        { id: 'p-new', student_id: 's1', period_key: '2026-11-07', status: 'pending' },
      ],
    })

    const roster = await loadRosterBilling(client, 't1', new Date(2026, 9, 26))

    expect(roster.proofs).toHaveLength(2)
    expect(roster.entries[0].proofs).toHaveLength(2)
    expect(roster.entries[0].pendingProofId).toBe('p-new')
  })

  it('only asks for live students of this teacher', async () => {
    const client = fakeClient({
      students: [student, { ...student, id: 's2', teacher_id: 't2', deleted_at: '2026-01-01' }],
      student_payments: [],
      payment_proofs: [],
    })

    const roster = await loadRosterBilling(client, 't1', new Date(2026, 9, 26))

    expect(roster.entries.map((e) => e.student.id)).toEqual(['s1'])
  })

  it('pages past the PostgREST row cap instead of truncating history', async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({
      student_id: 's1',
      month: '2026-10-24',
      paid: i === 0,
    }))
    const client = fakeClient({
      students: [student],
      student_payments: rows,
      payment_proofs: [],
    })

    const roster = await loadRosterBilling(client, 't1', new Date(2026, 9, 26))

    expect(roster.payments).toHaveLength(1500)
    expect(client.calls.filter((c) => c.table === 'student_payments')).toHaveLength(2)
  })

  it('makes no history query when the roster is empty', async () => {
    const client = fakeClient({ students: [], student_payments: [], payment_proofs: [] })

    const roster = await loadRosterBilling(client, 't1', new Date(2026, 9, 26))

    expect(roster).toEqual({ entries: [], payments: [], proofs: [] })
    expect(client.calls.map((c) => c.table)).toEqual(['students'])
  })

  it('throws on a failed history read instead of pretending the history is empty', async () => {
    const failing = {
      from: vi.fn((table: string) => {
        const builder: any = {
          select: () => builder,
          is: () => builder,
          eq: () => builder,
          in: () => builder,
          order: () => builder,
          range: () => builder,
          then: (resolve: any) =>
            Promise.resolve(
              table === 'students'
                ? { data: [student], error: null }
                : { data: null, error: { message: 'boom' } },
            ).then(resolve),
        }
        return builder
      }),
    }

    await expect(loadRosterBilling(failing, 't1', new Date(2026, 9, 26))).rejects.toThrow(
      'roster payments: boom',
    )
  })
})
