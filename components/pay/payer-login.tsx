'use client'

// components/pay/payer-login.tsx
// A3 slice — generic payer email-OTP login for /pay without a session (no
// claim token involved). The magic link returns straight to the destination
// via /auth/confirm (token_hash), which needs no browser code verifier — so
// it survives the email being opened in a different browser/WebView.
// Test seam: `createClient` override; production uses the browser client.

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { authRedirectOrigin } from '@/lib/auth-redirect'
import { CLAIM_COPY } from '@/lib/claim-copy'

type BrowserClient = ReturnType<typeof createClient>
type OtpClient = {
  auth: {
    signInWithOtp: (args: {
      email: string
      options: { emailRedirectTo: string }
    }) => Promise<{ error: { message: string } | null }>
  }
}

export function PayerLogin(props: {
  /** Test seam. Production omits it and the live browser client is used. */
  createClient?: () => OtpClient
  /** Post-login destination (relative-only, sanitized by /auth/callback). */
  next?: string
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  // Resend cooldown: firing several magic links invalidates the older ones, so
  // the last email must be the one the payer uses. Make them wait.
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(CLAIM_COPY.payerLoginInvalidEmail)
      return
    }
    setError(null)
    setSending(true)
    try {
      const client = props.createClient
        ? props.createClient()
        : ((createClient() as unknown as BrowserClient) as unknown as OtpClient)
      const dest = props.next ?? '/pay'
      // Final destination, not /auth/callback: the email template forwards
      // .RedirectTo to /auth/confirm, which verifies the token_hash. Use the
      // canonical host — the pay subdomain isn't in Supabase's allowlist, so
      // its redirect_to would silently collapse to the Site URL root.
      const redirectTo = `${authRedirectOrigin(window.location.origin)}${dest}`
      const { error: otpError } = await client.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      })
      if (otpError) {
        setError(CLAIM_COPY.payerLoginFail)
      } else {
        setSent(true)
        setCooldown(60)
      }
    } catch {
      setError(CLAIM_COPY.payerLoginFail)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md p-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{CLAIM_COPY.payerLoginTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">{CLAIM_COPY.payerLoginDescription}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="payer-login-email">{CLAIM_COPY.payerLoginEmailLabel}</Label>
              <Input
                id="payer-login-email"
                data-testid="payer-login-email"
                type="email"
                dir="ltr"
                placeholder={CLAIM_COPY.payerLoginEmailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error ? (
              <p data-testid="payer-login-error" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
            {sent ? (
              <p className="rounded-lg bg-success/10 p-3 text-sm text-success">
                {CLAIM_COPY.payerLoginSent}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={sending || cooldown > 0}>
              {cooldown > 0
                ? `إعادة الإرسال بعد ${cooldown}ث`
                : sending
                  ? CLAIM_COPY.payerLoginSending
                  : CLAIM_COPY.payerLoginSendButton}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
