import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { PAY_ENTRY_URL } from '@/lib/pay-host'

// NOTE: /auth/callback appends ?reason=no_code|exchange_failed|no_session and
// /auth/confirm appends ?reason=confirm_failed&next=<dest> — used here to show
// the right recovery guidance for the flow the user was actually in.
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; next?: string }>
}) {
  const { reason, next } = await searchParams
  // A used/expired one-time link is the common, recoverable case: the newest
  // email invalidates older ones and each link works only once.
  const expiredLink = reason === 'confirm_failed'
  // Payer flows re-request a magic link from their own entry (phone/email OTP),
  // NOT the teacher password-reset. Never send a parent to "reset password".
  const isPayerFlow =
    typeof next === 'string' && (next.startsWith('/pay') || next.startsWith('/claim'))
  // Payers retry from their own entry on the PAY subdomain; never the teacher
  // reset-password flow, never the main domain.
  const retryHref = isPayerFlow
    ? `${PAY_ENTRY_URL}${next && next.startsWith('/') ? next : ''}`
    : '/auth/forgot-password'
  const retryLabel = isPayerFlow ? 'العودة والمحاولة من جديد' : 'طلب رابط جديد'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {expiredLink ? 'انتهت صلاحية الرابط' : 'تعذّر تسجيل الدخول'}
            </CardTitle>
            <CardDescription className="mt-2">
              {expiredLink
                ? 'هذا الرابط مستخدم من قبل أو انتهت صلاحيته. افتح أحدث رسالة وصلت بريدك، أو اطلب رابطاً جديداً.'
                : 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          {expiredLink ? (
            <Button asChild className="w-full">
              <Link href={retryHref}>{retryLabel}</Link>
            </Button>
          ) : null}
          <Button asChild variant={expiredLink ? 'outline' : 'default'} className="w-full">
            <Link href="/auth/login">العودة لتسجيل الدخول</Link>
          </Button>
          <Button asChild variant="outline" className="w-full bg-transparent">
            <Link href="/">الصفحة الرئيسية</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
