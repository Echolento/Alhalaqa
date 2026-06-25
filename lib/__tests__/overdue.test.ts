import { describe, it, expect } from 'vitest'
import { getOverdueStudents } from '@/lib/overdue'

describe('getOverdueStudents', () => {
  it('returns students past payment_day + grace period with no payment record', () => {
    const students = [
      { id: 's1', name: 'Ahmed', payment_day: 10 },
    ]
    const payments: { student_id: string; month: string; paid: boolean }[] = []
    const today = new Date('2026-04-14')

    const result = getOverdueStudents(students, payments, today)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('s1')
    expect(result[0].daysOverdue).toBe(4)
  })

  it('excludes students within grace period', () => {
    const students = [
      { id: 's1', name: 'Ahmed', payment_day: 10 },
    ]
    const today = new Date('2026-04-12')

    const result = getOverdueStudents(students, [], today)

    expect(result).toHaveLength(0)
  })

  it('excludes students who have paid', () => {
    const students = [
      { id: 's1', name: 'Ahmed', payment_day: 10 },
    ]
    const payments = [
      { student_id: 's1', month: '2026-04-01', paid: true },
    ]
    const today = new Date('2026-04-14')

    const result = getOverdueStudents(students, payments, today)

    expect(result).toHaveLength(0)
  })

  it('considers student in previous billing period as overdue when past due date', () => {
    const students = [
      { id: 's1', name: 'Ahmed', payment_day: 20 },
    ]
    const today = new Date('2026-04-15')
    const result = getOverdueStudents(students, [], today)
    expect(result).toHaveLength(1)
    expect(result[0].daysOverdue).toBe(26)
  })

  it('marks overdue for student whose payment_day has passed this month', () => {
    const students = [
      { id: 's1', name: 'Ahmed', payment_day: 20 },
    ]
    const today = new Date('2026-04-25')
    const result = getOverdueStudents(students, [], today)
    expect(result).toHaveLength(1)
    expect(result[0].daysOverdue).toBe(5)
  })

  it('clamps payment_day 31 to last day of 30-day month', () => {
    const students = [
      { id: 's1', name: 'Ahmed', payment_day: 31 },
    ]
    const today = new Date('2026-05-04')
    const result = getOverdueStudents(students, [], today)
    expect(result).toHaveLength(1)
    expect(result[0].daysOverdue).toBe(4)
  })

  it('handles multiple students with mixed states', () => {
    const students = [
      { id: 's1', name: 'Ahmed', payment_day: 5 },
      { id: 's2', name: 'Omar', payment_day: 10 },
      { id: 's3', name: 'Fatima', payment_day: 28 },
    ]
    const payments = [
      { student_id: 's1', month: '2026-04-01', paid: true },
      { student_id: 's2', month: '2026-04-01', paid: false },
      { student_id: 's3', month: '2026-03-01', paid: true },
    ]
    const today = new Date('2026-04-14')

    const result = getOverdueStudents(students, payments, today)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('s2')
  })
})
