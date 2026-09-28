'use client'

// components/claim/phone-claim.tsx
// Phone-pull claim (no token): type phone → see matches → login → linked.
// Zero claim taps by construction:
//   - with a session, matches auto-link the moment they load;
//   - without one, the email leg runs first and ?phone= auto-links on return.
// Typo protection lives in VIEWING the list (wrong names → "wrong number"
// escape) and in per-row UNLINK after (typo-linked rows cut in one tap).
// Seams: session/onLookup/onClaim/onUnlink/createClient for tests.

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { lookupStudentsByPhone, claimByPhone, unlinkStudent } from '@/lib/claim-actions'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/phone-utils'
import { CLAIM_COPY } from '@/lib/claim-copy'
import { PayerLogin } from '@/components/pay/payer-login'
import { InstallCoach } from '@/components/pwa/install-coach'
import type { HubStudent } from '@/lib/payer-hub'

export type PhoneClaimSession = { email: string | null } | null

type LookupResult = { students?: HubStudent[]; error?: string }
type ClaimResult = { success?: boolean; claimed?: HubStudent[]; error?: string }

export function PhoneClaim(props: {
  /** OTP return leg: auto-runs lookup on mount. */
  initialPhone?: string
  /** Test/SSR seam. Production omits it and the live session is used. */
  session?: PhoneClaimSession
  /** Test seams overriding the server actions. */
  onLookup?: (phone: string) => Promise<LookupResult>
  onClaim?: (phone: string) => Promise<ClaimResult>
  onUnlink?: (studentId: string) => Promise<{ success?: boolean; error?: string }>
  createClient?: () => never
}) {
  const [liveSession, setLiveSession] = useState<PhoneClaimSession>(null)
  const [sessionChecked, setSessionChecked] = useState(props.session !== undefined)
  const [phone, setPhone] = useState(props.initialPhone ?? '')
  const [submittedPhone, setSubmittedPhone] = useState<string | null>(
    props.initialPhone ?? null,
  )
  const [matches, setMatches] = useState<HubStudent[] | null>(null)
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [claimed, setClaimed] = useState<HubStudent[] | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [unlinked, setUnlinked] = useState<string[]>([])
  const autoFired = useRef<string | null>(null)

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

  async function runLookup(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    // Same Egyptian-format rule as the server: malformed numbers never
    // leave the device (no lookup call, instant feedback).
    if (!isValidPhoneNumber(formatPhoneNumber(trimmed))) {
      setMatches(null)
      setLookupError(CLAIM_COPY.phoneClaimInvalidPhone)
      return
    }
    setLooking(true)
    setLookupError(null)
    try {
      const res = props.onLookup
        ? await props.onLookup(trimmed)
        : await lookupStudentsByPhone(trimmed)
      if ((res as { error?: string }).error) {
        setMatches(null)
        setLookupError((res as { error: string }).error)
      } else {
        setSubmittedPhone(trimmed)
        setMatches((res as { students?: HubStudent[] }).students ?? [])
      }
    } catch {
      setMatches(null)
      setLookupError(CLAIM_COPY.phoneClaimLookupFail)
    } finally {
      setLooking(false)
    }
  }

  // OTP return leg: lookup fires on mount when the phone rides along.
  useEffect(() => {
    if (props.initialPhone && sessionChecked) {
      void runLookup(props.initialPhone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionChecked])

  // Zero-tap claim: the moment matches load WITH a session, they link.
  // Viewing the list first is the typo guard (wrong names → escape hatch).
  useEffect(() => {
    if (!session || !matches || matches.length === 0) return
    if (!submittedPhone || autoFired.current === submittedPhone) return
    autoFired.current = submittedPhone
    let cancelled = false
    setClaiming(true)
    setClaimError(null)
    ;(props.onClaim ? props.onClaim(submittedPhone) : claimByPhone(submittedPhone))
      .then((res) => {
        if (cancelled) return
        if ((res as { success?: boolean }).success) {
          setClaimed((res as { claimed?: HubStudent[] }).claimed ?? [])
        } else {
          setClaimError((res as { error?: string }).error ?? CLAIM_COPY.phoneClaimFail)
        }
      })
      .catch(() => {
        if (!cancelled) setClaimError(CLAIM_COPY.phoneClaimFail)
      })
      .finally(() => {
        if (!cancelled) setClaiming(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, matches, submittedPhone])

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
    autoFired.current = null
    setMatches(null)
    setSubmittedPhone(null)
    setClaimed(null)
    setClaimError(null)
    setLookupError(null)
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

  // Matches without a session: show them, then the email leg takes over.
  if (matches) {
    if (matches.length === 0) {
      return (
        <Card dir="rtl">
          <CardHeader>
            <CardTitle className="text-base">{CLAIM_COPY.phoneClaimEmptyTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" data-testid="phone-claim-empty">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {CLAIM_COPY.phoneClaimEmptyDescription}
            </p>
            <p className="text-xs text-muted-foreground">{CLAIM_COPY.phoneClaimInviteFallback}</p>
            <Button type="button" variant="outline" className="w-full" onClick={resetToEntry}>
              {CLAIM_COPY.phoneClaimWrongNumber}
            </Button>
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="space-y-4" dir="rtl">
        <Card data-testid="phone-claim-matches">
          <CardHeader>
            <CardTitle className="text-base">
              {CLAIM_COPY.phoneClaimFoundTitle(matches.length)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {matches.map((m) => (
              <div
                key={m.studentId}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span>{m.studentName}</span>
                <span className="text-muted-foreground">{m.teacherName}</span>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={resetToEntry} className="h-auto px-2 py-1 text-xs font-normal text-muted-foreground/60">
              {CLAIM_COPY.phoneClaimWrongNumber}
            </Button>
          </CardContent>
        </Card>
        {session ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              {claiming ? CLAIM_COPY.phoneClaimLinking : null}
              {claimError ? <p className="text-destructive">{claimError}</p> : null}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2" data-testid="phone-claim-email">
            <p className="text-sm font-medium">{CLAIM_COPY.phoneClaimEmailTitle}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {CLAIM_COPY.phoneClaimEmailDescription}
            </p>
            <PayerLogin
              createClient={props.createClient as never}
              next={`/claim?phone=${encodeURIComponent(submittedPhone ?? '')}`}
            />
          </div>
        )}
      </div>
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
            void runLookup(phone)
          }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label htmlFor="phone-claim-phone">{CLAIM_COPY.phoneClaimLabel}</Label>
            <Input
              id="phone-claim-phone"
              data-testid="phone-claim-input"
              type="tel"
              dir="ltr"
              placeholder={CLAIM_COPY.phoneClaimPlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {lookupError ? (
            <p data-testid="phone-claim-error" className="text-xs text-destructive">
              {lookupError}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={looking}>
            {looking ? CLAIM_COPY.claimPhoneSaving : CLAIM_COPY.phoneClaimContinue}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
