import { normalizeFrequency, type BillingFrequency } from '@/lib/billing-period'
import { dueOverdueInfo, duePeriodKey, firstOfNextMonth } from '@/lib/billing-next'

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
 * Next-due engine: a student is overdue when TODAY is past their
 * outstanding due date + grace AND no paid row exists for that cycle's key.
 * Null dates bill the 1st of next month (legacy fallback).
 */
export function getOverdueStudents(
  students: DueDatedStudent[],
  payments: Array<{ student_id: string; month: string; paid: boolean }>,
  today: Date = new Date(),
  graceDays: number = 3,
): OverdueStudent[] {
  const result: OverdueStudent[] = []

  for (const student of students) {
    const frequency = normalizeFrequency(student.frequency ?? 'monthly')
    const dueISO = student.next_due_date ?? firstOfNextMonth(today)
    const key = duePeriodKey(dueISO, frequency)
    const payment = payments.find((p) => p.student_id === student.id && p.month === key)
    if (payment?.paid) continue

    const info = dueOverdueInfo(dueISO, today, graceDays)
    if (info.overdue) {
      result.push({ id: student.id, name: student.name, daysOverdue: info.daysOverdue })
    }
  }

  return result
}
