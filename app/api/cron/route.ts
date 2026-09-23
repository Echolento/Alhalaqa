import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOverdueStudents } from '@/lib/overdue'
import { getPeriodKey } from '@/lib/billing-period'
import { sendOverdueEmail } from '@/lib/email-actions'
import { buildTeacherDigestPayload } from '@/lib/push-payloads'
import { sendPushNotification } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, profile_id, default_monthly_price, auto_reminders_enabled')

  if (!teachers || teachers.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no teachers' })
  }

  let sentCount = 0
  const results: any[] = []

  for (const teacher of teachers) {
    let email: string | undefined
    try {
      const result = await supabase.auth.admin.getUserById(teacher.profile_id)
      email = result.data?.user?.email
    } catch {}
    if (!email) continue

    const { data: students } = await supabase
      .from('students')
      .select('id, name, payment_day, frequency')
      .eq('teacher_id', teacher.id)
      .eq('is_active', true)

    if (!students || students.length === 0) continue

    const today = new Date()
    const months = [...new Set(students.map(s => getPeriodKey(today, (s as any).frequency ?? 'monthly', s.payment_day || 1)))]

    const { data: payments } = await supabase
      .from('student_payments')
      .select('student_id, month, paid')
      .in('month', months)
      .in('student_id', students.map(s => s.id))

    const overdue = getOverdueStudents(students, payments || [], today)
    if (overdue.length === 0) continue

    const result = await sendOverdueEmail({
      to: email,
      teacherName: 'أستاذ',
      overdueNames: overdue.map(s => s.name),
    })

    // Push fan-out: teacher digest (#29). Email always attempted first;
    // push is best-effort and never blocks the email result.
    let push: { attempted: boolean; sent?: boolean; reason?: string } = { attempted: false }
    const autoOn = (teacher as { auto_reminders_enabled?: boolean }).auto_reminders_enabled !== false
    if (autoOn) {
      const digest = buildTeacherDigestPayload({
        teacherProfileId: teacher.profile_id,
        overdueNames: overdue.map(s => s.name),
        autoRemindersEnabled: true,
      })
      if (digest) {
        const vapidConfigured =
          !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY
        if (!vapidConfigured) {
          console.log('[cron-push] skipped push: VAPID keys not configured')
          push = { attempted: false, reason: 'vapid_not_configured' }
        } else {
          const { data: subscription } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('profile_id', teacher.profile_id)
            .maybeSingle()
          if (!subscription) {
            console.log('[cron-push] skipped push: no subscription for teacher')
            push = { attempted: false, reason: 'no_subscription' }
          } else {
            try {
              const sent = await sendPushNotification(subscription, digest.payload)
              push = { attempted: true, sent }
            } catch (err: any) {
              console.log(`[cron-push] push failed: ${err?.message || 'unknown'}`)
              push = { attempted: true, sent: false, reason: err?.message || 'push_failed' }
            }
          }
        }
      }
    } else {
      push = { attempted: false, reason: 'auto_reminders_disabled' }
    }

    results.push({ email, overdueCount: overdue.length, overdueNames: overdue.map(s => s.name), sent: result.sent, reason: result.reason, push })
    if (result.sent) sentCount++
  }

  return NextResponse.json({ sent: sentCount, results })
}
