import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RemindButton } from '@/components/dashboard/remind-button'
import { REMIND_COPY } from '@/lib/remind-copy'

const { mockSend, mockToast } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockToast: vi.fn(),
}))

vi.mock('@/lib/remind-actions', () => ({
  sendManualRemind: (...args: unknown[]) => mockSend(...args),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, toasts: [], dismiss: vi.fn() }),
  toast: mockToast,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSend.mockResolvedValue({ success: true, testMode: false })
})

describe('RemindButton', () => {
  it('renders the manual remind label with an accessible name', () => {
    render(<RemindButton studentId="s1" studentName="أحمد" payerProfileId="p1" />)
    expect(screen.getByText(REMIND_COPY.remindButtonLabel)).toBeInTheDocument()
    expect(
      screen.getByLabelText(REMIND_COPY.remindButtonAriaLabel('أحمد')),
    ).toBeInTheDocument()
  })

  it('calls the slice-1 trigger wrapper on click and toasts success', async () => {
    render(<RemindButton studentId="s1" studentName="أحمد" payerProfileId="p1" />)
    fireEvent.click(screen.getByText(REMIND_COPY.remindButtonLabel))
    await waitFor(() => expect(mockSend).toHaveBeenCalledOnce())
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 's1', payerProfileId: 'p1', studentName: 'أحمد' }),
    )
    await waitFor(() => expect(mockToast).toHaveBeenCalledOnce())
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: REMIND_COPY.remindSuccessTitle }),
    )
  })

  it('toasts the test-path copy when no payer is linked yet', async () => {
    mockSend.mockResolvedValue({ success: false, reason: 'no_payer_yet', testMode: true })
    render(<RemindButton studentId="s1" studentName="أحمد" />)
    fireEvent.click(screen.getByText(REMIND_COPY.remindButtonLabel))
    await waitFor(() => expect(mockToast).toHaveBeenCalledOnce())
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: REMIND_COPY.remindTestTitle }),
    )
  })

  it('shows the free wa.me fallback when a payer phone exists', () => {
    render(
      <RemindButton studentId="s1" studentName="أحمد" phone="+201012345678" />,
    )
    const link = screen.getByLabelText(REMIND_COPY.whatsappShareAriaLabel('أحمد'))
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/201012345678'))
  })

  it('hides the wa.me fallback when no phone is on file', () => {
    render(<RemindButton studentId="s1" studentName="أحمد" />)
    expect(
      screen.queryByLabelText(REMIND_COPY.whatsappShareAriaLabel('أحمد')),
    ).not.toBeInTheDocument()
  })
})
