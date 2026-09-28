'use client'

// components/pwa/install-nudge.tsx
// B slice — dashboard settings install card. Hidden when already running
// standalone. Otherwise the shared InstallCoach (Later hides it for this
// session — the card returns next visit until installed).

import { useEffect, useState } from 'react'
import { InstallCoach } from '@/components/pwa/install-coach'
import { isStandaloneDisplay } from '@/hooks/use-install-prompt'

export function InstallNudge() {
  const [mounted, setMounted] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || hidden || isStandaloneDisplay()) return null

  return <InstallCoach onLater={() => setHidden(true)} />
}
