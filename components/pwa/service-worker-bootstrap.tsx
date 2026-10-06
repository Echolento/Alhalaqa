'use client'

// components/pwa/service-worker-bootstrap.tsx
// Registers the shared service worker at startup on every surface (idempotent).
// Two reasons it can't be lazy:
//   1. Chrome only fires `beforeinstallprompt` once the app is installable,
//      which requires an ACTIVE service worker with a fetch handler. Registering
//      only inside the push flow meant the install prompt arrived late (or
//      never) on the claim screen.
//   2. Push must be available regardless of which page the parent lands on.

import { useEffect } from 'react'

export function ServiceWorkerBootstrap() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal (private mode, unsupported host, etc.).
    })
  }, [])
  return null
}
