// UNVERIFIED — written under the #35 zero-shell constraint (no test run yet).
// Run pending: npx vitest run components/__tests__/push-onboarding.test.tsx
// Conventions follow components/__tests__/settings-form.test.tsx: push APIs
// are mocked at the boundary (here the usePushNotifications hook module,
// which itself wraps register/unregisterPushSubscription), browser push APIs
// (Notification / serviceWorker) are never touched — the injected `push` prop
// and `iosCoachNeeded` seams drive the states instead.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PushOnboarding } from '@/components/pay/push-onboarding'
import { PAY_PUSH_COPY } from '@/lib/pay-push-copy'
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

beforeEach(() => {
  vi.clearAllMocks()
  stubPush()
})

describe('PushOnboarding (payer push subscribe)', () => {
  it('renders the prompt with all 3 notification types in Arabic RTL', () => {
    render(<PushOnboarding />)
    expect(screen.getByTestId('push-onboarding')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText(PAY_PUSH_COPY.onboardingTitle)).toBeInTheDocument()
    expect(screen.getByTestId('push-type-due')).toHaveTextContent(
      PAY_PUSH_COPY.typeDueTitle,
    )
    expect(screen.getByTestId('push-type-pay-link')).toHaveTextContent(
      PAY_PUSH_COPY.typePayLinkTitle,
    )
    expect(screen.getByTestId('push-type-verdict')).toHaveTextContent(
      PAY_PUSH_COPY.typeVerdictTitle,
    )
  })

  it('round-trips subscribe -> subscribed -> unsubscribe', () => {
    const { subscribe } = stubPush()
    const { rerender } = render(<PushOnboarding />)

    fireEvent.click(screen.getByTestId('push-subscribe'))
    expect(subscribe).toHaveBeenCalledOnce()

    const afterSubscribe = stubPush({ isSubscribed: true })
    rerender(<PushOnboarding />)
    expect(screen.getByTestId('push-subscribed')).toHaveTextContent(
      PAY_PUSH_COPY.subscribedLabel,
    )

    fireEvent.click(screen.getByTestId('push-unsubscribe'))
    expect(afterSubscribe.unsubscribe).toHaveBeenCalledOnce()
  })

  it('shows loading state while the hook resolves', () => {
    stubPush({ isLoading: true })
    render(<PushOnboarding />)
    expect(screen.getByTestId('push-loading')).toHaveTextContent(
      PAY_PUSH_COPY.loadingLabel,
    )
    expect(screen.queryByTestId('push-subscribe')).not.toBeInTheDocument()
  })

  it('surfaces hook errors as an alert', () => {
    stubPush({ error: 'boom' })
    render(<PushOnboarding />)
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })

  it('hides the iOS coach by default (non-iOS) and shows it on override', () => {
    const { rerender } = render(<PushOnboarding />)
    expect(screen.queryByTestId('ios-coach')).not.toBeInTheDocument()

    rerender(<PushOnboarding iosCoachNeeded />)
    expect(screen.getByTestId('ios-coach')).toHaveTextContent(
      PAY_PUSH_COPY.iosCoachTitle,
    )
    expect(screen.getAllByTestId('ios-coach-step').length).toBeGreaterThanOrEqual(3)
    // Subscribe stays available alongside the coach.
    expect(screen.getByTestId('push-subscribe')).toBeInTheDocument()
  })

  it('shows no skip button without onSkip; calls onSkip when provided', () => {
    const { rerender } = render(<PushOnboarding />)
    expect(screen.queryByTestId('push-onboarding-skip')).not.toBeInTheDocument()

    const onSkip = vi.fn()
    rerender(<PushOnboarding onSkip={onSkip} />)
    fireEvent.click(screen.getByTestId('push-onboarding-skip'))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('honours the injected push seam over the hook', () => {
    stubPush({ isSubscribed: false })
    render(
      <PushOnboarding
        push={{
          isSubscribed: true,
          isLoading: false,
          error: null,
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        }}
      />,
    )
    expect(screen.getByTestId('push-subscribed')).toBeInTheDocument()
  })
})
