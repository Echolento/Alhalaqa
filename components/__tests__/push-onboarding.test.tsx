// Silent payer push subscriber: no prompt, no choice, no UI.
// Browser push APIs are never touched directly — the injected `push` seam
// drives states; the live-hook path stubs Notification.permission.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SilentPayerPush } from '@/components/pay/push-onboarding'
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
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SilentPayerPush (no payer choice)', () => {
  it('renders nothing — payer sees only the pay screen', () => {
    const { container } = render(
      <SilentPayerPush
        push={{
          isSubscribed: false,
          isLoading: false,
          error: null,
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        }}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('subscribes once on mount when unsubscribed (seam)', () => {
    const subscribe = vi.fn()
    render(
      <SilentPayerPush
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
  })

  it('does nothing when already subscribed or errored', () => {
    const subscribedSub = vi.fn()
    const { unmount } = render(
      <SilentPayerPush
        push={{
          isSubscribed: true,
          isLoading: false,
          error: null,
          subscribe: subscribedSub,
          unsubscribe: vi.fn(),
        }}
      />,
    )
    expect(subscribedSub).not.toHaveBeenCalled()
    unmount()

    const errorSub = vi.fn()
    render(
      <SilentPayerPush
        push={{
          isSubscribed: false,
          isLoading: false,
          error: 'boom',
          subscribe: errorSub,
          unsubscribe: vi.fn(),
        }}
      />,
    )
    expect(errorSub).not.toHaveBeenCalled()
  })

  it('live path: subscribes on mount when permission already granted', () => {
    vi.stubGlobal('Notification', { permission: 'granted' })
    const { subscribe } = stubPush()
    render(<SilentPayerPush />)
    expect(subscribe).toHaveBeenCalledOnce()
  })

  it('live path: waits for first tap when permission undecided', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    const { subscribe } = stubPush()
    render(<SilentPayerPush />)
    expect(subscribe).not.toHaveBeenCalled()

    fireEvent.pointerDown(document.body)
    expect(subscribe).toHaveBeenCalledOnce()

    // Once only — second tap is a no-op.
    fireEvent.pointerDown(document.body)
    expect(subscribe).toHaveBeenCalledOnce()
  })

  it('live path: stays silent when permission denied', () => {
    vi.stubGlobal('Notification', { permission: 'denied' })
    const { subscribe } = stubPush()
    const { container } = render(<SilentPayerPush />)
    fireEvent.pointerDown(document.body)
    // Hook owns the denial copy; subscriber adds no UI of its own.
    expect(container.innerHTML).toBe('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
