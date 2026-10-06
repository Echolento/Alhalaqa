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

type WindowWithBip = Window & { __deferredInstallPrompt?: DeferredInstallPrompt }

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<DeferredInstallPrompt | null>(null)

  useEffect(() => {
    const w = window as WindowWithBip
    const adopt = (e: Event) => {
      const evt = e as DeferredInstallPrompt
      w.__deferredInstallPrompt = evt
      setDeferred(evt)
    }
    // The inlne capture script (root layout) stashes the event even if it
    // fired before hydration — adopt it on mount so the button is never lost.
    const stashed = w.__deferredInstallPrompt
    if (stashed) setDeferred(stashed)
    const onAvailable = () => {
      if (w.__deferredInstallPrompt) setDeferred(w.__deferredInstallPrompt)
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      adopt(e)
    }
    const onInstalled = () => {
      w.__deferredInstallPrompt = undefined
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('bip-available', onAvailable)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('bip-available', onAvailable)
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
