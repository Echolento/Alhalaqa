import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentProfile } from '@/components/dashboard/student-profile'
import { REMIND_COPY } from '@/lib/remind-copy'
import type { DashboardStudent } from '@/lib/types'

vi.mock('@/lib/payment-actions', () => ({
  toggleStudentPayment: vi.fn(() => ({ success: true })),
  updateStudentMonthlyPrice: vi.fn(() => ({ success: true })),
}))
vi.mock('@/lib/student-actions', () => ({
  updateStudent: vi.fn(() => ({ success: true })),
  deleteStudent: vi.fn(() => ({ success: true })),
}))

const student: DashboardStudent = { id: 's1', full_name: 'أحمد علي', name: 'أحمد علي', phone: '+201234567890', monthly_price: 100, next_due_date: '2026-10-01', paymentState: 'paid' }
const payments = [
  { student_id: 's1', month: '2025-06-01', paid: true, amount_paid: 100, paid_at: '2025-06-03T00:00:00Z' },
  { student_id: 's1', month: '2025-05-01', paid: true, amount_paid: 100, paid_at: '2025-05-02T00:00:00Z' },
]

describe('StudentProfile', () => {
  it('header mirrors green/red status', () => {
    const { container } = render(<StudentProfile student={student} payments={payments} month="2025-06-01" />)
    expect(screen.getAllByText('أحمد علي').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('مدفوع').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('[class*="bg-emerald-50"]')).toBeInTheDocument()
  })

  it('every feature is its own row with obvious edit button', () => {
    render(<StudentProfile student={student} payments={payments} month="2025-06-01" />)
    for (const label of ['الاسم', REMIND_COPY.payerPhoneRowLabel, 'الاشتراك الشهري', 'تاريخ الاستحقاق', 'سجل المدفوعات']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // one تعديل per editable row (name, phone, price) — due date follows the class schedule
    expect(screen.getAllByText('تعديل').length).toBeGreaterThanOrEqual(3)
  })

  it('shows the outstanding due date without a per-student date editor', () => {
    render(<StudentProfile student={student} payments={payments} month="2025-06-01" />)
    expect(screen.getAllByText(/الاستحقاق/).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByTestId('profile-next-due')).not.toBeInTheDocument()
  })

  it('history lists past months + delete confirm exists', () => {
    render(<StudentProfile student={student} payments={payments} month="2025-06-01" />)
    expect(screen.getAllByText('حذف الطالب').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(screen.getAllByText('حذف الطالب')[1])
    expect(screen.getByText('تأكيد الحذف')).toBeInTheDocument()
  })

  it('an awaiting-start student reads "لم يبدأ بعد", not paid', () => {
    render(
      <StudentProfile
        student={{
          ...student,
          paymentState: 'awaiting_start',
          next_due_date: '2026-11-01',
          starts_on: '2026-11-01',
        }}
        payments={[]}
        month="2026-10-01"
      />,
    )
    expect(screen.getByText('لم يبدأ بعد')).toBeInTheDocument()
    expect(screen.queryByText('مدفوع')).not.toBeInTheDocument()
  })

  it('shows the previous-period-paid badge when the previous cycle settled', () => {
    render(
      <StudentProfile
        student={{ ...student, paidLastPeriod: true }}
        payments={payments}
        month="2025-06-01"
      />,
    )
    expect(screen.getByTestId('profile-paid-last-period')).toHaveTextContent('الفترة السابقة مدفوعة')
  })
})
