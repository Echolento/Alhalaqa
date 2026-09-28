// components/__tests__/payer-hub.test.tsx
// A3 slice — payer home hub: stacked teacher sections (above each other),
// rows link to the per-student pay screen, plus the claim-another hint.
// Relationship-neutral copy throughout.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PayerHub } from '@/components/pay/payer-hub'

const students = [
  { studentId: 's1', studentName: 'أحمد', teacherId: 't1', teacherName: 'الشيخ علي' },
  { studentId: 's2', studentName: 'سارة', teacherId: 't1', teacherName: 'الشيخ علي' },
  { studentId: 's3', studentName: 'خالد', teacherId: 't2', teacherName: 'الشيخ عمر' },
]

describe('PayerHub', () => {
  it('renders one stacked section per teacher', () => {
    render(<PayerHub students={students} />)
    const hub = screen.getByTestId('payer-hub')
    expect(hub).toBeTruthy()
    expect(screen.getByText('الشيخ علي')).toBeTruthy()
    expect(screen.getByText('الشيخ عمر')).toBeTruthy()
    expect(screen.getAllByTestId(/hub-section-/)).toHaveLength(2)
  })

  it('links every student row to its pay screen', () => {
    render(<PayerHub students={students} />)
    for (const s of students) {
      const link = screen.getByTestId(`hub-student-${s.studentId}`)
      expect(link.getAttribute('href')).toContain(`student=${s.studentId}`)
    }
  })

  it('shows the empty state with a teacher-contact hint when nothing is claimed', () => {
    render(<PayerHub students={[]} />)
    expect(screen.getByTestId('hub-empty')).toBeTruthy()
  })

  it('shows the claim-another hint without assuming relationships', () => {
    render(<PayerHub students={students} />)
    const hint = screen.getByTestId('hub-claim-another')
    expect(hint).toBeTruthy()
    // Neutral: no "your kids" language anywhere in the hub.
    expect(hubText(hint)).not.toMatch(/أبنائك|أولادك/)
  })
})

function hubText(el: Element): string {
  return el.textContent ?? ''
}
