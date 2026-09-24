import { getPayScreenInfo, listProofHistory } from '@/lib/payment-proofs'
import { PayUploadContainer } from '@/components/pay/pay-upload-container'
import { Card, CardContent } from '@/components/ui/card'

// Frozen pay-screen URL contract (see payScreenUrl in lib/push-payloads.ts):
// /pay?student=<id>&period=<periodKey>. The period param is informational —
// the server recomputes the authoritative period via getPeriodKey.
export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; period?: string }>
}) {
  const { student: studentId } = await searchParams

  if (!studentId) {
    return (
      <div className="mx-auto w-full max-w-md p-4" dir="rtl">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            رابط الدفع غير صالح — اطلب رابطاً جديداً من المعلم
          </CardContent>
        </Card>
      </div>
    )
  }

  const [info, history] = await Promise.all([
    getPayScreenInfo(studentId),
    listProofHistory(studentId),
  ])

  if ((info as { error?: string }).error) {
    return (
      <div className="mx-auto w-full max-w-md p-4" dir="rtl">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {(info as { error: string }).error}
          </CardContent>
        </Card>
      </div>
    )
  }

  const good = info as {
    studentId: string
    studentName: string
    periodKey: string
    amount: number
    dueDate: string
    currency: string
    instapayLink: string | null
    instapayHandle: string | null
    hasPending: boolean
    isPaidForPeriod: boolean
  }

  const proofs =
    (history as { proofs?: import('@/lib/payment-proof-validation').PaymentProof[] })
      .proofs ?? []

  return (
    <PayUploadContainer
      studentId={good.studentId}
      initialData={{
        studentName: good.studentName,
        amount: good.amount,
        currency: good.currency,
        periodKey: good.periodKey,
        dueDateLabel: new Date(good.dueDate).toLocaleDateString('ar-EG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        instapayLink: good.instapayLink,
        instapayHandle: good.instapayHandle,
        hasPending: good.hasPending,
        isPaidForPeriod: good.isPaidForPeriod,
      }}
      initialProofs={proofs}
    />
  )
}
