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
import { redeemClaim, updateClaimedPhone } from '@/lib/claim-actions'
import { buildClaimOtpNext } from '@/lib/claim-tokens'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { payScreenUrl } from '@/lib/push-payloads'
import { InstallCoach, type InstallCoachPlatform } from '@/components/pwa/install-coach'

export type ClaimScreenSession = { email: string | null } | null

export function ClaimScreen(props: {
  token: string
  studentName: string
  teacherName: string
  /** Test/SSR seam. Production omits it and the live session is used. */
  session?: ClaimScreenSession
  /** Test seam overriding the redeemClaim server action. */
  onRedeem?: (
    token: string,
  ) => Promise<{ success?: true; error?: string; studentId?: string; claimedPhone?: string | null }>
  /** Test seam overriding the updateClaimedPhone server action. */
  onUpdatePhone?: (
    studentId: string,
    phone: string,
  ) => Promise<{ success?: true; error?: string; phone?: string }>
  /** Test seam forwarded to InstallCoach. Production omits it (auto-detect). */
  coachPlatform?: InstallCoachPlatform
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
  const [redeemed, setRedeemed] = useState<{ studentId: string; claimedPhone: string | null } | null>(null)
  // A2 — post-claim steps: phone-confirm FIRST, install coach SECOND.
  const [postStep, setPostStep] = useState<'phone' | 'coach'>('phone')
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

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
      // Final destination, not /auth/callback: the email template forwards
      // .RedirectTo to /auth/confirm, which verifies the token_hash.
      const redirectTo = `${window.location.origin}${buildClaimOtpNext(props.token)}`
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
        setRedeemed({
          studentId: (result as { studentId?: string }).studentId ?? '',
          claimedPhone: (result as { claimedPhone?: string | null }).claimedPhone ?? null,
        })
        setPostStep('phone')
        setEditingPhone(!(result as { claimedPhone?: string | null }).claimedPhone)
        setPhoneDraft('')
        setPhoneError(null)
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

  async function handleSavePhone(e?: React.FormEvent) {
    e?.preventDefault()
    if (!redeemed || phoneSaving) return
    setPhoneSaving(true)
    setPhoneError(null)
    try {
      const save = props.onUpdatePhone
        ? await props.onUpdatePhone(redeemed.studentId, phoneDraft)
        : await updateClaimedPhone(redeemed.studentId, phoneDraft)
      if ((save as { success?: boolean }).success) {
        const savedPhone = (save as { phone?: string }).phone ?? phoneDraft
        setRedeemed({ ...redeemed, claimedPhone: savedPhone })
        setEditingPhone(false)
        setPostStep('coach')
      } else {
        setPhoneError((save as { error?: string }).error ?? CLAIM_COPY.claimPhoneSaveFail)
      }
    } catch {
      setPhoneError(CLAIM_COPY.claimPhoneSaveFail)
    } finally {
      setPhoneSaving(false)
    }
  }

  if (redeemed) {
    const payUrl = redeemed.studentId ? payScreenUrl(redeemed.studentId) : '/pay'

    if (postStep === 'phone') {
      return (
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="text-base">{CLAIM_COPY.claimSuccessTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4" data-testid="claim-phone-confirm">
            <p className="text-sm leading-relaxed">
              {CLAIM_COPY.claimSuccessDescription(props.studentName)}
            </p>
            <p className="text-sm font-medium">{CLAIM_COPY.claimPhoneConfirmTitle}</p>
            {!editingPhone && redeemed.claimedPhone ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed">
                  {CLAIM_COPY.claimPhoneConfirmDescription(redeemed.claimedPhone)}
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => setPostStep('coach')}>
                    {CLAIM_COPY.claimPhoneCorrectButton}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setPhoneDraft(redeemed.claimedPhone ?? '')
                      setPhoneError(null)
                      setEditingPhone(true)
                    }}
                  >
                    {CLAIM_COPY.claimPhoneEditButton}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSavePhone} className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {CLAIM_COPY.claimPhoneMissingDescription}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="claim-phone">{CLAIM_COPY.claimPhoneInputLabel}</Label>
                  <Input
                    id="claim-phone"
                    data-testid="claim-phone-input"
                    type="tel"
                    dir="ltr"
                    placeholder={CLAIM_COPY.claimPhonePlaceholder}
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                  />
                </div>
                {phoneError ? <p className="text-xs text-destructive">{phoneError}</p> : null}
                <Button type="submit" className="w-full" disabled={phoneSaving}>
                  {phoneSaving ? CLAIM_COPY.claimPhoneSaving : CLAIM_COPY.claimPhoneSaveButton}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4" dir="rtl">
        <InstallCoach platform={props.coachPlatform} onLater={() => window.location.assign(payUrl)} />
        <Button asChild className="w-full">
          <a href={payUrl}>{CLAIM_COPY.claimGoPay}</a>
        </Button>
      </div>
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
