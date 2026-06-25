import { getBillingMonthKey } from '@/lib/billing-period'

export interface OverdueStudent {
  id: string
  name: string
  daysOverdue: number
}

export function getOverdueStudents(
  students: Array<{ id: string; name: string; payment_day: number }>,
  payments: Array<{ student_id: string; month: string; paid: boolean }>,
  today: Date = new Date(),
  graceDays: number = 3,
): OverdueStudent[] {
  const result: OverdueStudent[] = []

  for (const student of students) {
    const billingMonthKey = getBillingMonthKey(today, student.payment_day)
    const payment = payments.find(
      p => p.student_id === student.id && p.month === billingMonthKey,
    )
    const isPaid = payment?.paid ?? false
    if (isPaid) continue

    const [yearStr, monthStr] = billingMonthKey.split('-')
    const year = parseInt(yearStr)
    const month = parseInt(monthStr)
    const lastDay = new Date(year, month, 0).getDate()
    const dueDay = Math.min(student.payment_day, lastDay)
    const dueDate = new Date(year, month - 1, dueDay)

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
