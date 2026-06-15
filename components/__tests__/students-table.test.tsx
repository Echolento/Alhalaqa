import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StudentsTable } from '@/components/dashboard/students-table'

const mockStudents = [
  { id: '1', name: 'أحمد علي', phone: '+201234567890', monthly_price: 100, payment_day: 5 },
  { id: '2', name: 'محمد حسن', phone: null, monthly_price: 200, payment_day: 10 },
]

describe('StudentsTable', () => {
  it('renders student names', () => {
    render(<StudentsTable students={mockStudents} />)
    expect(screen.getAllByText('أحمد علي').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('محمد حسن').length).toBeGreaterThanOrEqual(1)
  })

  it('renders total count in title', () => {
    render(<StudentsTable students={mockStudents} />)
    expect(screen.getByText(/قائمة الطلاب/)).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<StudentsTable students={mockStudents} />)
    expect(screen.getByPlaceholderText('البحث عن طالب...')).toBeInTheDocument()
  })

  it('renders add student button', () => {
    render(<StudentsTable students={mockStudents} />)
    expect(screen.getByText('إضافة طالب')).toBeInTheDocument()
  })

  it('renders phone number when present', () => {
    render(<StudentsTable students={mockStudents} />)
    expect(screen.getAllByText('+201234567890').length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty message when no students', () => {
    render(<StudentsTable students={[]} />)
    expect(screen.getAllByText('لا يوجد طلاب').length).toBeGreaterThanOrEqual(1)
  })

  it('does not show contacts import button when API unavailable', () => {
    render(<StudentsTable students={mockStudents} />)
    expect(screen.queryByText('استيراد من جهات الاتصال')).not.toBeInTheDocument()
  })
})
