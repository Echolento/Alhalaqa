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

const props = {
  students,
  payments,
  month: '2025-06',
  currency: 'SAR',
  initialCollected: 100,
  initialExpected: 300,
}

describe('StudentList (merged home)', () => {
  it('renders search + add entry points', () => {
    render(<StudentList {...props} />)
    expect(screen.getByPlaceholderText('البحث عن طالب...')).toBeInTheDocument()
    expect(screen.getAllByText('إضافة طالب').length).toBeGreaterThanOrEqual(1)
  })

  it('renders local totals', () => {
    render(<StudentList {...props} />)
    expect(screen.getByText('المبالغ المستلمة')).toBeInTheDocument()
    expect(screen.getByText('المبالغ المتبقية')).toBeInTheDocument()
  })

  it('filters rows by search', () => {
    render(<StudentList {...props} />)
    fireEvent.change(screen.getByPlaceholderText('البحث عن طالب...'), { target: { value: 'محمد' } })
    expect(screen.queryByText('أحمد علي')).not.toBeInTheDocument()
    expect(screen.getByText('محمد حسن')).toBeInTheDocument()
  })

  it('each row links to profile', () => {
    const { container } = render(<StudentList {...props} />)
    const link = container.querySelector('a[href="/dashboard/students/s1"]')
    expect(link).toBeInTheDocument()
  })

  it('row shows price + pay-day readouts and shared green/red status', () => {
    const { container } = render(<StudentList {...props} />)
    expect(screen.getAllByText('100 ر.س').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/يوم 5/)).toBeInTheDocument()
    expect(screen.getAllByText('مدفوع').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('لم يدفع').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('[class*="bg-emerald-50"]')).toBeInTheDocument()
    expect(container.querySelector('[class*="bg-red-50"]')).toBeInTheDocument()
  })

  it('inline toggle has 44px target', () => {
    render(<StudentList {...props} />)
    const btn = screen.getByText('تحديد كمدفوع')
    expect(btn.className).toContain('min-h-[44px]')
  })

  it('undo button opens confirm dialog instead of navigating', () => {
    render(<StudentList {...props} />)
    fireEvent.click(screen.getByText('تراجع'))
    expect(screen.getByText('تراجع عن الدفع')).toBeInTheDocument()
    expect(screen.getByText('نعم، تراجع')).toBeInTheDocument()
  })

  it('confirming undo closes the dialog (no haunting later toggles)', async () => {
    render(<StudentList {...props} />)
    fireEvent.click(screen.getByText('تراجع'))
    expect(screen.getByText('تراجع عن الدفع')).toBeInTheDocument()
    fireEvent.click(screen.getByText('نعم، تراجع'))
    expect(await screen.findByText('تحديد كمدفوع')).toBeInTheDocument()
    expect(screen.queryByText('تراجع عن الدفع')).not.toBeInTheDocument()
  })

  it('undo is low-emphasis ghost, never full-width red', () => {
    render(<StudentList {...props} />)
    const btn = screen.getByText('تراجع')
    expect(btn.className).not.toContain('bg-destructive')
    expect(btn.className).not.toContain('w-full')
  })

  it('toggle updates totals locally with no second fetch', async () => {
    render(<StudentList {...props} />)
    // pending 200 appears twice (summary card + s2 row readout)
    expect(screen.getAllByText('200 ر.س')).toHaveLength(2)
    fireEvent.click(screen.getByText('تحديد كمدفوع'))
    // collected 100 -> 300, pending 200 -> 0 — all local, no refresh
    expect(await screen.findByText('300 ر.س')).toBeInTheDocument()
    expect(await screen.findByText('0 ر.س')).toBeInTheDocument()
  })
})
