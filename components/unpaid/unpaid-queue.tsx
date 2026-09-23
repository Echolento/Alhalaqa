'use client'

// components/unpaid/unpaid-queue.tsx
// #34 slice 6/8 — teacher verify-queue list (client). Pure presentational +
// thin server-action wiring: all data arrives via props from
// app/dashboard/unpaid/page.tsx; Verify/Reject call verifyProof / rejectProof
// from lib/payment-proof-verdict.ts. Copy comes ONLY from
// lib/unpaid-queue-copy.ts (HITL review). RTL Arabic.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Check, XCircle, Clock } from 'lucide-react'
import { verifyProof, rejectProof } from '@/lib/payment-proof-verdict'
import { UNPAID_COPY } from '@/lib/unpaid-queue-copy'

export interface UnpaidQueueViewItem {
  id: string
  studentId: string
  studentName: string
  periodKey: string
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
  const [notes, setNotes] = useState<Record<string, string>>({})
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

  async function handleReject(item: UnpaidQueueViewItem) {
    const note = (notes[item.id] ?? '').trim()
    if (!note) {
      setFormError(UNPAID_COPY.noteRequiredError)
      return
    }
    setBusyId(item.id)
    setFormError(null)
    try {
      const result = await rejectProof(item.id, note)
      if ((result as { error?: string }).error) {
        setFormError((result as { error: string }).error)
      } else {
        setDoneIds((prev) => ({ ...prev, [item.id]: 'rejected' }))
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
        <CardHeader>
          <CardTitle className="text-lg">{UNPAID_COPY.queueTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
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
                className={isHighlight ? 'border-primary ring-1 ring-primary' : undefined}
              >
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-amber-600" />
                      {item.studentName}
                    </span>
                    <span className="flex items-center gap-2">
                      {isHighlight && (
                        <Badge variant="secondary">{UNPAID_COPY.highlightHint}</Badge>
                      )}
                      <Badge variant="outline" data-testid={`queue-status-${item.id}`}>
                        {done === 'verified'
                          ? UNPAID_COPY.verifySuccessTitle
                          : done === 'rejected'
                            ? UNPAID_COPY.rejectSuccessTitle
                            : UNPAID_COPY.statusPending}
                      </Badge>
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">{UNPAID_COPY.periodLabel}</span>
                    <span data-testid={`queue-period-${item.id}`}>{item.periodKey}</span>
                  </div>

                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={UNPAID_COPY.receiptAlt(item.studentName)}
                      data-testid={`receipt-image-${item.id}`}
                      className="w-full rounded-md border object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={busy}
                      aria-label={UNPAID_COPY.verifyAriaLabel(item.studentName)}
                      data-testid={`verify-${item.id}`}
                      onClick={() => handleVerify(item)}
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
                      onClick={() => handleReject(item)}
                    >
                      <XCircle className="h-4 w-4" />
                      {busy ? UNPAID_COPY.rejectingLabel : UNPAID_COPY.rejectButtonLabel}
                    </Button>
                  </div>

                  <Input
                    value={notes[item.id] ?? ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder={UNPAID_COPY.notePlaceholder}
                    aria-label={UNPAID_COPY.notePlaceholder}
                    data-testid={`reject-note-${item.id}`}
                    dir="rtl"
                  />
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
