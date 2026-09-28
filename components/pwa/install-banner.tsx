'use client'

// components/pwa/install-banner.tsx
// B slice — /pay re-nag banner. Shows on EVERY visit until the app is
// installed (standalone check on mount). Dismiss is per-visit state only —
// nothing persists, so the nag returns next visit by design. Renders
// nothing when already installed.

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { BellRing, X } from 'lucide-react'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { isStandaloneDisplay } from '@/hooks/use-install-prompt'

export function InstallBanner() {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || dismissed || isStandaloneDisplay()) return null

  return (
    <div
      data-testid="install-banner"
      dir="rtl"
      className="mx-auto flex w-full max-w-md items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2"
    >
      <BellRing className="h-5 w-5 shrink-0 text-muted-foreground" />
      <p className="flex-1 text-xs leading-relaxed">{CLAIM_COPY.installBannerTitle}</p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        data-testid="install-banner-dismiss"
        aria-label="إغلاق"
        onClick={() => setDismissed(true)}
        className="h-8 w-8 shrink-0 p-0 text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
