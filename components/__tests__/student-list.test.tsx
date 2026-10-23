import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentList } from '@/components/dashboard/student-list'
import type { DashboardStudent } from '@/lib/types'

vi.mock('@/lib/payment-actions', () => ({
  toggleStudentPayment: vi.fn(() => ({ success: true })),
}))

vi.mock('@/lib/student-actions', () => ({
  addStudent: vi.fn(() => ({ success: true })),
  addMultipleStudents: vi.fn(() => ({ success: true })),
}))

const students: DashboardStudent[] = [
  { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, paymentState: 'paid' },
  { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, paymentState: 'unpaid' },
]
const payments = [{ student_id: 's1', paid: true, amount_paid: 100 }]

const props = {
  students,
  payments,
  month: '2025-06',
  initialCollected: 100,
  initialExpected: 300,
  shareEntryDefaultOpen: true,
}

describe('StudentList (merged home)', () => {
  it('renders search + add entry points', () => {
    render(<StudentList {...props} />)
    expect(screen.getByPlaceholderText('البحث عن طالب...')).toBeInTheDocument()
    expect(screen.getAllByText('إضافة طالب').length).toBeGreaterThanOrEqual(1)
  })

  it('threads the teacher join code into the entry card', () => {
    render(<StudentList {...props} joinCode="ABCDEFGH" />)
    expect(screen.getByTestId('share-entry-code').textContent).toBe('ABCD-EFGH')
  })

  it.skip('renders local totals', () => {
    render(<StudentList {...props} />)
    expect(screen.getByText('المبالغ المستلمة')).toBeInTheDocument()
    expect(screen.getByText('المبالغ المتبقية')).toBeInTheDocument()
  })

  it.skip('shows the pay.alhalaqa.com share card after the stat cards when students exist', () => {
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
    const rows: DashboardStudent[] = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, claimed_by: null, paymentState: 'unpaid' },
      { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, claimed_by: 'payer-9', paymentState: 'paid' },
    ]
    const paidS2 = [{ student_id: 's2', paid: true, amount_paid: 200 }]
    render(<StudentList {...props} students={rows} payments={paidS2} />)
    expect(screen.queryByText('دعوة ولي الأمر')).not.toBeInTheDocument()
  })

  it('marks a pending-verification row amber and routes it to the queue, not the profile', () => {
    const rows: DashboardStudent[] = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, paymentState: 'pending' },
    ]
    const { container } = render(<StudentList {...props} students={rows} payments={[]} />)
    expect(screen.getAllByText('قيد المراجعة').length).toBeGreaterThanOrEqual(1)
    expect(container.querySelector('a[href="/dashboard/unpaid?student=s1"]')).toBeInTheDocument()
    expect(container.querySelector('a[href="/dashboard/students/s1"]')).toBeNull()
  })

  it('flags unclaimed phone-less rows with the missing-number badge', () => {
    const rows: DashboardStudent[] = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, claimed_by: null, phone: null, paymentState: 'unpaid' },
      { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, claimed_by: null, phone: '+201012345678', paymentState: 'unpaid' },
      { id: 's3', full_name: 'خالد', monthly_price: 50, payment_day: 1, claimed_by: 'payer-9', phone: null, paymentState: 'unpaid' },
    ]
    render(<StudentList {...props} students={rows} payments={[]} />)
    expect(screen.getByTestId('missing-phone-s1')).toBeInTheDocument()
    expect(screen.queryByTestId('missing-phone-s2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('missing-phone-s3')).not.toBeInTheDocument()
  })

  it('puts awaiting-start students in a collapsed section, not the main list', () => {
    const rows: DashboardStudent[] = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, paymentState: 'awaiting_start', starts_on: '2026-11-01' },
      { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, paymentState: 'unpaid' },
    ]
    render(<StudentList {...props} students={rows} payments={[]} />)
    expect(screen.getByTestId('awaiting-start-toggle')).toBeInTheDocument()
    expect(screen.queryByText('أحمد علي')).not.toBeInTheDocument()
    expect(screen.getByText('محمد حسن')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('awaiting-start-toggle'))
    expect(screen.getByText('أحمد علي')).toBeInTheDocument()
    expect(screen.getByText('محمد حسن')).toBeInTheDocument()
  })

  it('keeps a pending receipt actionable even when the cycle is not due', () => {
    const rows: DashboardStudent[] = [{ id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, paymentState: 'pending' }]
    const { container } = render(<StudentList {...props} students={rows} payments={[]} />)
    expect(screen.getByText('قيد المراجعة')).toBeInTheDocument()
    expect(container.querySelector('a[href="/dashboard/unpaid?student=s1"]')).toBeInTheDocument()
  })

  it('each row links to profile', () => {
    const { container } = render(<StudentList {...props} />)
    const link = container.querySelector('a[href="/dashboard/students/s1"]')
    expect(link).toBeInTheDocument()
  })

  it('overlays only the overdue students when showOverdue (?overdue=1 email CTA)', () => {
    const rows: DashboardStudent[] = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, next_due_date: '2026-10-01', paymentState: 'unpaid' },
      { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, next_due_date: '2026-10-01', paymentState: 'unpaid' },
    ]
    render(<StudentList {...props} students={rows} payments={[]} overdueIds={['s2']} showOverdue />)
    expect(screen.getByTestId('overdue-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('overdue-row-s2')).toBeInTheDocument()
    expect(screen.queryByTestId('overdue-row-s1')).not.toBeInTheDocument()
  })

  it('row shows price + next-due readouts and shared green/red status', () => {
    const rows: DashboardStudent[] = [
      { id: 's1', full_name: 'أحمد علي', monthly_price: 100, payment_day: 5, next_due_date: '2026-10-01', paymentState: 'paid' },
      { id: 's2', full_name: 'محمد حسن', monthly_price: 200, payment_day: 10, next_due_date: '2026-10-01', paymentState: 'unpaid' },
    ]
    const { container } = render(<StudentList {...props} students={rows} />)
    expect(screen.getAllByText('100 ج.م').length).toBeGreaterThanOrEqual(1)
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
    fireEvent.click(screen.getByTestId('undo-s1'))
    expect(screen.getByText('تراجع عن الدفع')).toBeInTheDocument()
    expect(screen.getByText('نعم، تراجع')).toBeInTheDocument()
  })

  it('confirming undo closes the dialog (no haunting later toggles)', async () => {
    render(<StudentList {...props} />)
    fireEvent.click(screen.getByTestId('undo-s1'))
    expect(screen.getByText('تراجع عن الدفع')).toBeInTheDocument()
    fireEvent.click(screen.getByText('نعم، تراجع'))
    expect(await screen.findByText('تحديد كمدفوع')).toBeInTheDocument()
    expect(screen.queryByText('تراجع عن الدفع')).not.toBeInTheDocument()
  })

  it('undo is a compact inline icon, never full-width red', () => {
    render(<StudentList {...props} />)
    const btn = screen.getByTestId('undo-s1')
    expect(btn.className).not.toContain('bg-destructive')
    expect(btn.className).not.toContain('w-full')
  })

  it.skip('toggle updates the received card live; remaining stays at the server value', async () => {
    render(<StudentList {...props} />)
    // pending 200 appears twice (summary card + s2 row readout)
    expect(screen.getAllByText('200 ج.م')).toHaveLength(2)
    fireEvent.click(screen.getByText('تحديد كمدفوع'))
    // received 100 -> 300 updates live; remaining is NOT re-derived from it.
    expect(await screen.findByText('300 ج.م')).toBeInTheDocument()
    expect(screen.queryByText('0 ج.م')).not.toBeInTheDocument()
  })
})
