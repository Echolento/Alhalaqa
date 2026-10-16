// lib/billing-cycle.ts
// The next-due ratchet. The pure decision lives here (testable); the atomic
// write lives in the settle_cycle / reopen_cycle Postgres functions so a
// settlement can never leave a half-applied state.

import { advanceDueDate } from '@/lib/billing-next'
import { normalizeFrequency } from '@/lib/billing-period'

/**
 * The next due date after settling `settledPeriodKey`, or null when the settled
 * cycle is NOT the one currently outstanding — an earlier still-owed cycle, or a
 * later prepaid one. Advancing would run next_due past a cycle still owed.
 *
 * Advancing anchors to the REAL due date (not the period key) so a monthly
 * student on payment_day 15 keeps the 15th instead of collapsing to the 1st.
 */
export function nextDueAfterSettle(
  settledPeriodKey: string,
  frequency: unknown,
  currentNextDue: string | null | undefined,
): string | null {
  const freq = normalizeFrequency(frequency)
  const windowEnd = advanceDueDate(settledPeriodKey, freq)
  const isOutstanding =
    !currentNextDue || (currentNextDue >= settledPeriodKey && currentNextDue < windowEnd)
  if (!isOutstanding) return null
  return advanceDueDate(currentNextDue ?? settledPeriodKey, freq)
}
