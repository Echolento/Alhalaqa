// Portal: no prompt, no choice — pay Data + upload only, silent push underneath.
// Push hook module mocked; PayScreen props stand in for server-computed
// getPayScreenInfo (frequency-aware amount/period surfaced, never recomputed).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PayPortalOnboarding } from '@/components/pay/pay-portal-onboarding'
import type { PayScreenData } from '@/components/pay/pay-screen'
import { usePushNotifications } from '@/hooks/use-push-notifications'

vi.mock('@/hooks/use-push-notifications', () => ({
  usePushNotifications: vi.fn(),
}))

const mockUsePush = vi.mocked(usePushNotifications)

function stubPush(overrides: Record<string, unknown> = {}) {
  const subscribe = vi.fn()
  const unsubscribe = vi.fn()
  mockUsePush.mockReturnValue({
    isSubscribed: false,
    isLoading: false,
    error: null,
    toggle: vi.fn(),
    subscribe,
    unsubscribe,
    ...overrides,
  } as unknown as ReturnType<typeof usePushNotifications>)
  return { subscribe, unsubscribe }
}

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

beforeEach(() => {
  vi.clearAllMocks()
  stubPush()
})

describe('PayPortalOnboarding (no payer choice)', () => {
  it('shows no prompt UI — only due + upload', () => {
    render(<PayPortalOnboarding payData={baseData} proofs={[]} />)
    expect(screen.queryByTestId('push-onboarding')).not.toBeInTheDocument()
    expect(screen.queryByTestId('push-subscribe')).not.toBeInTheDocument()
    expect(screen.getByTestId('pay-portal-onboarding')).toBeInTheDocument()
  })

  it('silently subscribes underneath while payer views due', () => {
    stubPush()
    const subscribe = vi.fn()
    render(
      <PayPortalOnboarding
        payData={baseData}
        proofs={[]}
        push={{
          isSubscribed: false,
          isLoading: false,
          error: null,
          subscribe,
          unsubscribe: vi.fn(),
        }}
      />,
    )

    expect(subscribe).toHaveBeenCalledOnce()

    // Frequency-aware due surfaced as-is from getPayScreenInfo.
    expect(screen.getByTestId('amount-due')).toHaveTextContent('200')
    expect(screen.getByTestId('period-key')).toHaveTextContent('2026-09-01')
  })

  it('pay → upload in one screen', () => {
    const onFileSelected = vi.fn()
    render(
      <PayPortalOnboarding
        payData={baseData}
        proofs={[]}
        onFileSelected={onFileSelected}
      />,
    )
    expect(screen.getByTestId('instapay-link')).toBeInTheDocument()

    const input = screen.getByTestId('receipt-upload') as HTMLInputElement
    const file = new File(['bytes'], 'receipt.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFileSelected).toHaveBeenCalledOnce()
    expect(onFileSelected.mock.calls[0][0].name).toBe('receipt.jpg')
  })

  it('shows the pending-review banner through the wrapper', () => {
    render(
      <PayPortalOnboarding
        payData={{ ...baseData, hasPending: true }}
        proofs={[]}
      />,
    )
    expect(screen.getByTestId('pending-banner')).toHaveTextContent('قيد المراجعة')
  })
})
