import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'

// app/auth/confirm/page.tsx
// Prefetch-proof email link landing. The GET never touches the token — it just
// renders a button. The tap POSTs to /auth/confirm/verify, which is the only
// thing that consumes the one-time token. Fixes the iOS/email-client case where
// the link is fetched (prefetch/double-open) and "expires" before the user taps.

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>
}) {
  const { token_hash, type, next } = await searchParams

  if (!token_hash) redirect('/auth/error?reason=no_code')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">تأكيد الدخول</CardTitle>
            <CardDescription className="mt-2">
              اضغط الزر لإتمام تسجيل الدخول. الخطوة دي بتمنع فتح الرابط من غيرك.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action="/auth/confirm/verify" method="post">
            <input type="hidden" name="token_hash" value={token_hash} />
            <input type="hidden" name="type" value={type ?? 'email'} />
            <input type="hidden" name="next" value={next ?? ''} />
            <Button type="submit" className="w-full min-h-[44px]">
              تأكيد الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
