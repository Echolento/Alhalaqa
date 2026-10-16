// lib/__tests__/billing-cycle.test.ts
// The next-due ratchet decision (pure). The atomic write is exercised through
// the settle_cycle RPC + its action-level tests.

import { describe, it, expect } from 'vitest'
import { nextDueAfterSettle } from '@/lib/billing-cycle'

describe('nextDueAfterSettle', () => {
  it('advances one interval past the settled period when the stored due is at/before it', () => {
    expect(nextDueAfterSettle('2026-09-01', 'monthly', '2026-09-01')).toBe('2026-10-01')
  })

  it('treats a null stored due as "advance from the settled period" (legacy rows)', () => {
    expect(nextDueAfterSettle('2026-09-20', 'weekly', null)).toBe('2026-09-27')
  })

  it('never retreats an already-advanced date (returns null)', () => {
    expect(nextDueAfterSettle('2026-09-01', 'monthly', '2026-11-01')).toBeNull()
  })

  it('does not skip an owed cycle when settling a later (prepaid) one', () => {
    expect(nextDueAfterSettle('2026-11-01', 'weekly', '2026-10-08')).toBeNull()
  })

  it('advances from the real due date, preserving a monthly payment_day (15th → 15th)', () => {
    expect(nextDueAfterSettle('2026-10-01', 'monthly', '2026-10-15')).toBe('2026-11-15')
  })

  it('defaults unknown frequency to monthly', () => {
    expect(nextDueAfterSettle('2026-09-01', undefined, '2026-09-01')).toBe('2026-10-01')
  })
})
