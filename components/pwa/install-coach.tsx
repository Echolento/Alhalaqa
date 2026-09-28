'use client'

// components/pwa/install-coach.tsx
// A2 slice — post-claim install coach. Branch by platform:
//   android → deferred InstallButton (beforeinstallprompt) + hint
//   ios     → 3-step Add-to-Home-Screen guide (no prompt API exists)
//   other   → generic guidance
// The Later skip is FAINT BY CONSTRUCTION (ghost chrome, low-contrast
// text): skipping must be a conscious decision, never the easy tap.
// Test seam: `platform` override; production auto-detects.

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Share, PlusSquare, CheckCircle2 } from 'lucide-react'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { InstallButton } from '@/components/pwa/install-button'
import { detectIosPushCoachLive } from '@/lib/ios-push-coach'

export type InstallCoachPlatform = 'android' | 'ios' | 'other'

function detectPlatform(): InstallCoachPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) return 'android'
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  return 'other'
}

export function InstallCoach(props: {
  onLater: () => void
  /** Test seam. Production omits it and the live platform is used. */
  platform?: InstallCoachPlatform
}) {
  const [livePlatform, setLivePlatform] = useState<InstallCoachPlatform>('other')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setLivePlatform(detectPlatform())
    // iOS branch also covers iPadOS-desktop-mode via the coach detector.
    if (detectIosPushCoachLive()) setLivePlatform('ios')
  }, [])

  const platform = props.platform ?? (mounted ? livePlatform : 'other')

  return (
    <Card dir="rtl" data-testid="install-coach">
      <CardHeader>
        <CardTitle className="text-base">{CLAIM_COPY.installCoachTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{CLAIM_COPY.installCoachDescription}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {platform === 'android' ? (
          <div className="space-y-2">
            <p className="text-sm">اضغط الزر أدناه لتثبيت التطبيق على جهازك.</p>
            <InstallButton />
            <p className="text-xs text-muted-foreground">{CLAIM_COPY.installCoachAndroidHint}</p>
          </div>
        ) : platform === 'ios' ? (
          <ol className="space-y-2 text-sm" data-testid="ios-install-steps">
            <li className="flex items-center gap-2">
              <Share className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{CLAIM_COPY.installCoachIosStep1}</span>
            </li>
            <li className="flex items-center gap-2">
              <PlusSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{CLAIM_COPY.installCoachIosStep2}</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{CLAIM_COPY.installCoachIosStep3}</span>
            </li>
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{CLAIM_COPY.installCoachGenericHint}</p>
        )}
        <div className="pt-1 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={props.onLater}
            className="h-auto px-2 py-1 text-xs font-normal text-muted-foreground/50 hover:text-muted-foreground"
          >
            {CLAIM_COPY.installCoachLater}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
