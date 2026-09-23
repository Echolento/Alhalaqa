import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PayerInviteButton } from '@/components/dashboard/payer-invite-button'
import { REMIND_COPY } from '@/lib/remind-copy'

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), toasts: [], dismiss: vi.fn() }),
  toast: vi.fn(),
}))

describe('PayerInviteButton (guardian-only copy)', () => {
  it('renders the guardian-only button label', () => {
    render(<PayerInviteButton studentId="s1" studentName="أحمد" />)
    expect(screen.getByText(REMIND_COPY.inviteButtonLabel)).toBeInTheDocument()
  })

  it('explains notifications trigger on claim, guardian-only', () => {
    render(<PayerInviteButton studentId="s1" studentName="أحمد" />)
    expect(screen.getByText(REMIND_COPY.inviteButtonHelper)).toBeInTheDocument()
  })
})
