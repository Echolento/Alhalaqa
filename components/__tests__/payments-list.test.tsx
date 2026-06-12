import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaymentsList } from '@/components/dashboard/payments-list'
import { toggleStudentPayment } from '@/lib/data-actions'

vi.mock('@/lib/data-actions', () => ({
  toggleStudentPayment: vi.fn(() => ({ success: true })),
  updateStudentMonthlyPrice: vi.fn(() => ({ success: true })),
  updateStudentPaymentDay: vi.fn(() => ({ success: true })),
}))

const mockStudents = [
  { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5 },
  { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10 },
]

const mockPayments = [
  { student_id: 's1', paid: true, amount_paid: 100, paid_at: '2025-06-01T00:00:00Z' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PaymentsList', () => {
  it('renders student names', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('محمد حسن')).toBeInTheDocument()
  })

  it('shows paid status badge', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    const paidBadges = screen.getAllByText('مدفوع')
    expect(paidBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows unpaid status badge', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    const unpaidBadges = screen.getAllByText('لم يدفع')
    expect(unpaidBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty message when no students', () => {
    render(<PaymentsList students={[]} payments={[]} month="2025-06" currency="SAR" />)
    expect(screen.getByText('لا يوجد طلاب مسجلين')).toBeInTheDocument()
  })

  it('shows payment amount with currency symbol', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="EGP" />)
    expect(screen.getByText('100 ج.م')).toBeInTheDocument()
    expect(screen.getByText('200 ج.م')).toBeInTheDocument()
  })

  it('shows paid student with green card and check icon', () => {
    const { container } = render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    const cards = container.querySelectorAll('[class*="bg-emerald-50"]')
    expect(cards.length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('.lucide-check')).toBeInTheDocument()
  })

  it('shows unpaid student with red card and user icon', () => {
    const { container } = render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    const cards = container.querySelectorAll('[class*="bg-red-50"]')
    expect(cards.length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('.lucide-user')).toBeInTheDocument()
  })

  it('renders price as clickable button by default', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    expect(screen.getByText('100 ر.س')).toBeInTheDocument()
    expect(screen.getByText('200 ر.س')).toBeInTheDocument()
  })

  it('enters price editing mode when clicking price', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    fireEvent.click(screen.getByText('100 ر.س'))
    const input = document.querySelector('input[type="number"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(100)
  })

  it('shows price editing input and exits on escape', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    fireEvent.click(screen.getByText('100 ر.س'))
    const input = document.querySelector('input[type="number"]')!
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(document.querySelector('input[type="number"]')).not.toBeInTheDocument()
  })

  it('shows undo button for paid student', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    expect(screen.getByText('تراجع')).toBeInTheDocument()
  })

  it('shows "تحديد كمدفوع" button for unpaid student', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    expect(screen.getByText('تحديد كمدفوع')).toBeInTheDocument()
  })

  it('shows undo confirmation dialog with student name', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    fireEvent.click(screen.getByText('تراجع'))
    expect(screen.getByText('تراجع عن الدفع')).toBeInTheDocument()
    const nameElements = screen.getAllByText(/أحمد علي/)
    expect(nameElements.length).toBeGreaterThanOrEqual(2)
  })

  it('shows paid date when paid_at is present', () => {
    const { container } = render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    expect(container.querySelector('.lucide-check.text-emerald-600')).toBeInTheDocument()
  })

  it('shows payment day for each student', () => {
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows loading spinner on toggle button during loading', () => {
    vi.mocked(toggleStudentPayment).mockImplementation(() => new Promise(() => {}))
    render(<PaymentsList students={mockStudents} payments={mockPayments} month="2025-06" currency="SAR" />)
    fireEvent.click(screen.getByText('تحديد كمدفوع'))
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})
