'use client'

// components/dashboard/share-entry-card.tsx
// Dominant entry-point distribution: the ONE link every parent uses, plus the
// teacher's join code (the vouch parents type after signing in with a phone).
// System share sheet on phones (WhatsApp/Telegram/SMS in one tap),
// clipboard + confirmation everywhere else. Renders above the roster.
//
// Rotation is lazy-imported so this client component (and its tests) never
// pull the server-action graph at render time. Rotation replaces ONLY the
// code: existing claims and invite links keep working.

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Share2, Copy, Check, RefreshCw, ChevronDown } from 'lucide-react'
import { REMIND_COPY } from '@/lib/remind-copy'
import { PAY_ENTRY_URL } from '@/lib/pay-host'
import { SHARE_ENTRY_SEEN_COOKIE, SHARE_ENTRY_SEEN_MAX_AGE } from '@/lib/share-entry-cookie'
import { useJoinCodeRotation } from '@/hooks/use-join-code-rotation'
import { cn } from '@/lib/utils'

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

type ShareEntryCardProps = {
  /** Raw 8-char code; null/undefined hides the code block (old callers/tests). */
  joinCode?: string | null
  /** Full on the first-ever render; collapsed on later visits. */
  defaultOpen: boolean
}

export function ShareEntryCard(props: ShareEntryCardProps) {
  const [linkCopied, setLinkCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [open, setOpen] = useState(props.defaultOpen)
  const { displayCode, rotating, rotateError, rotateOk, rotate } = useJoinCodeRotation(props.joinCode)
  const codeCopied = copiedCode !== null && copiedCode === displayCode

  // Mark the card as seen as soon as it renders open. The server reads this
  // cookie on the next visit and renders it collapsed - no flash of the full
  // card. Manual opens are session-only by design.
  useEffect(() => {
    if (!props.defaultOpen) return
    document.cookie = `${SHARE_ENTRY_SEEN_COOKIE}=1; path=/; max-age=${SHARE_ENTRY_SEEN_MAX_AGE}; samesite=lax`
  }, [props.defaultOpen])

  async function handleShare() {
    const text = REMIND_COPY.shareEntryText(PAY_ENTRY_URL, displayCode ?? undefined)
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: document.title, text, url: PAY_ENTRY_URL })
        return
      } catch {
        // Dismissed or failed - fall through to clipboard.
      }
    }
    if (await copyToClipboard(text)) setLinkCopied(true)
  }

  async function handleCopy() {
    if (await copyToClipboard(REMIND_COPY.shareEntryText(PAY_ENTRY_URL, displayCode ?? undefined))) {
      setLinkCopied(true)
    }
  }

  async function handleCopyCode() {
    if (!displayCode) return
    if (await copyToClipboard(displayCode)) setCopiedCode(displayCode)
  }

  return (
    <Card
      data-testid="share-entry-card"
      className="gap-0 overflow-hidden border-primary/30 bg-primary/5 py-0"
      dir="rtl"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            data-testid="share-entry-toggle"
            className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground"
          >
            <span className="font-bold">{REMIND_COPY.shareEntryTitle}</span>
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {REMIND_COPY.shareEntryDescription}
            </p>

            {displayCode ? (
              <div className="rounded-lg border bg-background px-3 py-2 text-center">
                <p className="text-xs text-muted-foreground">{REMIND_COPY.shareEntryCodeLabel}</p>
                <p
                  data-testid="share-entry-code"
                  dir="ltr"
                  className="font-mono text-xl font-bold tracking-[0.35em]"
                >
                  {displayCode}
                </p>
              </div>
            ) : null}

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

            {displayCode ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {REMIND_COPY.shareEntryCodeHelper}
                </p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCopyCode()}
                    className="h-auto px-2 py-1 text-xs font-normal"
                  >
                    {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {codeCopied ? REMIND_COPY.shareEntryCodeCopied : REMIND_COPY.shareEntryCodeCopy}
                  </Button>
                  <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-testid="share-entry-rotate"
                        disabled={rotating}
                        className="h-auto px-2 py-1 text-xs font-normal text-muted-foreground/70"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {REMIND_COPY.shareEntryRotate}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>{REMIND_COPY.shareEntryRotateTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{REMIND_COPY.shareEntryRotateConfirm}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{REMIND_COPY.shareEntryRotateCancel}</AlertDialogCancel>
                        <AlertDialogAction
                          data-testid="share-entry-rotate-confirm"
                          onClick={() => void rotate()}
                        >
                          {REMIND_COPY.shareEntryRotateAction}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : null}

            {rotateOk ? (
              <p
                data-testid="share-entry-rotate-ok"
                className="flex items-center justify-center gap-1 text-xs text-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />
                {REMIND_COPY.shareEntryRotated}
              </p>
            ) : null}

            {rotateError ? (
              <p data-testid="share-entry-rotate-error" className="text-xs text-destructive">
                {rotateError}
              </p>
            ) : null}

            {linkCopied ? (
              <p
                data-testid="share-entry-copied"
                className="flex items-center justify-center gap-1 text-xs text-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />
                {REMIND_COPY.shareEntryCopied}
              </p>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
