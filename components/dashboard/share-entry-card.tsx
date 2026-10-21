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

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Share2, Copy, Check, RefreshCw } from 'lucide-react'
import { REMIND_COPY } from '@/lib/remind-copy'
import { PAY_ENTRY_URL } from '@/lib/pay-host'
import { formatJoinCode } from '@/lib/join-codes'

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

type RotateResult = { code?: string; error?: string }

export function ShareEntryCard(props: {
  /** Raw 8-char code; null/undefined hides the code block (old callers/tests). */
  joinCode?: string | null
  /** Test seam overriding the server action. */
  onRotate?: () => Promise<RotateResult>
}) {
  const [code, setCode] = useState<string | null>(props.joinCode ?? null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [rotateOk, setRotateOk] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const displayCode = code ? formatJoinCode(code) : null

  async function handleShare() {
    const text = REMIND_COPY.shareEntryText(PAY_ENTRY_URL, displayCode ?? undefined)
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: document.title, text, url: PAY_ENTRY_URL })
        return
      } catch {
        // Dismissed or failed — fall through to clipboard.
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
    if (await copyToClipboard(displayCode)) setCodeCopied(true)
  }

  async function handleRotate() {
    setRotating(true)
    setRotateError(null)
    setRotateOk(false)
    try {
      const res = props.onRotate
        ? await props.onRotate()
        : (await import('@/lib/join-code-actions')).regenerateMyJoinCode()
      if ((res as RotateResult).code) {
        setCode((res as RotateResult).code ?? null)
        setCodeCopied(false)
        setRotateOk(true)
      } else {
        setRotateError((res as RotateResult).error ?? REMIND_COPY.shareEntryRotateFail)
      }
    } catch {
      // The DB may have rotated even when the response was lost (mobile
      // network). Reconcile: if the server now holds a different code, that
      // IS the success — showing an error here would be a lie.
      if (!props.onRotate) {
        try {
          const cur = await (await import('@/lib/join-code-actions')).getMyJoinCode()
          if ('code' in cur && cur.code && cur.code !== code) {
            setCode(cur.code)
            setCodeCopied(false)
            setRotateOk(true)
            return
          }
        } catch {
          // Fall through to the generic failure copy.
        }
      }
      setRotateError(REMIND_COPY.shareEntryRotateFail)
    } finally {
      setRotating(false)
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
                      onClick={() => void handleRotate()}
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
    </Card>
  )
}
