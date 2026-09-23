'use client'

// components/pay/push-onboarding.tsx
// #35 slice 7/8 — SILENT payer push subscriber. Renders NOTHING: the payer
// gets no prompt, no choice, no skip — just the pay screen (pay → upload).
// Push subscription is attempted automatically so due/verdict pushes keep
// working: when browser permission is already granted it subscribes on mount;
// otherwise it waits for the payer's first tap anywhere (pointerdown, once)
// and subscribes then. Denials and errors are swallowed silently — the pay
// flow never depends on push. Test seam: `push` overrides the live hook.

import { useEffect, useRef } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export interface SilentPayerPushState {
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => void | Promise<void>
  unsubscribe: () => void | Promise<void>
}

function permissionGranted(): boolean {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false
  }
  try {
    return Notification.permission === 'granted'
  } catch {
    return false
  }
}

export function SilentPayerPush(props: {
  /** Test seam. Production omits it and the live hook is used. */
  push?: SilentPayerPushState
}) {
  const live = usePushNotifications()
  const push: SilentPayerPushState = props.push ?? live
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (attemptedRef.current || push.isLoading || push.isSubscribed || push.error) {
      return
    }

    const attempt = () => {
      if (attemptedRef.current) return
      attemptedRef.current = true
      try {
        void push.subscribe()
      } catch {
        // Silent by design — pay flow never depends on push.
      }
    }

    if (props.push !== undefined || permissionGranted()) {
      attempt()
      return
    }

    window.addEventListener('pointerdown', attempt, { once: true })
    return () => window.removeEventListener('pointerdown', attempt)
    // push.* intentionally read once per state change, not subscribed fully.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push.isLoading, push.isSubscribed, push.error])

  return null
}
