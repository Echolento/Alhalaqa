'use client'

// components/claim/phone-claim.tsx
// Teacher-code claim (no token): phone → email magic-link → teacher code → linked.
// The code is the teacher's vouch; the phone scopes it to that teacher's roster.
// Names are never shown before the code is accepted, so a stranger can't
// enumerate a roster by typing phone numbers.
// Seams: session/onClaim/onUnlink/createClient for tests.

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { claimWithTeacherCode, unlinkStudent } from '@/lib/claim-actions'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/phone-utils'
import { formatJoinCode, isValidJoinCodeFormat, normalizeJoinCode } from '@/lib/join-codes'
import { PhoneInput } from '@/components/auth/phone-input'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { PayerLogin } from '@/components/pay/payer-login'
import { InstallCoach } from '@/components/pwa/install-coach'
import type { HubStudent } from '@/lib/payer-hub'

export type PhoneClaimSession = { email: string | null } | null

type ClaimResult = { success?: boolean; claimed?: HubStudent[]; error?: string }

export function PhoneClaim(props: {
  /** OTP return leg: lands straight on the code step when a session exists. */
  initialPhone?: string
  /** Test/SSR seam. Production omits it and the live session is used. */
  session?: PhoneClaimSession
  /** Test seam overriding the server action. */
  onClaim?: (phone: string, code: string) => Promise<ClaimResult>
  onUnlink?: (studentId: string) => Promise<{ success?: boolean; error?: string }>
  createClient?: () => never
}) {
  const [liveSession, setLiveSession] = useState<PhoneClaimSession>(null)
  const [sessionChecked, setSessionChecked] = useState(props.session !== undefined)
  // PhoneInput speaks national digits (no +20, no leading 0): normalize any
  // seeded value (OTP ?phone= leg may carry full E.164) through the same rule.
  const [phone, setPhone] = useState(() =>
    props.initialPhone ? formatPhoneNumber(props.initialPhone).replace(/^\+20/, '') : '',
  )
  const [submittedPhone, setSubmittedPhone] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [claimed, setClaimed] = useState<HubStudent[] | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [unlinked, setUnlinked] = useState<string[]>([])

  const session = props.session !== undefined ? props.session : liveSession

  useEffect(() => {
    if (props.session !== undefined) return
    let cancelled = false
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return
        setLiveSession(data.user ? { email: data.user.email ?? null } : null)
        setSessionChecked(true)
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [props.session])

  // OTP return leg: `?phone=` + a session lands on the code step. The phone
  // is only used after the code check, so showing the field costs nothing.
  useEffect(() => {
    if (!sessionChecked || !session || submittedPhone) return
    if (!props.initialPhone) return
    const normalized = formatPhoneNumber(props.initialPhone)
    if (isValidPhoneNumber(normalized)) {
      setSubmittedPhone(normalized.replace(/^\+20/, ''))
      setPhoneError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionChecked, session])

  function startCodeStep(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    if (!isValidPhoneNumber(formatPhoneNumber(trimmed))) {
      setPhoneError(CLAIM_COPY.phoneClaimInvalidPhone)
      return
    }
    setPhoneError(null)
    setSubmittedPhone(trimmed)
  }

  async function handleClaim() {
    if (!submittedPhone) return
    const normalizedCode = normalizeJoinCode(code)
    if (!isValidJoinCodeFormat(normalizedCode)) {
      setClaimError(CLAIM_COPY.joinCodeInvalidFormat)
      return
    }
    setClaiming(true)
    setClaimError(null)
    try {
      const res = props.onClaim
        ? await props.onClaim(submittedPhone, normalizedCode)
        : await claimWithTeacherCode(submittedPhone, normalizedCode)
      if ((res as { success?: boolean }).success) {
        setClaimed((res as { claimed?: HubStudent[] }).claimed ?? [])
      } else {
        setClaimError((res as { error?: string }).error ?? CLAIM_COPY.joinCodeClaimFail)
      }
    } catch {
      setClaimError(CLAIM_COPY.joinCodeClaimFail)
    } finally {
      setClaiming(false)
    }
  }

  async function handleUnlink(studentId: string) {
    try {
      const res = props.onUnlink
        ? await props.onUnlink(studentId)
        : await unlinkStudent(studentId)
      if ((res as { success?: boolean }).success) {
        setUnlinked((prev) => [...prev, studentId])
      }
    } catch {
      // Best-effort: the row stays listed and the teacher can always unlink.
    }
  }

  function resetToEntry() {
    setSubmittedPhone(null)
    setCode('')
    setClaimed(null)
    setClaimError(null)
    setPhoneError(null)
    setUnlinked([])
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

  // Done: name every linked kid + per-row undo + onward to bills.
  if (claimed) {
    const visible = claimed.filter((c) => !unlinked.includes(c.studentId))
    return (
      <div className="space-y-4" dir="rtl">
        <Card data-testid="phone-claim-success">
          <CardHeader>
            <CardTitle className="text-base">{CLAIM_COPY.phoneClaimLinkedTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed">
              {CLAIM_COPY.phoneClaimLinkedDescription(
                visible.map((c) => c.studentName).join('، ') || '—',
              )}
            </p>
            {visible.map((c) => (
              <div
                key={c.studentId}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  {c.studentName} <span className="text-muted-foreground">— {c.teacherName}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleUnlink(c.studentId)}
                  className="h-auto px-2 py-1 text-xs font-normal text-muted-foreground/60 hover:text-muted-foreground"
                >
                  {CLAIM_COPY.phoneClaimNotYours}
                </Button>
              </div>
            ))}
            <Button asChild className="w-full">
              <a href="/pay">{CLAIM_COPY.claimGoPay}</a>
            </Button>
          </CardContent>
        </Card>
        <InstallCoach onLater={() => window.location.assign('/pay')} />
      </div>
    )
  }

  // Phone captured: code step requires a session; otherwise the email leg runs.
  if (submittedPhone) {
    if (!session) {
      return (
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="text-base">{CLAIM_COPY.phoneClaimEmailTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2" data-testid="phone-claim-email">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {CLAIM_COPY.phoneClaimEmailDescription}
            </p>
            <PayerLogin
              createClient={props.createClient as never}
              next={`/claim?phone=${encodeURIComponent(submittedPhone)}`}
            />
            <Button type="button" variant="ghost" size="sm" onClick={resetToEntry} className="w-full">
              {CLAIM_COPY.phoneClaimWrongNumber}
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="text-base">{CLAIM_COPY.joinCodeTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">{CLAIM_COPY.joinCodeDescription}</p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleClaim()
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="phone-claim-code">{CLAIM_COPY.joinCodeLabel}</Label>
              <Input
                id="phone-claim-code"
                data-testid="phone-claim-code"
                dir="ltr"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                maxLength={9}
                value={code}
                placeholder={CLAIM_COPY.joinCodePlaceholder}
                onChange={(e) => setCode(formatJoinCode(e.target.value))}
                className="text-center font-mono text-lg tracking-widest"
              />
              <p className="text-xs text-muted-foreground">{CLAIM_COPY.joinCodeHelper}</p>
            </div>
            {claimError ? (
              <p data-testid="phone-claim-error" className="text-xs text-destructive">
                {claimError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={claiming}>
              {claiming ? CLAIM_COPY.joinCodeChecking : CLAIM_COPY.joinCodeContinue}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetToEntry} className="w-full">
              {CLAIM_COPY.joinCodeWrongNumber}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Entry: one field.
  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="text-base">{CLAIM_COPY.phoneClaimTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{CLAIM_COPY.phoneClaimDescription}</p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            startCodeStep(phone)
          }}
          className="space-y-3"
        >
          <PhoneInput
            id="phone-claim-phone"
            name="phone-claim-phone"
            value={phone}
            onChange={setPhone}
            label={CLAIM_COPY.phoneClaimLabel}
            placeholder={CLAIM_COPY.phoneClaimPlaceholder}
          />
          {phoneError ? (
            <p data-testid="phone-claim-error" className="text-xs text-destructive">
              {phoneError}
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            {CLAIM_COPY.phoneClaimContinue}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
