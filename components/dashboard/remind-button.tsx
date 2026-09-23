'use client'

// components/dashboard/remind-button.tsx
// #32 slice 2/8 — per-overdue-student manual Remind button.
// Calls lib/remind-actions.ts (which wraps the slice-1 triggerManualRemind).
// Works even when the auto-toggle is off. Toast + activity log on send.
// When no payer is linked yet (payer identity lands later) it takes the test
// path: logs + toasts, no push transport.

import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { REMIND_COPY } from '@/lib/remind-copy'
import { sendManualRemind } from '@/lib/remind-actions'
import { buildRemindWhatsAppUrl, canWhatsApp } from '@/lib/whatsapp-share'

interface RemindButtonProps {
  studentId: string
  studentName: string
  payerProfileId?: string | null
  amount?: number
  currency?: string
  periodKey?: string
  /** Payer WhatsApp for the free wa.me fallback link. */
  phone?: string | null
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm'
  className?: string
}

export function RemindButton({
  studentId,
  studentName,
  payerProfileId,
  amount,
  currency,
  periodKey,
  phone,
  variant = 'outline',
  size = 'sm',
  className,
}: RemindButtonProps) {
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const showWhatsAppFallback = canWhatsApp(phone)
  const whatsappUrl = showWhatsAppFallback
    ? buildRemindWhatsAppUrl({
        phone: phone as string,
        studentName,
        amount,
        currency,
      })
    : null

  const handleRemind = async () => {
    if (sending) return
    setSending(true)
    try {
      const result = await sendManualRemind({
        studentId,
        studentName,
        payerProfileId: payerProfileId ?? null,
        amount,
        currency,
        periodKey,
      })
      if (result.success) {
        toast({
          title: REMIND_COPY.remindSuccessTitle,
          description: REMIND_COPY.remindSuccessDescription(studentName),
        })
      } else if (result.testMode || (result as { reason?: string }).reason === 'no_payer_yet') {
        toast({
          title: REMIND_COPY.remindTestTitle,
          description: REMIND_COPY.remindTestDescription,
        })
      } else if ((result as { reason?: string }).reason === 'no_subscription') {
        toast({
          variant: 'destructive',
          title: REMIND_COPY.remindNoSubscriptionTitle,
          description: REMIND_COPY.remindNoSubscriptionDescription,
        })
      } else {
        toast({
          variant: 'destructive',
          title: REMIND_COPY.remindFailTitle,
          description:
            (result as { error?: string }).error ?? REMIND_COPY.remindFailDescription,
        })
      }
    } catch {
      toast({
        variant: 'destructive',
        title: REMIND_COPY.remindFailTitle,
        description: REMIND_COPY.remindFailDescription,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      <Button
        variant={variant}
        size={size}
        onClick={handleRemind}
        disabled={sending}
        aria-label={REMIND_COPY.remindButtonAriaLabel(studentName)}
        title={REMIND_COPY.remindManualNote}
        className={className ?? 'min-h-[44px] sm:min-h-0 gap-1.5'}
      >
        <BellRing className="w-4 h-4" />
        {sending ? REMIND_COPY.remindButtonLoading : REMIND_COPY.remindButtonLabel}
      </Button>
      {whatsappUrl ? (
        <Button
          variant="ghost"
          size={size}
          asChild
          aria-label={REMIND_COPY.whatsappShareAriaLabel(studentName)}
          className="min-h-[44px] sm:min-h-0 gap-1.5"
        >
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            {REMIND_COPY.whatsappShareLabel}
          </a>
        </Button>
      ) : null}
    </div>
  )
}
