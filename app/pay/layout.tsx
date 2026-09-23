// app/pay/layout.tsx
// #35 slice 7/8 — NEW layout wrapper. Renders the payer push-onboarding step
// above the existing pay screen WITHOUT modifying app/pay/page.tsx (frozen
// lane): Next.js nests page.tsx as {children} automatically. Amount/period
// stay server-computed in page.tsx via getPayScreenInfo; this layout only
// adds the onboarding card on top, width-matched to the page content.

import type { ReactNode } from 'react'
import { PushOnboarding } from '@/components/pay/push-onboarding'

export default function PayLayout({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl">
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <PushOnboarding />
      </div>
      <main>{children}</main>
    </div>
  )
}
