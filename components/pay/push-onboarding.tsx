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
import { PAY_PUSH_COPY } from '@/lib/pay-push-copy'

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

  function handleRetry() {
    attemptedRef.current = false
    try {
      attemptedRef.current = true
      void push.subscribe()
    } catch {
      // Still silent — the hint stays until subscription succeeds.
    }
  }

  // The ONLY payer-visible push UI: a blocked-only retry hint. Everything
  // else stays silent — no prompt, no choice.
  if (!push.isLoading && !push.isSubscribed && push.error) {
    return (
      <button
        type="button"
        data-testid="push-blocked-hint"
        onClick={handleRetry}
        className="w-full rounded-md bg-amber-50 px-3 py-2 text-center text-xs text-amber-800"
      >
        {PAY_PUSH_COPY.blockedHint}
      </button>
    )
  }

  return null
}
