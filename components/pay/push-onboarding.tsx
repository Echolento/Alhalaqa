'use client'

// components/pay/push-onboarding.tsx
// Payer push subscriber. Deliberately low-friction, but recoverable: it never
// fires the permission prompt without a user gesture (mobile browsers auto-deny
// gesture-less requests, and a denial is permanent — the prompt never returns).
//   - permission already granted → subscribes silently on mount;
//   - otherwise → a small tappable bar (a real gesture) requests permission;
//   - denied → settings guidance, since no code can re-prompt.
// Teacher flavor (`hideBlockedHint`) renders nothing — its dashboard prompt owns it.

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

function permissionDenied(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'denied'
}

export function SilentPayerPush(props: {
  /** Test seam. Production omits it and the live hook is used. */
  push?: SilentPayerPushState
  /** Teacher flavor: render no UI (Settings/dashboard owns the affordance). */
  hideBlockedHint?: boolean
}) {
  const live = usePushNotifications()
  const push: SilentPayerPushState = props.push ?? live
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (attemptedRef.current || push.isLoading || push.isSubscribed || push.error) return
    // Only auto-subscribe when the browser already granted permission — no
    // prompt, no risk of a gesture-less auto-deny.
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    attemptedRef.current = true
    try {
      void push.subscribe()
    } catch {
      // Silent by design.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [push.isLoading, push.isSubscribed, push.error])

  if (props.hideBlockedHint || push.isLoading || push.isSubscribed) return null

  if (permissionDenied()) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-3">
        <p
          data-testid="push-denied-help"
          className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs leading-relaxed text-amber-800"
        >
          {PAY_PUSH_COPY.deniedHelp}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-3">
      <button
        type="button"
        data-testid="push-enable"
        onClick={() => {
          try {
            void push.subscribe()
          } catch {
            // The hook surfaces errors; retry stays available.
          }
        }}
        className="w-full rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800"
      >
        {PAY_PUSH_COPY.enableBar}
      </button>
    </div>
  )
}

/**
 * Teacher twin: no UI of its own. The dashboard's TeacherNotifyPrompt is the
 * tappable affordance; this only opportunistically subscribes when permission
 * is already granted.
 */
export function SilentTeacherPush() {
  return <SilentPayerPush hideBlockedHint />
}
