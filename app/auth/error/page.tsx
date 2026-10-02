import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

// NOTE: /auth/callback appends ?reason=no_code|exchange_failed|no_session and
// /auth/confirm appends ?reason=confirm_failed for debugging — also used here
// to show the right recovery guidance.
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  // A used/expired one-time link is the common, recoverable case: the newest
  // email invalidates older ones and each link works only once.
  const expiredLink = reason === 'confirm_failed'

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
              <Link href="/auth/forgot-password">طلب رابط جديد</Link>
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
