'use client'

// components/pay/pay-portal-onboarding.tsx
// #35 slice 7/8 — onboarding composition wrapper. NEW file; IMPORTS ONLY the
// frozen lanes (PushOnboarding above + presentational PayScreen below —
// neither is modified). Amount/period are NOT recomputed here: payData
// arrives frequency-aware from getPayScreenInfo (server, app/pay/page.tsx)
// and is surfaced as-is. The skip action only hides the onboarding card for
// this visit; the push subscription itself is managed by PushOnboarding.

import { useState } from 'react'
import { PayScreen, type PayScreenData } from '@/components/pay/pay-screen'
import {
  PushOnboarding,
  type PushOnboardingPushState,
} from '@/components/pay/push-onboarding'
import type { PaymentProof } from '@/lib/payment-proof-validation'

export function PayPortalOnboarding(props: {
  payData: PayScreenData
  proofs: PaymentProof[]
  uploading?: boolean
  uploadError?: string | null
  onFileSelected?: (file: File) => void
  /** Default true. Lets a future page hide the step (e.g. already subscribed). */
  showOnboarding?: boolean
  /** Test seam, forwarded to PushOnboarding. */
  push?: PushOnboardingPushState
  /** Test/SSR seam, forwarded to PushOnboarding. */
  iosCoachNeeded?: boolean
  onSkipOnboarding?: () => void
}) {
  const [skipped, setSkipped] = useState(false)
  const show = (props.showOnboarding ?? true) && !skipped

  function handleSkip() {
    setSkipped(true)
    props.onSkipOnboarding?.()
  }

  return (
    <div
      className="mx-auto w-full max-w-md space-y-4 p-4"
      data-testid="pay-portal-onboarding"
      dir="rtl"
    >
      {show && (
        <PushOnboarding
          push={props.push}
          iosCoachNeeded={props.iosCoachNeeded}
          onSkip={handleSkip}
        />
      )}
      <PayScreen
        data={props.payData}
        proofs={props.proofs}
        uploading={props.uploading}
        uploadError={props.uploadError}
        onFileSelected={props.onFileSelected}
      />
    </div>
  )
}
