// hooks/__tests__/use-push-notifications.test.tsx
// The subscription re-link: a browser-level subscription must be written to
// push_subscriptions for the CURRENT profile, or pushes silently no-op.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { registerPushSubscription } from '@/lib/push-actions'

vi.mock('@/lib/push-actions', () => ({
  registerPushSubscription: vi.fn(async () => ({ success: true })),
  unregisterPushSubscription: vi.fn(async () => ({ success: true })),
}))

function stubBrowser(sub: unknown) {
  const reg = { active: true, pushManager: { getSubscription: async () => sub } }
  vi.stubGlobal('navigator', {
    serviceWorker: {
      register: vi.fn(async () => reg),
      ready: Promise.resolve(reg),
      getRegistrations: vi.fn(async () => [reg]),
    },
  })
  vi.stubGlobal('PushManager', function PushManager() {})
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePushNotifications', () => {
  it('re-links an existing browser subscription to the current profile', async () => {
    const sub = {
      toJSON: () => ({ endpoint: 'https://push.example/x', keys: { p256dh: 'p', auth: 'a' } }),
      unsubscribe: vi.fn(),
    }
    stubBrowser(sub)
    const { result } = renderHook(() => usePushNotifications())
    await waitFor(() => expect(result.current.isSubscribed).toBe(true))
    await waitFor(() =>
      expect(registerPushSubscription).toHaveBeenCalledWith({
        endpoint: 'https://push.example/x',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    )
  })

  it('does not register anything when the browser has no subscription', async () => {
    stubBrowser(null)
    const { result } = renderHook(() => usePushNotifications())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isSubscribed).toBe(false)
    expect(registerPushSubscription).not.toHaveBeenCalled()
  })
})
