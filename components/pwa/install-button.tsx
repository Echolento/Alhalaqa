'use client'

// components/pwa/install-button.tsx
// A1 slice — renders the deferred-install button ONLY when the browser
// handed us a beforeinstallprompt event (Android/Chrome). Everywhere else
// (iOS, desktop, already-installed) it renders nothing — the coach shows
// platform guidance instead.

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

export function InstallButton(props: { label?: string; className?: string }) {
  const { canInstall, promptInstall } = useInstallPrompt()
  if (!canInstall) return null
  return (
    <Button
      type="button"
      onClick={() => void promptInstall()}
      className={props.className ?? 'w-full'}
    >
      <Download className="h-4 w-4" />
      {props.label ?? 'ثبّت التطبيق'}
    </Button>
  )
}
