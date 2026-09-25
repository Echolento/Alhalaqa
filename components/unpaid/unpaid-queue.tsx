'use client'

// components/unpaid/unpaid-queue.tsx
// #34 slice 6/8 — teacher verify-queue list (client). Pure presentational +
// thin server-action wiring: all data arrives via props from
// app/dashboard/unpaid/page.tsx; Verify/Reject call verifyProof / rejectProof
// from lib/payment-proof-verdict.ts. Copy comes ONLY from
// lib/unpaid-queue-copy.ts (HITL review). RTL Arabic.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Check, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { verifyProof, rejectProof } from '@/lib/payment-proof-verdict'
import { UNPAID_COPY } from '@/lib/unpaid-queue-copy'

export interface UnpaidQueueViewItem {
  id: string
  studentId: string
  studentName: string
  periodKey: string
  periodLabel?: string
  storagePath: string
  imageUrl: string | null
  createdAt: string
}

export function UnpaidQueue(props: {
  items: UnpaidQueueViewItem[]
  highlightReceiptId?: string | null
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<UnpaidQueueViewItem | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [fullImage, setFullImage] = useState<UnpaidQueueViewItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Record<string, 'verified' | 'rejected'>>({})

  async function handleVerify(item: UnpaidQueueViewItem) {
    setBusyId(item.id)
    setFormError(null)
    try {
      const result = await verifyProof(item.id)
      if ((result as { error?: string }).error) {
        setFormError((result as { error: string }).error)
      } else {
        setDoneIds((prev) => ({ ...prev, [item.id]: 'verified' }))
        router.refresh()
      }
    } catch {
      setFormError(UNPAID_COPY.loadError)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    const note = rejectNote.trim()
    if (!note) {
      setFormError(UNPAID_COPY.noteRequiredError)
      return
    }
    const item = rejectTarget
    setBusyId(item.id)
    setFormError(null)
    try {
      const result = await rejectProof(item.id, note)
      if ((result as { error?: string }).error) {
        setFormError((result as { error: string }).error)
      } else {
        setDoneIds((prev) => ({ ...prev, [item.id]: 'rejected' }))
        setRejectTarget(null)
        setRejectNote('')
        router.refresh()
      }
    } catch {
      setFormError(UNPAID_COPY.loadError)
    } finally {
      setBusyId(null)
    }
  }

  if (props.items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4" dir="rtl">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {UNPAID_COPY.emptyQueue}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4" dir="rtl">
      <Card>
        <CardContent className="space-y-1 pt-4">
          <p className="text-sm text-muted-foreground">{UNPAID_COPY.queueHeaderNote}</p>
          <p className="text-xs text-muted-foreground" data-testid="queue-count">
            {UNPAID_COPY.queueCount(props.items.length)}
          </p>
        </CardContent>
      </Card>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <ul className="space-y-4" data-testid="unpaid-queue">
        {props.items.map((item) => {
          const isHighlight = props.highlightReceiptId === item.id
          const busy = busyId === item.id
          const done = doneIds[item.id]
          return (
            <li key={item.id}>
              <Card
                data-testid={`queue-item-${item.id}`}
                onClick={() => setFullImage(item)}
                className={`cursor-zoom-in shadow-md md:shadow-lg ${isHighlight ? 'border-primary ring-1 ring-primary' : ''}`}
              >
                <CardContent className="space-y-3 pt-4">
                  {isHighlight ? (
                    <div>
                      <Badge variant="secondary">{UNPAID_COPY.highlightHint}</Badge>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <button
                        type="button"
                        data-testid={`receipt-image-${item.id}`}
                        onClick={() => setFullImage(item)}
                        className="h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-md border"
                        aria-label={UNPAID_COPY.receiptAlt(item.studentName)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={UNPAID_COPY.receiptAlt(item.studentName)}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                        —
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{item.studentName}</p>
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid={`queue-period-${item.id}`}
                      >
                        {item.periodLabel ?? item.periodKey}
                      </p>
                    </div>
                    <Badge variant="outline" data-testid={`queue-status-${item.id}`}>
                      {done === 'verified'
                        ? UNPAID_COPY.verifySuccessTitle
                        : done === 'rejected'
                          ? UNPAID_COPY.rejectSuccessTitle
                          : UNPAID_COPY.statusPending}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={busy}
                      aria-label={UNPAID_COPY.verifyAriaLabel(item.studentName)}
                      data-testid={`verify-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVerify(item)
                      }}
                    >
                      <Check className="h-4 w-4" />
                      {busy ? UNPAID_COPY.verifyingLabel : UNPAID_COPY.verifyButtonLabel}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={busy}
                      aria-label={UNPAID_COPY.rejectAriaLabel(item.studentName)}
                      data-testid={`reject-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setRejectNote('')
                        setFormError(null)
                        setRejectTarget(item)
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      {busy ? UNPAID_COPY.rejectingLabel : UNPAID_COPY.rejectButtonLabel}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>

      {/* Reject-reason modal: note lives ONLY here, never inline. */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {rejectTarget ? UNPAID_COPY.rejectAriaLabel(rejectTarget.studentName) : ''}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder={UNPAID_COPY.notePlaceholder}
            aria-label={UNPAID_COPY.notePlaceholder}
            data-testid="reject-note"
            dir="rtl"
            rows={3}
          />
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={busyId !== null}
              data-testid="reject-confirm"
              onClick={handleReject}
            >
              {UNPAID_COPY.rejectButtonLabel}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              data-testid="reject-cancel"
              onClick={() => setRejectTarget(null)}
            >
              {UNPAID_COPY.rejectCancelLabel ?? 'إلغاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full receipt modal: queue shows a small preview, tap for full. */}
      <Dialog open={!!fullImage} onOpenChange={(open) => { if (!open) setFullImage(null) }}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {fullImage ? UNPAID_COPY.receiptAlt(fullImage.studentName) : ''}
            </DialogTitle>
          </DialogHeader>
          {fullImage?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fullImage.imageUrl}
              alt={UNPAID_COPY.receiptAlt(fullImage.studentName)}
              data-testid="receipt-full-image"
              className="max-h-[75vh] w-full rounded-md border object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
