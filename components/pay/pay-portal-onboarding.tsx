'use client'

// components/pay/pay-portal-onboarding.tsx
// #35 slice 7/8 — portal composition wrapper. IMPORTS ONLY the frozen lanes
// (silent push subscriber + presentational PayScreen — neither is modified).
// No prompt, no choice, no skip: the payer sees amount → InstaPay → upload.
// Amount/period are NOT recomputed here: payData arrives frequency-aware from
// getPayScreenInfo (server, app/pay/page.tsx) and is surfaced as-is.

import { PayScreen, type PayScreenData } from '@/components/pay/pay-screen'
import {
  SilentPayerPush,
  type SilentPayerPushState,
} from '@/components/pay/push-onboarding'
import type { PaymentProof } from '@/lib/payment-proof-validation'

export function PayPortalOnboarding(props: {
  payData: PayScreenData
  proofs: PaymentProof[]
  uploading?: boolean
  uploadError?: string | null
  onFileSelected?: (file: File) => void
  /** Test seam, forwarded to the silent subscriber. */
  push?: SilentPayerPushState
}) {
  return (
    <div
      className="mx-auto w-full max-w-md space-y-4 p-4"
      data-testid="pay-portal-onboarding"
      dir="rtl"
    >
      <SilentPayerPush push={props.push} />
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
