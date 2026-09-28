'use client'

// hooks/use-install-prompt.ts
// A1 slice — beforeinstallprompt capture. Pure/SSR-safe by construction:
// window is only touched inside useEffect + guarded helpers. The deferred
// prompt event is preventDefaulted so the coach decides WHEN the install
// button appears (claim-success / /pay banner), not the browser.

import { useCallback, useEffect, useState } from 'react'

export interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** True when the page already runs from the home-screen icon. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
  } catch {
    return false
  }
  try {
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<DeferredInstallPrompt | null>(null)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as DeferredInstallPrompt)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      // Dismissed or failed — keep the deferred event so the coach can retry.
    }
  }, [deferred])

  return { canInstall: deferred !== null, promptInstall }
}
