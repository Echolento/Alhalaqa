import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOverdueStudents } from '@/lib/overdue'
import { getPeriodKey } from '@/lib/billing-period'
import { sendOverdueEmail } from '@/lib/email-actions'
import {
  buildAutoDuePayload,
  buildDailyDigestPayload,
  buildOverdueEscalationPayload,
  type PushPayload,
} from '@/lib/push-payloads'
import { sendPushNotification } from '@/lib/push'
import {
  cairoDateKey,
  dueTriggers,
  ESCALATION_MIN_DAYS,
  type CronTrigger,
} from '@/lib/cron-schedule'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Service = ReturnType<typeof createServiceClient>

async function getSubscription(
  service: Service,
  profileId: string,
): Promise<{ endpoint: string; p256dh: string; auth: string } | null> {
  const { data } = await service
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('profile_id', profileId)
    .maybeSingle()
  return (data as { endpoint: string; p256dh: string; auth: string } | null) ?? null
}

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
  const subscription = await getSubscription(service, profileId)
  if (!subscription) {
    console.log('[cron-push] skipped push: no subscription for profile')
    return { attempted: false, reason: 'no_subscription' }
  }
  try {
    const sent = await sendPushNotification(subscription, payload)
    return { attempted: true, sent }
  } catch (err: any) {
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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const triggers = dueTriggers(now)
  const dateKey = cairoDateKey(now)
  const supabase = createServiceClient()

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, profile_id, default_monthly_price, currency')

  if (!teachers || teachers.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no teachers', triggers, date: dateKey })
  }

  const results: any[] = []

  for (const teacher of teachers) {
    const teacherRes: Record<string, any> = { teacher: teacher.id, triggers: {} }

    const { data: students } = await supabase
      .from('students')
      .select('id, name, phone, monthly_price, payment_day, frequency, claimed_by')
      .eq('teacher_id', teacher.id)
      .eq('is_active', true)

    if (!students || students.length === 0) continue

    const today = new Date()
    const months = [
      ...new Set(
        students.map((s) =>
          getPeriodKey(today, (s as any).frequency ?? 'monthly', (s as any).payment_day || 1),
        ),
      ),
    ]

    const [{ data: payments }, { data: pendingProofs }] = await Promise.all([
      supabase
        .from('student_payments')
        .select('student_id, month, paid')
        .in('month', months)
        .in('student_id', students.map((s) => s.id)),
      supabase
        .from('payment_proofs')
        .select('student_id, period_key')
        .eq('status', 'pending')
        .in('student_id', students.map((s) => s.id)),
    ])

    // No grace: nagging starts on due day. Paid rows + pending-review rows
    // never get nagged.
    const overdue = getOverdueStudents(students as any[], payments || [], today, 0)
    const pendingKeys = new Set(
      (pendingProofs || []).map((p: any) => `${p.student_id}_${p.period_key}`),
    )
    const nagTargets = overdue.filter((o) => {
      const row = (students as any[]).find((s) => s.id === o.id)
      if (!row?.claimed_by) return false
      const periodKey = getPeriodKey(
        today,
        row.frequency ?? 'monthly',
        row.payment_day || 1,
      )
      if (pendingKeys.has(`${o.id}_${periodKey}`)) return false
      return true
    })
    const unclaimedCount = (students as any[]).filter((s) => !s.claimed_by).length

    // ——— 10:00 payer nags: daily, no cap, skip-pending above ———
    if (triggers.includes('payer_nag')) {
      if (await claimFire(supabase, 'payer_nag', dateKey, teacher.id)) {
        let sent = 0
        const skipped: string[] = []
        for (const target of nagTargets) {
          const row = (students as any[]).find((s) => s.id === target.id)
          const periodKey = getPeriodKey(
            today,
            row.frequency ?? 'monthly',
            row.payment_day || 1,
          )
          const amount =
            Number(row.monthly_price) || Number(teacher.default_monthly_price) || 0
          const built = buildAutoDuePayload({
            payerProfileId: row.claimed_by,
            studentName: row.name || 'طالب',
            amount,
            currency: teacher.currency || 'EGP',
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

    // ——— 08:00 digest: email (existing) + push ———
    if (triggers.includes('digest_morning')) {
      if (await claimFire(supabase, 'digest_morning', dateKey, teacher.id)) {
        let email: string | undefined
        try {
          const result = await supabase.auth.admin.getUserById(teacher.profile_id)
          email = result.data?.user?.email ?? undefined
        } catch {}
        let emailRes = { sent: false }
        if (email && overdue.length > 0) {
          emailRes = await sendOverdueEmail({
            to: email,
            teacherName: 'أستاذ',
            overdueNames: overdue.map((s) => s.name),
          })
        }
        const built = buildDailyDigestPayload({
          teacherProfileId: teacher.profile_id,
          pendingCount: (pendingProofs || []).length,
          overdueNames: overdue.map((s) => s.name),
          unclaimedCount,
          evening: false,
        })
        const push = built
          ? await pushToProfile(supabase, built.profileId, built.payload)
          : { sent: false, reason: 'nothing_to_report' }
        teacherRes.triggers.digest_morning = { email: emailRes, push }
      } else {
        teacherRes.triggers.digest_morning = { skipped: 'already_fired' }
      }
    }

    // ——— 20:00 digest: push only ———
    if (triggers.includes('digest_evening')) {
      if (await claimFire(supabase, 'digest_evening', dateKey, teacher.id)) {
        const built = buildDailyDigestPayload({
          teacherProfileId: teacher.profile_id,
          pendingCount: (pendingProofs || []).length,
          overdueNames: overdue.map((s) => s.name),
          unclaimedCount,
          evening: true,
        })
        teacherRes.triggers.digest_evening = built
          ? await pushToProfile(supabase, built.profileId, built.payload)
          : { sent: false, reason: 'nothing_to_report' }
      } else {
        teacherRes.triggers.digest_evening = { skipped: 'already_fired' }
      }
    }

    results.push(teacherRes)
  }

  return NextResponse.json({ triggers, date: dateKey, results })
}
