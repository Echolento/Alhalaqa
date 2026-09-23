'use client'

// components/pay/pay-screen.tsx
// Payer-facing pay screen (#33 slice 5/8). Pure presentational: all data
// arrives via props from app/pay/page.tsx (amount via getDuePeriodInfo,
// InstaPay contract via getInstaPayContract). Upload wiring lives in the
// container; this component only reports the chosen File upward.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ExternalLink, Upload, Clock, Check, XCircle } from 'lucide-react'
import type { PaymentProof } from '@/lib/payment-proof-validation'

export interface PayScreenData {
  studentName: string
  amount: number
  currency: string
  periodKey: string
  dueDateLabel: string
  instapayLink: string | null
  instapayHandle: string | null
  hasPending: boolean
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

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">دفع رسوم {data.studentName}</CardTitle>
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
            <span data-testid="period-key">{data.periodKey}</span>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">تاريخ الاستحقاق</span>
            <span>{data.dueDateLabel}</span>
          </div>

          {data.instapayLink || data.instapayHandle ? (
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
          ) : (
            <p className="pt-2 text-center text-sm text-muted-foreground">
              تواصل مع المعلم لمعرفة طريقة الدفع
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <label htmlFor="receipt-upload" className="text-sm font-medium">
            ارفع الإيصال (كاميرا/معرض)
          </label>
          <Input
            id="receipt-upload"
            data-testid="receipt-upload"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelected?.(file)
            }}
          />
          <Button
            className="w-full"
            disabled={uploading}
            onClick={() => document.getElementById('receipt-upload')?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'جارٍ الرفع…' : 'اختر صورة الإيصال'}
          </Button>
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
                <li
                  key={proof.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {proof.status === 'pending' ? (
                      <Clock className="h-4 w-4 text-amber-600" />
                    ) : proof.status === 'verified' ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{proof.period_key}</span>
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
