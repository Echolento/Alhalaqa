// lib/billing-cycle.ts
// Service-level next-due ratchet. The pure date math lives in billing-next.ts;
// this is the one place a settled cycle advances students.next_due_date.
// Kept out of the proof-verdict action file so any billing write (teacher
// toggle, proof verdict) shares a single, documented primitive.

import { createServiceClient } from '@/lib/supabase/service'
import { advanceDueDate } from '@/lib/billing-next'
import { normalizeFrequency } from '@/lib/billing-period'

type Service = ReturnType<typeof createServiceClient>

/**
 * Settle advancement (next-due engine): after a period is paid, the
 * student's next_due_date moves one interval past the SETTLED period due —
 * never the pay date, so late payment never drifts the rhythm. One-way
 * ratchet: when the stored date already passed the settled period (second
 * proof, same cycle), it is left alone — never retreated.
 */
export async function advanceStudentCycle(
  service: Service,
  studentId: string,
  settledPeriodKey: string,
  frequency: unknown,
  currentNextDue: string | null | undefined,
): Promise<string | null> {
  if (!currentNextDue || currentNextDue <= settledPeriodKey) {
    const next = advanceDueDate(settledPeriodKey, normalizeFrequency(frequency))
    await service.from('students').update({ next_due_date: next }).eq('id', studentId)
    return next
  }
  return null
}
