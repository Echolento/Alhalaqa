'use client'

// components/dashboard/share-entry-card.tsx
// Dominant entry-point distribution: the ONE link every parent uses.
// System share sheet on phones (WhatsApp/Telegram/SMS in one tap),
// clipboard + confirmation everywhere else. Renders above the roster.

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check } from 'lucide-react'
import { REMIND_COPY } from '@/lib/remind-copy'
import { PAY_ENTRY_URL } from '@/lib/pay-host'

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path.
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}

export function ShareEntryCard() {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const text = REMIND_COPY.shareEntryText(PAY_ENTRY_URL)
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: document.title, text, url: PAY_ENTRY_URL })
        return
      } catch {
        // Dismissed or failed — fall through to clipboard.
      }
    }
    if (await copyToClipboard(text)) setCopied(true)
  }

  async function handleCopy() {
    if (await copyToClipboard(REMIND_COPY.shareEntryText(PAY_ENTRY_URL))) {
      setCopied(true)
    }
  }

  return (
    <Card
      data-testid="share-entry-card"
      className="border-primary/30 bg-primary/5"
      dir="rtl"
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <p className="font-bold">{REMIND_COPY.shareEntryTitle}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {REMIND_COPY.shareEntryDescription}
          </p>
        </div>
        <p
          data-testid="share-entry-url"
          dir="ltr"
          className="truncate rounded-lg border bg-background px-3 py-2 text-center font-mono text-sm"
        >
          {PAY_ENTRY_URL}
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void handleShare()} className="flex-1 min-h-[44px]">
            <Share2 className="h-4 w-4" />
            {REMIND_COPY.shareEntryButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCopy()}
            className="flex-1 min-h-[44px]"
          >
            <Copy className="h-4 w-4" />
            {REMIND_COPY.shareEntryCopy}
          </Button>
        </div>
        {copied ? (
          <p
            data-testid="share-entry-copied"
            className="flex items-center justify-center gap-1 text-xs text-emerald-700"
          >
            <Check className="h-3.5 w-3.5" />
            {REMIND_COPY.shareEntryCopied}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
