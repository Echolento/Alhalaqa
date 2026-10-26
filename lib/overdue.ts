import type { BillingFrequency } from '@/lib/billing-period'
import { billingState } from '@/lib/billing-state'
import { toISODate } from '@/lib/billing-next'

export interface OverdueStudent {
  id: string
  name: string
  daysOverdue: number
}

export interface DueDatedStudent {
  id: string
  name: string
  frequency?: BillingFrequency | null
  next_due_date?: string | null
  starts_on?: string | null
}

export interface OverdueProofRow {
  student_id: string
  period_key: string
  /** Defaults to 'pending' — callers normally pass only pending receipts. */
  status?: string
}

/**
 * Next-due engine: a student is overdue when their outstanding cycle is not
 * settled and today is past its due date + grace. Delegates the cycle/status
 * rule to billingState so it can never drift from the pay screen or the list.
 *
 * Receipts matter: a cycle whose receipt is awaiting review is NOT overdue, so
 * callers must pass the roster's pending proofs. Omitting them makes a payer
 * who already uploaded look like a debtor in digests and email.
 */
export function getOverdueStudents(
  students: DueDatedStudent[],
  payments: Array<{ student_id: string; month: string; paid: boolean }>,
  today: Date = new Date(),
  graceDays: number = 3,
  proofs: OverdueProofRow[] = [],
): OverdueStudent[] {
  const rowsByStudent = new Map<string, Array<{ month: string; paid: boolean }>>()
  for (const p of payments) {
    const list = rowsByStudent.get(p.student_id) ?? []
    list.push({ month: p.month, paid: p.paid })
    rowsByStudent.set(p.student_id, list)
  }
  const proofsByStudent = new Map<string, Array<{ period_key: string; status: string }>>()
  for (const p of proofs) {
    const list = proofsByStudent.get(p.student_id) ?? []
    list.push({ period_key: p.period_key, status: p.status ?? 'pending' })
    proofsByStudent.set(p.student_id, list)
  }

  const result: OverdueStudent[] = []
  const todayISO = toISODate(today)
  for (const student of students) {
    const state = billingState({
      student: {
        frequency: student.frequency,
        next_due_date: student.next_due_date,
        starts_on: student.starts_on,
      },
      payments: rowsByStudent.get(student.id) ?? [],
      proofs: proofsByStudent.get(student.id) ?? [],
      today,
    })
    // `isOverdue` is billingState's "owed and nothing in review" — a settled
    // cycle or a receipt awaiting review is neither.
    if (!state.isOverdue) continue
    // A due date still ahead is never overdue. daysOverdue clamps at 0, so the
    // grace comparison alone would treat "due today" and "due next month"
    // identically once grace reaches 0 (cron nags / ?overdue=1 email CTA).
    if (state.dueISO > todayISO) continue
    if (state.daysOverdue < graceDays) continue
    result.push({ id: student.id, name: student.name, daysOverdue: state.daysOverdue })
  }
  return result
}
