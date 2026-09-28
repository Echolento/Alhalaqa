import { describe, it, expect } from 'vitest'
import { getOverdueStudents } from '@/lib/overdue'

// Next-due engine: each student's outstanding due date drives everything.
// Prepay model — the date opens the period being paid for. Null dates fall
// back to the 1st of next month (legacy rows).

describe('getOverdueStudents', () => {
  it('returns students past due date + grace with no payment record', () => {
    const students = [{ id: 's1', name: 'Ahmed', next_due_date: '2026-04-10' }]
    const payments: { student_id: string; month: string; paid: boolean }[] = []
    const today = new Date('2026-04-14')

    const result = getOverdueStudents(students, payments, today)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('s1')
    expect(result[0].daysOverdue).toBe(4)
  })

  it('excludes students within grace period', () => {
    const students = [{ id: 's1', name: 'Ahmed', next_due_date: '2026-04-10' }]
    const today = new Date('2026-04-12')

    const result = getOverdueStudents(students, [], today)

    expect(result).toHaveLength(0)
  })

  it('excludes students who paid the outstanding cycle', () => {
    const students = [{ id: 's1', name: 'Ahmed', next_due_date: '2026-04-10' }]
    // Monthly key derives from the due month.
    const payments = [{ student_id: 's1', month: '2026-04-01', paid: true }]
    const today = new Date('2026-04-14')

    const result = getOverdueStudents(students, payments, today)

    expect(result).toHaveLength(0)
  })

  it('counts from the due date across month boundaries', () => {
    const students = [{ id: 's1', name: 'Ahmed', next_due_date: '2026-03-20' }]
    const today = new Date('2026-04-15')
    const result = getOverdueStudents(students, [], today)
    expect(result).toHaveLength(1)
    expect(result[0].daysOverdue).toBe(26)
  })

  it('falls back to the 1st of next month when no date is stored', () => {
    const students = [{ id: 's1', name: 'Ahmed', next_due_date: null }]
    const today = new Date('2026-04-14')
    const result = getOverdueStudents(students, [], today)
    expect(result).toHaveLength(0)
  })

  it('handles multiple students with mixed states', () => {
    const students = [
      { id: 's1', name: 'Ahmed', next_due_date: '2026-04-05' },
      { id: 's2', name: 'Omar', next_due_date: '2026-04-10' },
      { id: 's3', name: 'Fatima', next_due_date: '2026-04-28' },
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

  it('weekly student overdue on own due date', () => {
    const students = [{ id: 'w1', name: 'Weekly', next_due_date: '2024-06-10', frequency: 'weekly' as const }]
    const today = new Date('2024-06-15')
    const result = getOverdueStudents(students, [], today)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('w1')
    expect(result[0].daysOverdue).toBe(5)
  })

  it('weekly student paid for the outstanding cycle is excluded', () => {
    const students = [{ id: 'w1', name: 'Weekly', next_due_date: '2024-06-10', frequency: 'weekly' as const }]
    const payments = [{ student_id: 'w1', month: '2024-06-10', paid: true }]
    const result = getOverdueStudents(students, payments, new Date('2024-06-15'))
    expect(result).toHaveLength(0)
  })

  it('biweekly overdue counts from its due date', () => {
    const students = [{ id: 'b1', name: 'Bi', next_due_date: '2024-06-03', frequency: 'biweekly' as const }]
    const result = getOverdueStudents(students, [], new Date('2024-06-15'))
    expect(result).toHaveLength(1)
    expect(result[0].daysOverdue).toBe(12)
  })

  it('mixed roster: monthly paid, weekly unpaid -> only weekly overdue', () => {
    const students = [
      { id: 'm1', name: 'Monthly', next_due_date: '2024-06-01', frequency: 'monthly' as const },
      { id: 'w1', name: 'Weekly', next_due_date: '2024-06-10', frequency: 'weekly' as const },
    ]
    const payments = [{ student_id: 'm1', month: '2024-06-01', paid: true }]
    const result = getOverdueStudents(students, payments, new Date('2024-06-15'))
    expect(result.map((s) => s.id)).toEqual(['w1'])
  })

  it('legacy row without frequency reads as monthly', () => {
    const students = [{ id: 's1', name: 'Legacy', next_due_date: '2024-06-01' }]
    const payments = [{ student_id: 's1', month: '2024-06-01', paid: true }]
    expect(getOverdueStudents(students, payments, new Date('2024-06-15'))).toHaveLength(0)
  })
})
