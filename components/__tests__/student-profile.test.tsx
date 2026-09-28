import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StudentProfile } from '@/components/dashboard/student-profile'
import { REMIND_COPY } from '@/lib/remind-copy'

vi.mock('@/lib/student-actions', () => ({
  updateStudent: vi.fn(() => ({ success: true })),
  deleteStudent: vi.fn(() => ({ success: true })),
}))
vi.mock('@/lib/payment-actions', () => ({
  toggleStudentPayment: vi.fn(() => ({ success: true })),
  updateStudentMonthlyPrice: vi.fn(() => ({ success: true })),
}))
vi.mock('@/lib/student-actions', () => ({
  updateStudent: vi.fn(() => ({ success: true })),
  deleteStudent: vi.fn(() => ({ success: true })),
  updateStudentNextDue: vi.fn(() => ({ success: true })),
}))

const student = { id: 's1', full_name: 'أحمد علي', name: 'أحمد علي', phone: '+201234567890', monthly_price: 100, next_due_date: '2026-10-01' }
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
    for (const label of ['الاسم', REMIND_COPY.payerPhoneRowLabel, 'الاشتراك الشهري', 'تاريخ الاستحقاق', 'سجل المدفوعات']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // one تعديل per editable row (name, phone, price, next-due) — obvious buttons
    expect(screen.getAllByText('تعديل').length).toBeGreaterThanOrEqual(4)
  })

  it('header and row show the outstanding due date, editable via date input', async () => {
    const { updateStudentNextDue } = await import('@/lib/student-actions')
    render(<StudentProfile student={student} payments={payments} month="2025-06-01" currency="SAR" />)
    expect(screen.getAllByText(/الاستحقاق/).length).toBeGreaterThanOrEqual(1)
    fireEvent.click(screen.getAllByText('تعديل')[3]!)
    const input = await screen.findByTestId('profile-next-due')
    fireEvent.change(input, { target: { value: '2026-11-03' } })
    fireEvent.click(screen.getByTestId('profile-next-due-save'))
    await waitFor(() =>
      expect(vi.mocked(updateStudentNextDue)).toHaveBeenCalledWith('s1', '2026-11-03'),
    )
  })

  it('history lists past months + delete confirm exists', () => {
    render(<StudentProfile student={student} payments={payments} month="2025-06-01" currency="SAR" />)
    expect(screen.getAllByText('حذف الطالب').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(screen.getAllByText('حذف الطالب')[1])
    expect(screen.getByText('تأكيد الحذف')).toBeInTheDocument()
  })
})
