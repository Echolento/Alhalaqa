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

  it('weekly student overdue on own cycle (no payment for 2024-06-10)', () => {
    const students = [{ id: 'w1', name: 'Weekly', payment_day: 1, frequency: 'weekly' as const }]
    const today = new Date('2024-06-15')
    const result = getOverdueStudents(students, [], today)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('w1')
    expect(result[0].daysOverdue).toBe(5)
  })

  it('weekly student paid for current cycle is excluded', () => {
    const students = [{ id: 'w1', name: 'Weekly', payment_day: 1, frequency: 'weekly' as const }]
    const payments = [{ student_id: 'w1', month: '2024-06-10', paid: true }]
    const result = getOverdueStudents(students, payments, new Date('2024-06-15'))
    expect(result).toHaveLength(0)
  })

  it('biweekly overdue uses 14-day cycle start as due date', () => {
    const students = [{ id: 'b1', name: 'Bi', payment_day: 1, frequency: 'biweekly' as const }]
    const result = getOverdueStudents(students, [], new Date('2024-06-15'))
    expect(result).toHaveLength(1)
    expect(result[0].daysOverdue).toBe(12)
  })

  it('mixed roster: monthly paid, weekly unpaid -> only weekly overdue', () => {
    const students = [
      { id: 'm1', name: 'Monthly', payment_day: 10, frequency: 'monthly' as const },
      { id: 'w1', name: 'Weekly', payment_day: 1, frequency: 'weekly' as const },
    ]
    const payments = [{ student_id: 'm1', month: '2024-06-01', paid: true }]
    const result = getOverdueStudents(students, payments, new Date('2024-06-15'))
    expect(result.map(s => s.id)).toEqual(['w1'])
  })

  it('legacy row without frequency reads as monthly', () => {
    const students = [{ id: 's1', name: 'Legacy', payment_day: 10 }]
    const payments = [{ student_id: 's1', month: '2024-06-01', paid: true }]
    expect(getOverdueStudents(students, payments, new Date('2024-06-15'))).toHaveLength(0)
  })
})
