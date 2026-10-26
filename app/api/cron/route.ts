import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOverdueStudents } from '@/lib/overdue'
import { loadRosterBilling } from '@/lib/roster-billing'
import { normalizeFrequency } from '@/lib/billing-period'
import { sendOverdueEmail } from '@/lib/email-actions'
import {
  buildAutoDuePayload,
  buildDailyDigestPayload,
  buildOverdueEscalationPayload,
  type PushPayload,
} from '@/lib/push-payloads'
import { getPushSubscription, sendPushNotification, SubscriptionGoneError } from '@/lib/push'
import {
  cairoDateKey,
  dueTriggers,
  ESCALATION_MIN_DAYS,
  type CronTrigger,
} from '@/lib/cron-schedule'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Service = ReturnType<typeof createServiceClient>

async function pushToProfile(
  service: Service,
  profileId: string,
  payload: PushPayload,
): Promise<{ attempted: boolean; sent?: boolean; reason?: string }> {
  const vapidConfigured =
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY
  if (!vapidConfigured) {
    console.log('[cron-push] skipped push: VAPID keys not configured')
    return { attempted: false, reason: 'vapid_not_configured' }
  }
  const subscription = await getPushSubscription(service, profileId)
  if (!subscription) {
    console.log('[cron-push] skipped push: no subscription for profile')
    return { attempted: false, reason: 'no_subscription' }
  }
  try {
    const sent = await sendPushNotification(subscription, payload)
    return { attempted: true, sent }
  } catch (err: any) {
    // A dead endpoint is permanent: prune it so the next tick doesn't retry
    // (and hang) on the same subscription forever.
    if (err instanceof SubscriptionGoneError || err?.name === 'SubscriptionGoneError') {
      try {
        await service.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      } catch {}
      return { attempted: true, sent: false, reason: 'subscription_gone' }
    }
    console.log(`[cron-push] push failed: ${err?.message || 'unknown'}`)
    return { attempted: true, sent: false, reason: err?.message || 'push_failed' }
  }
}

/**
 * Idempotency claim: first hourly tick of the day wins, retries skip.
 * Toggle is dead — automation always on; this table is the only gate.
 */
async function claimFire(
  service: Service,
  trigger: CronTrigger,
  fireDate: string,
  teacherId: string,
): Promise<boolean> {
  const { data, error } = await service
    .from('cron_fires')
    .upsert(
      { trigger, fire_date: fireDate, teacher_id: teacherId },
      { onConflict: 'trigger,fire_date,teacher_id', ignoreDuplicates: true },
    )
    .select('trigger')
  if (error) {
    console.log(`[cron] fire-claim failed (${trigger}): ${error.message}`)
    return false
  }
  return (data?.length ?? 0) > 0
}

/**
 * Authorized if the bearer matches either the legacy env secret (Vercel) or a
 * database-minted token verified via the SECURITY DEFINER `verify_cron_secret`
 * RPC. The DB token is generated in Vault and never exposed — so the hourly
 * pg_cron trigger needs no shared secret on the deployment.
 */
async function isAuthorized(request: Request, supabase: Service): Promise<boolean> {
  const authHeader = request.headers.get('authorization') ?? ''
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!provided) return false
  if (process.env.CRON_SECRET && provided === process.env.CRON_SECRET) return true
  try {
    const { data, error } = await supabase.rpc('verify_cron_secret', { provided })
    if (error) return false
    return data === true
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const supabase = createServiceClient()
  if (!(await isAuthorized(request, supabase))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const triggers = dueTriggers(now)
  const dateKey = cairoDateKey(now)

  // Dead hours (22 of 24 ticks) must not read a single roster row.
  if (triggers.length === 0) {
    return NextResponse.json({ triggers, date: dateKey, results: [] })
  }

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, profile_id, default_monthly_price')

  if (!teachers || teachers.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no teachers', triggers, date: dateKey })
  }

  const results: any[] = []

  for (const teacher of teachers) {
    const teacherRes: Record<string, any> = { teacher: teacher.id, triggers: {} }
    const today = new Date()

    // Same read the dashboard uses: live students + FULL payment history +
    // pending receipts + the canonical billing state. A narrowed query window
    // here is how a payer who just settled got nagged as unpaid.
    let roster: Awaited<ReturnType<typeof loadRosterBilling>>
    try {
      roster = await loadRosterBilling(supabase, teacher.id, today)
    } catch (err: any) {
      // Unreadable history is not an empty history — skip this teacher instead
      // of nagging the whole roster on a failed query.
      console.log(`[cron] roster read failed for teacher ${teacher.id}: ${err?.message || 'unknown'}`)
      teacherRes.error = 'roster_read_failed'
      results.push(teacherRes)
      continue
    }

    if (roster.entries.length === 0) continue

    const students = roster.entries.map((entry) => entry.student)
    const entriesById = new Map(roster.entries.map((entry) => [entry.student.id, entry]))

    // No grace: nagging starts on due day. Settled rows + pending-review rows
    // never get nagged.
    const overdue = getOverdueStudents(
      roster.entries.map(({ student }) => ({
        id: student.id,
        name: student.name || 'طالب',
        frequency: normalizeFrequency(student.frequency),
        next_due_date: student.next_due_date,
        starts_on: student.starts_on,
      })),
      roster.payments,
      today,
      0,
      roster.proofs,
    )
    const pendingKeys = new Set(
      roster.proofs.map((p) => `${p.student_id}_${p.period_key}`),
    )
    const nagTargets = overdue.filter((o) => {
      const entry = entriesById.get(o.id)
      if (!entry?.student.claimed_by) return false
      // A receipt pending review for the outstanding cycle is not a debt yet.
      if (pendingKeys.has(`${o.id}_${entry.state.cycleKey}`)) return false
      return true
    })
    const unclaimedCount = students.filter((s) => !s.claimed_by).length

    // ——— 10:00 payer nags: daily, no cap, skip-pending above ———
    if (triggers.includes('payer_nag')) {
      if (await claimFire(supabase, 'payer_nag', dateKey, teacher.id)) {
        let sent = 0
        const skipped: string[] = []
        for (const target of nagTargets) {
          const entry = entriesById.get(target.id)!
          const row = entry.student
          const periodKey = entry.state.cycleKey
          const amount =
            Number(row.monthly_price) || Number(teacher.default_monthly_price) || 0
          const built = buildAutoDuePayload({
            payerProfileId: row.claimed_by!,
            studentName: row.name || 'طالب',
            amount,
            studentId: row.id,
            periodKey,
          })
          if (!built) {
            skipped.push(row.id)
            continue
          }
          const outcome = await pushToProfile(supabase, built.profileId, built.payload)
          if (outcome.sent) sent++
          else skipped.push(row.id)
        }
        // Filtered-out rows (unclaimed, pending review) count as skipped too.
        const filtered = overdue.length - nagTargets.length
        teacherRes.triggers.payer_nag = { sent, skipped: skipped.length + filtered }
      } else {
        teacherRes.triggers.payer_nag = { skipped: 'already_fired' }
      }
    }

    // ——— 10:00 escalation: overdue day 3+, tell the teacher too ———
    if (triggers.includes('escalation')) {
      if (await claimFire(supabase, 'escalation', dateKey, teacher.id)) {
        const stale = overdue.filter((o) => o.daysOverdue >= ESCALATION_MIN_DAYS)
        if (stale.length === 0) {
          teacherRes.triggers.escalation = { sent: false, reason: 'none_stale' }
        } else {
          const built = buildOverdueEscalationPayload({
            teacherProfileId: teacher.profile_id,
            overdue: stale,
          })
          teacherRes.triggers.escalation = built
            ? await pushToProfile(supabase, built.profileId, built.payload)
            : { sent: false, reason: 'no_targets' }
        }
      } else {
        teacherRes.triggers.escalation = { skipped: 'already_fired' }
      }
    }

    // ——— 08:00 digest: email (existing) + one daily push ———
    if (triggers.includes('digest_morning')) {
      if (await claimFire(supabase, 'digest_morning', dateKey, teacher.id)) {
        let email: string | undefined
        try {
          const result = await supabase.auth.admin.getUserById(teacher.profile_id)
          email = result.data?.user?.email ?? undefined
        } catch {}
        let emailRes: { sent: boolean; reason?: string } = { sent: false }
        if (email && overdue.length > 0) {
          try {
            emailRes = await sendOverdueEmail({
              to: email,
              teacherName: 'أستاذ',
              overdueNames: overdue.map((s) => s.name),
            })
          } catch (err: any) {
            // The digest claim is already burned; a mail failure must not abort
            // the remaining teachers (or the push next to it).
            console.log(`[cron] digest email failed: ${err?.message || 'unknown'}`)
            emailRes = { sent: false, reason: 'email_failed' }
          }
        }
        const built = buildDailyDigestPayload({
          teacherProfileId: teacher.profile_id,
          pendingCount: roster.proofs.length,
          overdueCount: overdue.length,
          unclaimedCount,
        })
        const push = built
          ? await pushToProfile(supabase, built.profileId, built.payload)
          : { sent: false, reason: 'nothing_to_report' }
        teacherRes.triggers.digest_morning = { email: emailRes, push }
      } else {
        teacherRes.triggers.digest_morning = { skipped: 'already_fired' }
      }
    }

    results.push(teacherRes)
  }

  return NextResponse.json({ triggers, date: dateKey, results })
}
