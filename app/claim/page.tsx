import { resolveClaimPreview } from '@/lib/claim-actions'
import { ClaimScreen } from '@/components/claim/claim-screen'
import { Card, CardContent } from '@/components/ui/card'
import { CLAIM_COPY } from '@/lib/claim-copy'

// app/claim/page.tsx
// #36 slice 8/8 — NEW payer claim route (?token=). Confirms the named student
// + teacher, then magic-link login (signInWithOtp in ClaimScreen) + link via
// claimed_by (redeemClaim). Server component resolves the token -> names
// preview through the service-role action; invalid/expired/used/revoked
// tokens render copy states from CLAIM_COPY (single source, HITL review).
// Frozen URL contract: /claim?token=<raw bearer> (see buildClaimUrl).

const STATE_TITLE: Record<string, string> = {
  invalid: CLAIM_COPY.claimInvalidTitle,
  expired: CLAIM_COPY.claimExpiredTitle,
  used: CLAIM_COPY.claimUsedTitle,
  revoked: CLAIM_COPY.claimRevokedTitle,
}

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md p-4" dir="rtl">
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="font-semibold">{CLAIM_COPY.claimInvalidTitle}</p>
            <p className="text-sm text-muted-foreground">{CLAIM_COPY.claimInvalidDescription}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const preview = await resolveClaimPreview(token)

  if ((preview as { error?: string }).error) {
    const state = (preview as { state?: string }).state ?? 'invalid'
    return (
      <div className="mx-auto w-full max-w-md p-4" dir="rtl">
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="font-semibold">{STATE_TITLE[state] ?? CLAIM_COPY.claimInvalidTitle}</p>
            <p className="text-sm text-muted-foreground">
              {(preview as { error: string }).error}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const good = preview as { studentName: string; teacherName: string }

  return (
    <div className="mx-auto w-full max-w-md p-4" dir="rtl">
      <ClaimScreen token={token} studentName={good.studentName} teacherName={good.teacherName} />
    </div>
  )
}
