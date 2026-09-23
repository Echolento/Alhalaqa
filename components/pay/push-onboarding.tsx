'use client'

// components/pay/push-onboarding.tsx
// #35 slice 7/8 — payer push-subscribe onboarding. NEW file; composes around
// the frozen lanes by IMPORT ONLY:
//   - push round-trip via usePushNotifications (which calls
//     registerPushSubscription / unregisterPushSubscription from
//     lib/push-actions.ts — push_subscriptions keyed by the caller's own
//     profile id, service-role writes, no anon writes).
//   - every Arabic string via PAY_PUSH_COPY (single source, HITL review).
//   - iOS Add-to-Home-Screen coach via lib/ios-push-coach.ts (pure, SSR-safe).
// RTL, Arabic-first. Test seam: `push` overrides the live hook, and
// `iosCoachNeeded` overrides live iOS detection (see
// components/__tests__/push-onboarding.test.tsx).

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Check, Share } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { PAY_PUSH_COPY } from '@/lib/pay-push-copy'
import { detectIosPushCoachLive } from '@/lib/ios-push-coach'

export interface PushOnboardingPushState {
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => void | Promise<void>
  unsubscribe: () => void | Promise<void>
}

export function PushOnboarding(props: {
  /** Test/SSR seam. Production omits it and the live hook is used. */
  push?: PushOnboardingPushState
  /** Test/SSR override. When undefined, auto-detected live on mount. */
  iosCoachNeeded?: boolean
  /** When provided, a "later" dismiss button is shown. */
  onSkip?: () => void
}) {
  const live = usePushNotifications()
  const push: PushOnboardingPushState = props.push ?? live

  const [liveCoach, setLiveCoach] = useState(false)
  useEffect(() => {
    if (props.iosCoachNeeded !== undefined) return
    setLiveCoach(detectIosPushCoachLive())
  }, [props.iosCoachNeeded])
  const showCoach = props.iosCoachNeeded ?? liveCoach

  return (
    <Card data-testid="push-onboarding" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5" />
          {PAY_PUSH_COPY.onboardingTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{PAY_PUSH_COPY.onboardingDescription}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          <li data-testid="push-type-due" className="flex items-start gap-2">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>{PAY_PUSH_COPY.typeDueTitle}</strong>
              {' — '}
              {PAY_PUSH_COPY.typeDueDescription}
            </span>
          </li>
          <li data-testid="push-type-pay-link" className="flex items-start gap-2">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>{PAY_PUSH_COPY.typePayLinkTitle}</strong>
              {' — '}
              {PAY_PUSH_COPY.typePayLinkDescription}
            </span>
          </li>
          <li data-testid="push-type-verdict" className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>{PAY_PUSH_COPY.typeVerdictTitle}</strong>
              {' — '}
              {PAY_PUSH_COPY.typeVerdictDescription}
            </span>
          </li>
        </ul>

        {showCoach && (
          <div
            data-testid="ios-coach"
            className="space-y-2 rounded-md border px-3 py-2 text-sm"
          >
            <p className="font-medium">{PAY_PUSH_COPY.iosCoachTitle}</p>
            <p className="text-muted-foreground">{PAY_PUSH_COPY.iosCoachDescription}</p>
            <ol className="list-decimal space-y-1 pr-5">
              {PAY_PUSH_COPY.iosCoachSteps.map((step) => (
                <li key={step} data-testid="ios-coach-step">
                  {step}
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">{PAY_PUSH_COPY.iosCoachNote}</p>
          </div>
        )}

        {push.isLoading ? (
          <p data-testid="push-loading" className="text-sm text-muted-foreground">
            {PAY_PUSH_COPY.loadingLabel}
          </p>
        ) : push.isSubscribed ? (
          <div className="space-y-2">
            <p data-testid="push-subscribed" className="text-sm font-medium">
              {PAY_PUSH_COPY.subscribedLabel}
            </p>
            <p className="text-xs text-muted-foreground">{PAY_PUSH_COPY.subscribedNote}</p>
            <Button
              variant="outline"
              className="w-full"
              data-testid="push-unsubscribe"
              aria-label={PAY_PUSH_COPY.unsubscribeAriaLabel}
              onClick={() => void push.unsubscribe()}
            >
              {PAY_PUSH_COPY.unsubscribeLabel}
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            data-testid="push-subscribe"
            aria-label={PAY_PUSH_COPY.subscribeAriaLabel}
            onClick={() => void push.subscribe()}
          >
            <Bell className="h-4 w-4" />
            {PAY_PUSH_COPY.subscribeCta}
          </Button>
        )}

        {push.error && (
          <p role="alert" className="text-sm text-destructive">
            {push.error}
          </p>
        )}

        {props.onSkip && (
          <Button
            variant="ghost"
            className="w-full"
            data-testid="push-onboarding-skip"
            aria-label={PAY_PUSH_COPY.skipAriaLabel}
            onClick={props.onSkip}
          >
            {PAY_PUSH_COPY.skipLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
