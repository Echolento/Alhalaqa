// Payer push subscriber: silent when it can be, recoverable when it can't.
// Never fires the permission prompt without a gesture; denied shows guidance.
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

describe('SilentPayerPush (recoverable)', () => {
  it('renders nothing once subscribed', () => {
    const { container } = render(
      <SilentPayerPush
        push={{ isSubscribed: true, isLoading: false, error: null, subscribe: vi.fn(), unsubscribe: vi.fn() }}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing for the teacher flavor', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    stubPush()
    const { container } = render(<SilentPayerPush hideBlockedHint />)
    expect(container.innerHTML).toBe('')
  })

  it('shows a tappable enable bar and asks on tap', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    const { subscribe } = stubPush()
    render(<SilentPayerPush />)
    const btn = screen.getByTestId('push-enable')
    fireEvent.click(btn)
    expect(subscribe).toHaveBeenCalled()
  })

  it('shows settings guidance (not a dead button) when permission is denied', () => {
    vi.stubGlobal('Notification', { permission: 'denied' })
    stubPush()
    render(<SilentPayerPush />)
    expect(screen.getByTestId('push-denied-help')).toBeInTheDocument()
    expect(screen.queryByTestId('push-enable')).not.toBeInTheDocument()
  })

  it('auto-subscribes on mount only when permission is already granted', () => {
    vi.stubGlobal('Notification', { permission: 'granted' })
    const { subscribe } = stubPush()
    render(<SilentPayerPush />)
    expect(subscribe).toHaveBeenCalledOnce()
  })

  it('does NOT ask on mount when permission is undecided (needs a gesture)', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    const { subscribe } = stubPush()
    render(<SilentPayerPush />)
    expect(subscribe).not.toHaveBeenCalled()
  })
})
