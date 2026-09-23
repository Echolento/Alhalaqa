// app/pay/layout.tsx
// #35 slice 7/8 — NEW layout wrapper. Mounts the silent payer push
// subscriber WITHOUT modifying app/pay/page.tsx (frozen lane): Next.js nests
// page.tsx as {children} automatically. The subscriber renders nothing —
// the payer sees only the pay screen (amount → InstaPay → upload).

import type { ReactNode } from 'react'
import { SilentPayerPush } from '@/components/pay/push-onboarding'

export default function PayLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SilentPayerPush />
      <main>{children}</main>
    </>
  )
}
