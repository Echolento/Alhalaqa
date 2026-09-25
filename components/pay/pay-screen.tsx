'use client'

// components/pay/pay-screen.tsx
// Payer-facing pay screen (#33 slice 5/8). Pure presentational: all data
// arrives via props from app/pay/page.tsx (amount via getDuePeriodInfo,
// InstaPay contract via getInstaPayContract). Upload wiring lives in the
// container; this component only reports the chosen File upward.

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ExternalLink, Upload, Clock, Check, XCircle } from 'lucide-react'
import type { PaymentProof } from '@/lib/payment-proof-validation'
import { PAY_PUSH_COPY } from '@/lib/pay-push-copy'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface PayScreenData {
  studentName: string
  amount: number
  currency: string
  periodKey: string
  /** Human label (month/year, batch, or week range) — display this, not periodKey. */
  periodLabel: string
  dueDateLabel: string
  instapayLink: string | null
  instapayHandle: string | null
  hasPending: boolean
  isPaidForPeriod: boolean
}

const STATUS_LABEL: Record<PaymentProof['status'], string> = {
  pending: 'قيد المراجعة',
  verified: 'مقبول',
  rejected: 'مرفوض',
}

export function proofStatusLabel(status: PaymentProof['status']): string {
  return STATUS_LABEL[status]
}

export function PayScreen(props: {
  data: PayScreenData
  proofs: PaymentProof[]
  uploading?: boolean
  uploadError?: string | null
  onFileSelected?: (file: File) => void
}) {
  const { data, proofs, uploading, uploadError, onFileSelected } = props
  const showPendingBanner =
    data.hasPending || proofs.some((p) => p.status === 'pending')
  // Staged file: preview FIRST, upload only on confirm — never fires on
  // select, so a wrong screenshot can be swapped before anything sends.
  const [staged, setStaged] = useState<{ file: File; url: string } | null>(null)
  // Saved-receipt viewer: history rows open the full image (up to 8 kept).
  const [viewProof, setViewProof] = useState<PaymentProof | null>(null)

  function stageFile(file: File) {
    setStaged((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { file, url: URL.createObjectURL(file) }
    })
  }

  function clearStaged() {
    setStaged((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4" dir="rtl">
      {data.isPaidForPeriod ? (
        <Card
          data-testid="paid-disclaimer"
          className="border-emerald-500 bg-emerald-50 shadow-md"
        >
          <CardContent className="flex flex-col items-center gap-1 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-7 w-7 text-white" />
            </span>
            <p className="text-xl font-black text-emerald-800">مدفوع</p>
            <p className="text-sm text-emerald-700">
              رسوم {data.studentName} عن {data.periodLabel} مدفوعة بالكامل — لا يوجد مبلغ مستحق.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">دفع رسوم {data.studentName}</CardTitle>
          {!data.isPaidForPeriod ? (
            <p className="pt-1 text-xs text-muted-foreground" data-testid="push-primer">
              {PAY_PUSH_COPY.promptPrimer}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">المبلغ المستحق</span>
            <span className="text-xl font-bold" data-testid="amount-due">
              {data.amount} {data.currency}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">الفترة</span>
            <span data-testid="period-key">{data.periodLabel}</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">تاريخ الاستحقاق</span>
            <span>{data.dueDateLabel}</span>
          </div>

          {!data.isPaidForPeriod && !(data.instapayLink || data.instapayHandle) ? (
            <p className="pt-2 text-center text-sm text-muted-foreground">
              تواصل مع المعلم لمعرفة طريقة الدفع
            </p>
          ) : null}
          {!data.isPaidForPeriod && (data.instapayLink || data.instapayHandle) ? (
            <div className="space-y-2 pt-2">
              {data.instapayLink && (
                <Button asChild className="w-full">
                  <a
                    href={data.instapayLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="instapay-link"
                  >
                    ادفع عبر InstaPay
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {data.instapayHandle && (
                <p className="text-center text-sm text-muted-foreground" data-testid="instapay-handle">
                  أو حوّل إلى العنوان: <span className="font-mono" dir="ltr">{data.instapayHandle}</span>
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!data.isPaidForPeriod ? (
      <Card>
        <CardContent className="space-y-3 pt-4">
          <label htmlFor="receipt-upload" className="text-sm font-medium">
            ارفع سكرين شوت الإيصال
          </label>
          <Input
            id="receipt-upload"
            data-testid="receipt-upload"
            type="file"
            accept="image/*"
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) stageFile(file)
              e.currentTarget.value = ''
            }}
          />
          {!staged ? (
            <Button
              className="w-full"
              disabled={uploading}
              onClick={() => document.getElementById('receipt-upload')?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'جارٍ الرفع…' : 'اختر صورة الإيصال'}
            </Button>
          ) : (
            <div className="space-y-2" data-testid="upload-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staged.url}
                alt="معاينة الإيصال"
                data-testid="upload-preview-image"
                className="mx-auto max-h-64 rounded-md border object-contain"
              />
              <p className="truncate text-center text-xs text-muted-foreground" dir="ltr">
                {staged.file.name}
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={uploading}
                  data-testid="upload-confirm"
                  onClick={() => {
                    onFileSelected?.(staged.file)
                    clearStaged()
                  }}
                >
                  <Check className="h-4 w-4" />
                  {uploading ? 'جارٍ الرفع…' : 'تأكيد الإرسال'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={uploading}
                  data-testid="upload-retake"
                  onClick={() => {
                    clearStaged()
                    document.getElementById('receipt-upload')?.click()
                  }}
                >
                  إعادة الاختيار
                </Button>
              </div>
            </div>
          )}
          {uploadError && (
            <p role="alert" className="text-sm text-destructive">
              {uploadError}
            </p>
          )}
          {showPendingBanner && (
            <p
              data-testid="pending-banner"
              className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              <Clock className="h-4 w-4" />
              إيصالك قيد المراجعة — سنعلمك عند التحقق
            </p>
          )}
        </CardContent>
      </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل الإيصالات</CardTitle>
        </CardHeader>
        <CardContent>
          {proofs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">لا توجد إيصالات بعد</p>
          ) : (
            <ul className="space-y-2" data-testid="proof-history">
              {proofs.map((proof) => (
                <li key={proof.id}>
                  <button
                    type="button"
                    data-testid={`proof-row-${proof.id}`}
                    disabled={!proof.imageUrl}
                    onClick={() => proof.imageUrl && setViewProof(proof)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm text-start enabled:cursor-zoom-in enabled:hover:bg-muted/50 disabled:cursor-default"
                  >
                  <span className="flex items-center gap-2">
                    {proof.status === 'pending' ? (
                      <Clock className="h-4 w-4 text-amber-600" />
                    ) : proof.status === 'verified' ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{proof.periodLabel ?? proof.period_key}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {proof.teacher_note && proof.status === 'rejected' && (
                      <span className="text-xs text-muted-foreground">{proof.teacher_note}</span>
                    )}
                    <Badge
                      variant={proof.status === 'verified' ? 'secondary' : 'destructive'}
                      data-testid={`proof-status-${proof.id}`}
                    >
                      {proofStatusLabel(proof.status)}
                    </Badge>
                  </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Saved-receipt viewer: tap a log row to see the full image. */}
      <Dialog open={!!viewProof} onOpenChange={(open) => { if (!open) setViewProof(null) }}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {viewProof ? `إيصال ${viewProof.periodLabel ?? viewProof.period_key}` : ''}
            </DialogTitle>
          </DialogHeader>
          {viewProof?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewProof.imageUrl}
              alt="إيصال محفوظ"
              data-testid="proof-full-image"
              className="max-h-[75vh] w-full rounded-md border object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
