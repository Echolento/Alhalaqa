import type { BillingFrequency } from '@/lib/billing-period'
import { billingState } from '@/lib/billing-state'

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
}

/**
 * Next-due engine: a student is overdue when their outstanding cycle is not
 * settled and today is past its due date + grace. Delegates the cycle/status
 * rule to billingState so it can never drift from the pay screen or the list.
 */
export function getOverdueStudents(
  students: DueDatedStudent[],
  payments: Array<{ student_id: string; month: string; paid: boolean }>,
  today: Date = new Date(),
  graceDays: number = 3,
): OverdueStudent[] {
  const rowsByStudent = new Map<string, Array<{ month: string; paid: boolean }>>()
  for (const p of payments) {
    const list = rowsByStudent.get(p.student_id) ?? []
    list.push({ month: p.month, paid: p.paid })
    rowsByStudent.set(p.student_id, list)
  }

  const result: OverdueStudent[] = []
  for (const student of students) {
    const state = billingState({
      student: { frequency: student.frequency, next_due_date: student.next_due_date },
      payments: rowsByStudent.get(student.id) ?? [],
      today,
    })
    if (state.isSettled) continue
    if (state.daysOverdue < graceDays) continue
    result.push({ id: student.id, name: student.name, daysOverdue: state.daysOverdue })
  }
  return result
}
