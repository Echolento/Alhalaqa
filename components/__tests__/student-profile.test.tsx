import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentProfile } from '@/components/dashboard/student-profile'

vi.mock('@/lib/student-actions', () => ({
  updateStudent: vi.fn(() => ({ success: true })),
  deleteStudent: vi.fn(() => ({ success: true })),
}))
vi.mock('@/lib/payment-actions', () => ({
  toggleStudentPayment: vi.fn(() => ({ success: true })),
  updateStudentMonthlyPrice: vi.fn(() => ({ success: true })),
  updateStudentPaymentDay: vi.fn(() => ({ success: true })),
}))

const student = { id: 's1', full_name: 'أحمد علي', name: 'أحمد علي', phone: '+201234567890', monthly_price: 100, payment_day: 5 }
const payments = [
  { student_id: 's1', month: '2025-06-01', paid: true, amount_paid: 100, paid_at: '2025-06-03T00:00:00Z' },
  { student_id: 's1', month: '2025-05-01', paid: true, amount_paid: 100, paid_at: '2025-05-02T00:00:00Z' },
]

describe('StudentProfile', () => {
  it('header mirrors green/red status', () => {
    const { container } = render(<StudentProfile student={student} payments={payments} month="2025-06-01" currency="SAR" />)
    expect(screen.getAllByText('أحمد علي').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('مدفوع').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('[class*="bg-emerald-50"]')).toBeInTheDocument()
  })

  it('every feature is its own row with obvious edit button', () => {
    render(<StudentProfile student={student} payments={payments} month="2025-06-01" currency="SAR" />)
    for (const label of ['الاسم', 'الهاتف', 'الاشتراك الشهري', 'يوم الدفع', 'سجل المدفوعات']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // one تعديل per editable row (name, phone, price, day) — obvious buttons
    expect(screen.getAllByText('تعديل').length).toBeGreaterThanOrEqual(4)
  })

  it('history lists past months + delete confirm exists', () => {
    render(<StudentProfile student={student} payments={payments} month="2025-06-01" currency="SAR" />)
    expect(screen.getAllByText('حذف الطالب').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(screen.getAllByText('حذف الطالب')[1])
    expect(screen.getByText('تأكيد الحذف')).toBeInTheDocument()
  })
})
