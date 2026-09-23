// UNVERIFIED — written under the #35 zero-shell constraint (no test run yet).
// Run pending: npx vitest run components/__tests__/pay-portal-onboarding.test.tsx
// Portal happy path (mocked boundaries): subscribe -> view due -> upload.
// Push hook module mocked (settings-form convention); PayScreen props stand
// in for the server-computed getPayScreenInfo (frequency-aware amount/period
// are surfaced, never recomputed, by the wrapper).
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
}

beforeEach(() => {
  vi.clearAllMocks()
  stubPush()
})

describe('PayPortalOnboarding (portal happy path)', () => {
  it('subscribe -> view due -> upload in one portal', () => {
    const { subscribe } = stubPush()
    const onFileSelected = vi.fn()
    render(<PayPortalOnboarding payData={baseData} proofs={[]} onFileSelected={onFileSelected} />)

    // Onboarding step above the pay screen.
    expect(screen.getByTestId('push-onboarding')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('push-subscribe'))
    expect(subscribe).toHaveBeenCalledOnce()

    // Frequency-aware due surfaced as-is from getPayScreenInfo.
    expect(screen.getByTestId('amount-due')).toHaveTextContent('200')
    expect(screen.getByTestId('period-key')).toHaveTextContent('2026-09-01')

    // Upload boundary reports the chosen file upward.
    const input = screen.getByTestId('receipt-upload') as HTMLInputElement
    const file = new File(['bytes'], 'receipt.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFileSelected).toHaveBeenCalledOnce()
    expect(onFileSelected.mock.calls[0][0].name).toBe('receipt.jpg')
  })

  it('keeps the pay screen intact once subscribed', () => {
    stubPush({ isSubscribed: true })
    render(<PayPortalOnboarding payData={baseData} proofs={[]} />)
    expect(screen.getByTestId('push-subscribed')).toBeInTheDocument()
    expect(screen.getByTestId('amount-due')).toHaveTextContent('200')
    expect(screen.getByTestId('instapay-link')).toBeInTheDocument()
  })

  it('shows the pending-review banner through the wrapper', () => {
    render(<PayPortalOnboarding payData={{ ...baseData, hasPending: true }} proofs={[]} />)
    expect(screen.getByTestId('pending-banner')).toHaveTextContent('قيد المراجعة')
  })

  it('hides onboarding with showOnboarding=false but keeps the pay screen', () => {
    render(<PayPortalOnboarding payData={baseData} proofs={[]} showOnboarding={false} />)
    expect(screen.queryByTestId('push-onboarding')).not.toBeInTheDocument()
    expect(screen.getByTestId('amount-due')).toBeInTheDocument()
  })

  it('skip hides onboarding and notifies the parent', () => {
    const onSkipOnboarding = vi.fn()
    render(
      <PayPortalOnboarding payData={baseData} proofs={[]} onSkipOnboarding={onSkipOnboarding} />,
    )
    fireEvent.click(screen.getByTestId('push-onboarding-skip'))
    expect(onSkipOnboarding).toHaveBeenCalledOnce()
    expect(screen.queryByTestId('push-onboarding')).not.toBeInTheDocument()
    expect(screen.getByTestId('amount-due')).toBeInTheDocument()
  })
})
