'use client'

// components/dashboard/payer-invite-button.tsx
// #32 slice 2/8 — guardian-only invite entry point.
// Copy lives in lib/remind-copy.ts (single source, HITL review).
// "Triggers notifications on claim" is enforced server-side in a later slice;
// here the copy promises it + the WhatsApp share carries the invite link.

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'
import { REMIND_COPY } from '@/lib/remind-copy'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { issueClaimLink } from '@/lib/claim-actions'
import { buildInviteWhatsAppUrl, canWhatsApp } from '@/lib/whatsapp-share'

interface PayerInviteButtonProps {
  studentId: string
  studentName: string
  /** Payer WhatsApp for the wa.me share (optional — dialog still explains claim). */
  phone?: string | null
  /** Claim URL for this student (placeholder until payer identity lands). */
  inviteUrl?: string
}

export function PayerInviteButton({
  studentId,
  studentName,
  phone,
  inviteUrl,
}: PayerInviteButtonProps) {
  const [open, setOpen] = useState(false)
  // #36 slice 8/8 — real claim-link wiring (allowed edit): on dialog open,
  // mint a single-use 7-day /claim?token= link via issueClaimLink (which
  // revokes prior live tokens). An explicit inviteUrl prop still wins
  // (test seam); the ?invite=1 placeholder remains only as a last-resort
  // fallback when issuance fails. No QR lib in deps — link + copy only.
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState(false)
  // Single-flight: React StrictMode (dev) mounts effects twice — without
  // this ref the dialog would mint TWO links (second revokes the first).
  const inflightRef = useRef<Promise<{ claimUrl?: string; error?: string }> | null>(null)
  useEffect(() => {
    if (!open || inviteUrl || issuedUrl || issueError) return
    let cancelled = false
    if (!inflightRef.current) {
      setIssuing(true)
      inflightRef.current = issueClaimLink(studentId).finally(() => {
        if (!cancelled) setIssuing(false)
      })
    }
    inflightRef.current
      .then((result) => {
        if (cancelled) return
        if (result?.claimUrl) {
          setIssuedUrl(result.claimUrl)
        } else {
          setIssueError(true)
        }
      })
      .catch(() => {
        if (!cancelled) setIssueError(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, inviteUrl, issuedUrl, issueError, studentId])
  // The raw /claim?token= link is NEVER shown: it's gibberish to a teacher.
  // WhatsApp share is the only way out — the parent taps it and claims.
  const claimUrl = inviteUrl ?? issuedUrl ?? null
  const showWhatsApp = canWhatsApp(phone) && !!claimUrl
  const whatsappUrl = showWhatsApp
    ? buildInviteWhatsAppUrl({ phone: phone as string, studentName, inviteUrl: claimUrl as string })
    : null

  return (
    <div className="space-y-1" dir="rtl">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-1.5 min-h-[44px] sm:min-h-0">
            <UserPlus className="w-4 h-4" />
            {REMIND_COPY.inviteButtonLabel}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{REMIND_COPY.inviteDialogTitle}</DialogTitle>
            <DialogDescription>{REMIND_COPY.inviteDialogDescription}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {REMIND_COPY.inviteClaimNote}
          </p>
          {issuing ? (
            <p className="text-xs text-muted-foreground">{CLAIM_COPY.inviteIssuingLabel}</p>
          ) : null}
          {issueError && !issuedUrl ? (
            <p className="text-xs text-destructive">{CLAIM_COPY.inviteIssueFailDescription}</p>
          ) : null}
          {whatsappUrl && !issuing ? (
            <Button type="button" className="w-full min-h-[44px]" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                {REMIND_COPY.whatsappShareLabel}
              </a>
            </Button>
          ) : null}
          {issuing && canWhatsApp(phone) ? (
            <Button type="button" className="w-full min-h-[44px]" disabled>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {CLAIM_COPY.inviteIssuingLabel}
            </Button>
          ) : null}
          {!issuing && !whatsappUrl && !issueError ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {REMIND_COPY.payerPhoneHelper}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {CLAIM_COPY.inviteRegeneratedNote}
          </p>
        </DialogContent>
      </Dialog>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {REMIND_COPY.inviteButtonHelper}
      </p>
    </div>
  )
}
