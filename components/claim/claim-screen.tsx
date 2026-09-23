'use client'

// components/claim/claim-screen.tsx
// #36 slice 8/8 — NEW payer claim screen (client). Composes around frozen
// lanes by IMPORT ONLY:
//   - browser supabase client (lib/supabase/client.ts) for signInWithOtp —
//     read-only reference to the existing auth client pattern; the OTP email
//     redirects back via /auth/callback?next=/claim?token=… (relative-only,
//     open-redirect safe — the callback route runs sanitizeNextPath).
//   - redeemClaim (lib/claim-actions.ts) links the LOGGED-IN profile only.
//   - every Arabic string via CLAIM_COPY (single source, HITL review).
// RTL, Arabic-first. Test seam: `session` + `onRedeem` overrides.

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { redeemClaim } from '@/lib/claim-actions'
import { buildClaimOtpCallbackPath } from '@/lib/claim-tokens'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { payScreenUrl } from '@/lib/push-payloads'

export type ClaimScreenSession = { email: string | null } | null

export function ClaimScreen(props: {
  token: string
  studentName: string
  teacherName: string
  /** Test/SSR seam. Production omits it and the live session is used. */
  session?: ClaimScreenSession
  /** Test seam overriding the redeemClaim server action. */
  onRedeem?: (token: string) => Promise<{ success?: true; error?: string; studentId?: string }>
}) {
  const [liveSession, setLiveSession] = useState<ClaimScreenSession>(null)
  const [sessionChecked, setSessionChecked] = useState(props.session !== undefined)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [otpSending, setOtpSending] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemed, setRedeemed] = useState<{ studentId: string } | null>(null)

  const session = props.session !== undefined ? props.session : liveSession

  useEffect(() => {
    if (props.session !== undefined) return
    let cancelled = false
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return
        const email = data.user?.email ?? null
        setLiveSession(data.user ? { email } : null)
        setSessionChecked(true)
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [props.session])

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(CLAIM_COPY.claimInvalidEmail)
      return
    }
    setEmailError(null)
    setOtpError(null)
    setOtpSending(true)
    try {
      const redirectTo = `${window.location.origin}${buildClaimOtpCallbackPath(props.token)}`
      const { error } = await createClient().auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      })
      if (error) {
        setOtpError(CLAIM_COPY.claimOtpFailDescription)
      } else {
        setOtpSent(true)
      }
    } catch {
      setOtpError(CLAIM_COPY.claimOtpFailDescription)
    } finally {
      setOtpSending(false)
    }
  }

  const handleConfirm = async () => {
    if (confirming) return
    setConfirming(true)
    setRedeemError(null)
    try {
      const result = props.onRedeem
        ? await props.onRedeem(props.token)
        : await redeemClaim(props.token)
      if ((result as { success?: boolean }).success) {
        setRedeemed({ studentId: (result as { studentId?: string }).studentId ?? '' })
      } else {
        setRedeemError((result as { error?: string }).error ?? CLAIM_COPY.claimInvalidDescription)
      }
    } catch {
      setRedeemError(CLAIM_COPY.claimInvalidDescription)
    } finally {
      setConfirming(false)
    }
  }

  if (!sessionChecked) {
    return (
      <Card dir="rtl">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          جارٍ التحميل…
        </CardContent>
      </Card>
    )
  }

  if (redeemed) {
    const payUrl = redeemed.studentId ? payScreenUrl(redeemed.studentId) : '/pay'
    return (
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="text-base">{CLAIM_COPY.claimSuccessTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">
            {CLAIM_COPY.claimSuccessDescription(props.studentName)}
          </p>
          <Button asChild className="w-full">
            <a href={payUrl}>{CLAIM_COPY.claimGoPay}</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="text-base">{CLAIM_COPY.claimPageTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{CLAIM_COPY.claimPageSubtitle}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="rounded-lg bg-muted/50 p-3 text-sm space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{CLAIM_COPY.claimStudentLabel}</dt>
            <dd className="font-semibold">{props.studentName}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{CLAIM_COPY.claimTeacherLabel}</dt>
            <dd className="font-semibold">{props.teacherName}</dd>
          </div>
        </dl>

        {!session ? (
          <form onSubmit={handleSendLink} className="space-y-3">
            <p className="text-sm font-medium">{CLAIM_COPY.claimOtpTitle}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {CLAIM_COPY.claimOtpDescription(props.studentName)}
            </p>
            <div className="space-y-2">
              <Label htmlFor="claim-email">{CLAIM_COPY.claimEmailLabel}</Label>
              <Input
                id="claim-email"
                type="email"
                dir="ltr"
                placeholder={CLAIM_COPY.claimEmailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
              <p className="text-[11px] text-muted-foreground">{CLAIM_COPY.claimEmailHelper}</p>
            </div>
            {otpSent ? (
              <p className="text-sm rounded-lg bg-success/10 text-success p-3">
                {CLAIM_COPY.claimLinkSentTitle} — {CLAIM_COPY.claimLinkSentDescription}
              </p>
            ) : null}
            {otpError ? <p className="text-xs text-destructive">{otpError}</p> : null}
            <Button type="submit" className="w-full" disabled={otpSending}>
              {otpSending ? CLAIM_COPY.claimSendingLink : CLAIM_COPY.claimSendLinkButton}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {CLAIM_COPY.claimLoggedInAs(session.email ?? '')}
            </p>
            {redeemError ? <p className="text-xs text-destructive">{redeemError}</p> : null}
            <Button onClick={handleConfirm} className="w-full" disabled={confirming}>
              {confirming ? CLAIM_COPY.claimConfirming : CLAIM_COPY.claimConfirmButton}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
