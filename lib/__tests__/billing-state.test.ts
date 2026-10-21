import { describe, it, expect } from 'vitest'
import { billingState } from '@/lib/billing-state'

describe('billingState', () => {
  it('reads a student whose outstanding cycle is settled as paid', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-10-01' },
      payments: [{ month: '2026-10-01', paid: true }],
      today: new Date(2026, 9, 15),
    })

    expect(state.cycleKey).toBe('2026-10-01')
    expect(state.isPaidForPeriod).toBe(true)
    expect(state.isSettled).toBe(true)
    expect(state.isOverdue).toBe(false)
    expect(state.paymentState).toBe('paid')
  })

  it('reads a not-yet-due cycle as settled (due on the 18th is not unpaid on the 14th)', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-10-18' },
      payments: [],
      today: new Date(2026, 9, 14),
    })

    expect(state.isSettled).toBe(true)
    expect(state.isOverdue).toBe(false)
    expect(state.paymentState).toBe('not_due')
  })

  it('reads a due-past unpaid cycle as overdue, counting the days', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-10-01' },
      payments: [],
      today: new Date(2026, 9, 5),
    })

    expect(state.isSettled).toBe(false)
    expect(state.isOverdue).toBe(true)
    expect(state.daysOverdue).toBe(4)
    expect(state.paymentState).toBe('unpaid')
  })

  it('reads a pending receipt for the cycle as pending, not overdue', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-10-01' },
      payments: [],
      proofs: [{ period_key: '2026-10-01', status: 'pending' }],
      today: new Date(2026, 9, 5),
    })

    expect(state.isPending).toBe(true)
    expect(state.isSettled).toBe(false)
    expect(state.isOverdue).toBe(false)
    expect(state.paymentState).toBe('pending')
  })

  it('keeps a pending receipt actionable even before the cycle is due', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-11-01' },
      payments: [],
      proofs: [{ period_key: '2026-11-01', status: 'pending' }],
      today: new Date(2026, 9, 20),
    })

    expect(state.isSettled).toBe(true)
    expect(state.isPending).toBe(true)
    expect(state.paymentState).toBe('pending')
  })

  it('flags paidLastPeriod when the previous cycle settled but the current is overdue', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-10-01' },
      payments: [{ month: '2026-09-01', paid: true }],
      today: new Date(2026, 9, 5),
    })

    expect(state.isSettled).toBe(false)
    expect(state.isOverdue).toBe(true)
    expect(state.paidLastPeriod).toBe(true)
  })

  it('keys a weekly student by the cycle-start date, not a month', () => {
    const state = billingState({
      student: { frequency: 'weekly', next_due_date: '2026-10-12' },
      payments: [],
      today: new Date(2026, 9, 12),
    })

    expect(state.cycleKey).toBe('2026-10-12')
  })

  it('keys a monthly student by the month-first even when the due date is mid-month', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-10-15' },
      payments: [{ month: '2026-10-01', paid: true }],
      today: new Date(2026, 9, 20),
    })

    expect(state.cycleKey).toBe('2026-10-01')
    expect(state.isPaidForPeriod).toBe(true)
    expect(state.isSettled).toBe(true)
  })

  it('ignores a pending receipt for a cycle that already advanced', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-11-01' },
      payments: [],
      proofs: [{ period_key: '2026-10-01', status: 'pending' }],
      today: new Date(2026, 9, 20),
    })

    expect(state.isPending).toBe(false)
    expect(state.isSettled).toBe(true)
  })

  it('falls back to the 1st of next month for a legacy row with no due date', () => {
    const state = billingState({
      student: { frequency: 'monthly' },
      payments: [],
      today: new Date(2026, 9, 15),
    })

    expect(state.cycleKey).toBe('2026-11-01')
  })

  it('treats a reopened future cycle as owed, not settled', () => {
    const state = billingState({
      student: { frequency: 'monthly', next_due_date: '2026-11-01' },
      payments: [{ month: '2026-11-01', paid: false }],
      proofs: [{ period_key: '2026-11-01', status: 'undone' }],
      today: new Date(2026, 9, 20),
    })

    expect(state.isReopened).toBe(true)
    expect(state.isSettled).toBe(false)
    expect(state.paymentState).toBe('unpaid')
  })
})
