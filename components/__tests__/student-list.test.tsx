import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentList } from '@/components/dashboard/student-list'

vi.mock('@/lib/payment-actions', () => ({
  toggleStudentPayment: vi.fn(() => ({ success: true })),
}))

vi.mock('@/lib/student-actions', () => ({
  addStudent: vi.fn(() => ({ success: true })),
  addMultipleStudents: vi.fn(() => ({ success: true })),
}))

const students = [
  { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5 },
  { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10 },
]
const payments = [{ student_id: 's1', paid: true, amount_paid: 100 }]

describe('StudentList (merged home)', () => {
  it('renders search + add entry points', () => {
    render(<StudentList students={students} payments={payments} month="2025-06" currency="SAR" />)
    expect(screen.getByPlaceholderText('البحث عن طالب...')).toBeInTheDocument()
    expect(screen.getAllByText('إضافة طالب').length).toBeGreaterThanOrEqual(1)
  })

  it('filters rows by search', () => {
    render(<StudentList students={students} payments={payments} month="2025-06" currency="SAR" />)
    fireEvent.change(screen.getByPlaceholderText('البحث عن طالب...'), { target: { value: 'محمد' } })
    expect(screen.queryByText('أحمد علي')).not.toBeInTheDocument()
    expect(screen.getByText('محمد حسن')).toBeInTheDocument()
  })

  it('each row links to profile', () => {
    const { container } = render(<StudentList students={students} payments={payments} month="2025-06" currency="SAR" />)
    const link = container.querySelector('a[href="/dashboard/students/s1"]')
    expect(link).toBeInTheDocument()
  })

  it('row shows price + pay-day readouts and shared green/red status', () => {
    const { container } = render(<StudentList students={students} payments={payments} month="2025-06" currency="SAR" />)
    expect(screen.getByText('100 ر.س')).toBeInTheDocument()
    expect(screen.getByText(/يوم 5/)).toBeInTheDocument()
    expect(screen.getAllByText('مدفوع').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('لم يدفع').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('[class*="bg-emerald-50"]')).toBeInTheDocument()
    expect(container.querySelector('[class*="bg-red-50"]')).toBeInTheDocument()
  })

  it('inline toggle has 44px target', () => {
    render(<StudentList students={students} payments={payments} month="2025-06" currency="SAR" />)
    const btn = screen.getByText('تحديد كمدفوع')
    expect(btn.className).toContain('min-h-[44px]')
  })
})
