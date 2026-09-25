import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PayScreen, type PayScreenData } from '@/components/pay/pay-screen'

const baseData: PayScreenData = {
  studentName: 'أحمد',
  amount: 200,
  currency: 'EGP',
  periodKey: '2026-09-01',
  dueDateLabel: '5 سبتمبر 2026',
  instapayLink: 'https://ipn.eg/S/abc123',
  instapayHandle: 'ahmed@instapay',
  hasPending: false,
  isPaidForPeriod: false,
}

describe('PayScreen', () => {
  it('shows the amount due from getDuePeriodInfo', () => {
    render(<PayScreen data={baseData} proofs={[]} />)
    expect(screen.getByTestId('amount-due')).toHaveTextContent('200')
    expect(screen.getByTestId('period-key')).toHaveTextContent('2026-09-01')
  })

  it('renders the teacher InstaPay link button from getInstaPayContract', () => {
    render(<PayScreen data={baseData} proofs={[]} />)
    const link = screen.getByTestId('instapay-link')
    expect(link).toHaveAttribute('href', 'https://ipn.eg/S/abc123')
    expect(screen.getByTestId('instapay-handle')).toHaveTextContent('ahmed@instapay')
  })

  it('shows a big paid disclaimer and hides pay/upload when period is paid', () => {
    render(
      <PayScreen data={{ ...baseData, isPaidForPeriod: true }} proofs={[]} />,
    )
    expect(screen.getByTestId('paid-disclaimer')).toHaveTextContent('مدفوع')
    expect(screen.getByTestId('paid-disclaimer')).toHaveTextContent('2026-09-01')
    expect(screen.queryByTestId('instapay-link')).not.toBeInTheDocument()
    expect(screen.queryByTestId('receipt-upload')).not.toBeInTheDocument()
  })

  it('shows a fallback when the teacher has no InstaPay configured', () => {
    render(
      <PayScreen
        data={{ ...baseData, instapayLink: null, instapayHandle: null }}
        proofs={[]}
      />,
    )
    expect(screen.getByText(/تواصل مع المعلم/)).toBeInTheDocument()
    expect(screen.queryByTestId('instapay-link')).not.toBeInTheDocument()
  })

  it('offers an image-only upload input (camera/gallery)', () => {
    render(<PayScreen data={baseData} proofs={[]} />)
    const input = screen.getByTestId('receipt-upload') as HTMLInputElement
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('type', 'file')
  })

  it('shows the pending-review confirmation when a proof is pending', () => {
    render(
      <PayScreen
        data={{ ...baseData, hasPending: true }}
        proofs={[
          {
            id: 'p1',
            student_id: 'stu-1',
            period_key: '2026-09-01',
            storage_path: 'a',
            status: 'pending',
            teacher_note: null,
            created_at: '2026-09-02T00:00:00Z',
          },
        ]}
      />,
    )
    expect(screen.getByTestId('pending-banner')).toHaveTextContent('قيد المراجعة')
  })

  it('lists submission history with all three statuses and the teacher note', () => {
    render(
      <PayScreen
        data={baseData}
        proofs={[
          { id: 'p1', student_id: 'stu-1', period_key: '2026-09-01', storage_path: 'a', status: 'pending', teacher_note: null, created_at: '2026-09-02T00:00:00Z' },
          { id: 'p2', student_id: 'stu-1', period_key: '2026-08-01', storage_path: 'b', status: 'verified', teacher_note: null, created_at: '2026-08-02T00:00:00Z' },
          { id: 'p3', student_id: 'stu-1', period_key: '2026-07-01', storage_path: 'c', status: 'rejected', teacher_note: 'الصورة غير واضحة', created_at: '2026-07-02T00:00:00Z' },
        ]}
      />,
    )
    expect(screen.getByTestId('proof-status-p1')).toHaveTextContent('قيد المراجعة')
    expect(screen.getByTestId('proof-status-p2')).toHaveTextContent('مقبول')
    expect(screen.getByTestId('proof-status-p3')).toHaveTextContent('مرفوض')
    expect(screen.getByText('الصورة غير واضحة')).toBeInTheDocument()
  })

  it('previews first, uploads only on confirm (wrong pic swappable)', () => {
    const onFileSelected = vi.fn()
    render(<PayScreen data={baseData} proofs={[]} onFileSelected={onFileSelected} />)
    const input = screen.getByTestId('receipt-upload') as HTMLInputElement
    const file = new File(['bytes'], 'receipt.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    // Staged, NOT sent.
    expect(onFileSelected).not.toHaveBeenCalled()
    expect(screen.getByTestId('upload-preview')).toBeInTheDocument()
    // Retake swaps without sending.
    const wrong = new File(['nope'], 'wrong.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [wrong] } })
    expect(onFileSelected).not.toHaveBeenCalled()
    // Confirm sends the staged file.
    fireEvent.click(screen.getByTestId('upload-confirm'))
    expect(onFileSelected).toHaveBeenCalledOnce()
    expect(onFileSelected.mock.calls[0][0].name).toBe('wrong.jpg')
  })
})
