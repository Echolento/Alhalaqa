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

  it('shows the pay.alhalaqa.com share card after the stat cards when students exist', () => {
    render(<StudentList {...props} />)
    const stats = screen.getByText('المبالغ المستلمة').closest('[class*="grid-cols-2"]')!
    const shareCard = screen.getByTestId('share-entry-card')
    expect(stats.compareDocumentPosition(shareCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('hides the pay.alhalaqa.com share card until there is at least one student', () => {
    render(<StudentList {...props} students={[]} payments={[]} initialCollected={0} initialExpected={0} />)
    expect(screen.queryByTestId('share-entry-card')).not.toBeInTheDocument()
  })

  it('filters rows by search', () => {
    render(<StudentList {...props} />)
    fireEvent.change(screen.getByPlaceholderText('البحث عن طالب...'), { target: { value: 'محمد' } })
    expect(screen.queryByText('أحمد علي')).not.toBeInTheDocument()
    expect(screen.getByText('محمد حسن')).toBeInTheDocument()
  })

  it('does not show a per-student invite CTA on unclaimed roster cards', () => {
    const rows = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, claimed_by: null },
      { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, claimed_by: 'payer-9' },
    ]
    const paidS2 = [{ student_id: 's2', paid: true, amount_paid: 200 }]
    render(<StudentList {...props} students={rows} payments={paidS2} />)
    expect(screen.queryByText('دعوة ولي الأمر')).not.toBeInTheDocument()
  })

  it('flags unclaimed phone-less rows with the missing-number badge', () => {
    const rows = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, claimed_by: null, phone: null },
      { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, claimed_by: null, phone: '+201012345678' },
      { id: 's3', full_name: 'خالد', monthly_price: 50, payment_day: 1, claimed_by: 'payer-9', phone: null },
    ]
    render(<StudentList {...props} students={rows} payments={[]} />)
    expect(screen.getByTestId('missing-phone-s1')).toBeInTheDocument()
    expect(screen.queryByTestId('missing-phone-s2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('missing-phone-s3')).not.toBeInTheDocument()
  })

  it('each row links to profile', () => {
    const { container } = render(<StudentList {...props} />)
    const link = container.querySelector('a[href="/dashboard/students/s1"]')
    expect(link).toBeInTheDocument()
  })

  it('row shows price + next-due readouts and shared green/red status', () => {
    const rows = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, next_due_date: '2026-10-01' },
      { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, next_due_date: '2026-10-01' },
    ]
    const { container } = render(<StudentList {...props} students={rows} />)
    expect(screen.getAllByText('100 ر.س').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/الاستحقاق/).length).toBeGreaterThanOrEqual(1)
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
