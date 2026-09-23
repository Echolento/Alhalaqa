import { getPeriodDueDate, getPeriodKey, type BillingFrequency } from '@/lib/billing-period'

export interface OverdueStudent {
  id: string
  name: string
  daysOverdue: number
}

export function getOverdueStudents(
  students: Array<{ id: string; name: string; payment_day: number; frequency?: BillingFrequency | null }>,
  payments: Array<{ student_id: string; month: string; paid: boolean }>,
  today: Date = new Date(),
  graceDays: number = 3,
): OverdueStudent[] {
  const result: OverdueStudent[] = []

  for (const student of students) {
    const frequency = (student as { frequency?: BillingFrequency | null }).frequency ?? 'monthly'
    const periodKey = getPeriodKey(today, frequency, student.payment_day)
    const payment = payments.find(
      p => p.student_id === student.id && p.month === periodKey,
    )
    const isPaid = payment?.paid ?? false
    if (isPaid) continue

    const dueDate = getPeriodDueDate(periodKey, frequency, student.payment_day)

    const overdueDate = new Date(dueDate)
    overdueDate.setDate(overdueDate.getDate() + graceDays)

    if (today >= overdueDate) {
      const diffMs = today.getTime() - dueDate.getTime()
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      result.push({ id: student.id, name: student.name, daysOverdue })
    }
  }

  return result
}
