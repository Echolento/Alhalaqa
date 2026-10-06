import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TeacherNotifyPrompt } from '@/components/dashboard/teacher-notify-prompt'
import { usePushNotifications } from '@/hooks/use-push-notifications'

vi.mock('@/hooks/use-push-notifications', () => ({
  usePushNotifications: vi.fn(),
}))

const mockUsePush = vi.mocked(usePushNotifications)

function pushState(overrides: Partial<ReturnType<typeof usePushNotifications>> = {}) {
  return {
    isSubscribed: false,
    isLoading: false,
    error: null as string | null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    toggle: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TeacherNotifyPrompt', () => {
  it('renders a tappable enable prompt when the teacher is not subscribed', () => {
    mockUsePush.mockReturnValue(pushState())
    render(<TeacherNotifyPrompt />)
    expect(screen.getByTestId('teacher-notify-prompt')).toBeTruthy()
    expect(screen.getByRole('button', { name: /تفعيل/ })).toBeTruthy()
  })

  it('enables push on tap (a user gesture, so mobile can prompt)', () => {
    const subscribe = vi.fn()
    mockUsePush.mockReturnValue(pushState({ subscribe }))
    render(<TeacherNotifyPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /تفعيل/ }))
    expect(subscribe).toHaveBeenCalledOnce()
  })

  it('renders nothing once subscribed or while loading', () => {
    mockUsePush.mockReturnValue(pushState({ isSubscribed: true }))
    const { container: subscribed } = render(<TeacherNotifyPrompt />)
    expect(subscribed.innerHTML).toBe('')
    mockUsePush.mockReturnValue(pushState({ isLoading: true }))
    const { container: loading } = render(<TeacherNotifyPrompt />)
    expect(loading.innerHTML).toBe('')
  })
})
