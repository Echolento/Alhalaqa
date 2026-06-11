import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PaymentsList } from '@/components/dashboard/payments-list'

const mockStudents = [
  { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5 },
  { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10 },
]

const mockPayments = [
  { student_id: 's1', paid: true, amount_paid: 100, paid_at: '2025-06-01T00:00:00Z' },
]

describe('PaymentsList', () => {
  it('renders student names', () => {
    render(
      <PaymentsList
        students={mockStudents}
        payments={mockPayments}
        month="2025-06"
        currency="SAR"
      />
    )
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('محمد حسن')).toBeInTheDocument()
  })

  it('shows paid status badge', () => {
    render(
      <PaymentsList
        students={mockStudents}
        payments={mockPayments}
        month="2025-06"
        currency="SAR"
      />
    )
    const paidBadges = screen.getAllByText('مدفوع')
    expect(paidBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows unpaid status badge', () => {
    render(
      <PaymentsList
        students={mockStudents}
        payments={mockPayments}
        month="2025-06"
        currency="SAR"
      />
    )
    const unpaidBadges = screen.getAllByText('لم يدفع')
    expect(unpaidBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty message when no students', () => {
    render(
      <PaymentsList
        students={[]}
        payments={[]}
        month="2025-06"
        currency="SAR"
      />
    )
    expect(screen.getByText('لا يوجد طلاب مسجلين')).toBeInTheDocument()
  })
})
