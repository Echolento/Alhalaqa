'use client'

// components/dashboard/my-payments-link.tsx
// B slice — conditional مدفوعاتي shortcut. Renders ONLY when `visible`
// (the server page sets it via callerHasClaimedStudents): the teacher is
// also a payer. Plain link to the payer hub — no auto-detect, no magic.

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, ChevronLeft } from 'lucide-react'
import { CLAIM_COPY } from '@/lib/claim-copy'

export function MyPaymentsLink(props: { visible: boolean }) {
  if (!props.visible) return null
  return (
    <Card data-testid="my-payments-wrap">
      <CardContent className="p-0">
        <Link
          href="/pay"
          data-testid="my-payments-link"
          className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 hover:bg-muted/50"
        >
          <span className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <span>
              <span className="block font-medium">{CLAIM_COPY.myPaymentsLabel}</span>
              <span className="block text-xs text-muted-foreground">
                {CLAIM_COPY.myPaymentsDescription}
              </span>
            </span>
          </span>
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
      </CardContent>
    </Card>
  )
}
