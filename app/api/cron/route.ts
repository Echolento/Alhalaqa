import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOverdueStudents } from '@/lib/overdue'
import { getBillingMonthKey } from '@/lib/billing-period'
import { sendPushNotification, ensureVapidKeys, SubscriptionGoneError } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!ensureVapidKeys()) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('profile_id, endpoint, p256dh, auth')

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no subscriptions' })
  }

  let sentCount = 0

  for (const sub of subscriptions) {
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id')
      .eq('profile_id', sub.profile_id)

    const teacherId = teachers?.[0]?.id
    if (!teacherId) continue

    const { data: students } = await supabase
      .from('students')
      .select('id, name, payment_day')
      .eq('teacher_id', teacherId)
      .eq('is_active', true)

    if (!students || students.length === 0) continue

    const today = new Date()
    const billingMonthKey = getBillingMonthKey(today, 1)

    const { data: payments } = await supabase
      .from('student_payments')
      .select('student_id, month, paid')
      .eq('month', billingMonthKey)
      .in('student_id', students.map(s => s.id))

    const overdue = getOverdueStudents(students, payments || [], today)

    if (overdue.length === 0) continue

    const names = overdue.slice(0, 3).map(s => s.name)
    const remaining = overdue.length - 3
    let body = names.join('، ')
    if (remaining > 0) body += ` +${remaining} ${remaining === 1 ? 'أخر' : 'آخرين'}`
    body += ' لم يدفعوا بعد'

    try {
      await sendPushNotification(sub, {
        title: 'تذكير بالدفع',
        body,
        url: '/dashboard/payments',
      })
      sentCount++
    } catch (err) {
      if (err instanceof SubscriptionGoneError) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('profile_id', sub.profile_id)
      }
    }
  }

  return NextResponse.json({ sent: sentCount })
}
