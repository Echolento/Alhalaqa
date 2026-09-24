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

vi.mock('@/lib/claim-actions', () => ({
  issueClaimLink: vi.fn(),
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

  it('shares via wa.me with the claim link attached — never naked', async () => {
    const { issueClaimLink } = await import('@/lib/claim-actions')
    vi.mocked(issueClaimLink).mockResolvedValue({
      claimUrl: 'https://x.test/claim?token=clm_abc',
      expiresAt: 'x',
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(
      <RemindButton studentId="s1" studentName="أحمد" phone="+201012345678" />,
    )
    fireEvent.click(screen.getByLabelText(REMIND_COPY.whatsappShareAriaLabel('أحمد')))
    await waitFor(() => expect(issueClaimLink).toHaveBeenCalledWith('s1'))
    expect(openSpy).toHaveBeenCalledOnce()
    const sharedUrl = openSpy.mock.calls[0][0] as string
    expect(sharedUrl).toContain('https://wa.me/201012345678')
    // The claim link rides inside the message text.
    expect(decodeURIComponent(sharedUrl)).toContain('https://x.test/claim?token=clm_abc')
    openSpy.mockRestore()
  })

  it('toasts instead of sharing naked when link minting fails', async () => {
    const { issueClaimLink } = await import('@/lib/claim-actions')
    vi.mocked(issueClaimLink).mockResolvedValue({ error: 'boom' })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(
      <RemindButton studentId="s1" studentName="أحمد" phone="+201012345678" />,
    )
    fireEvent.click(screen.getByLabelText(REMIND_COPY.whatsappShareAriaLabel('أحمد')))
    await waitFor(() => expect(issueClaimLink).toHaveBeenCalled())
    expect(openSpy).not.toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: REMIND_COPY.remindFailTitle }),
    )
    openSpy.mockRestore()
  })

  it('hides the wa.me fallback when no phone is on file', () => {
    render(<RemindButton studentId="s1" studentName="أحمد" />)
    expect(
      screen.queryByLabelText(REMIND_COPY.whatsappShareAriaLabel('أحمد')),
    ).not.toBeInTheDocument()
  })
})
