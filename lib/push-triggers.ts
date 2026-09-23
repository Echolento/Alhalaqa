'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assertOwnsStudent } from '@/lib/ownership'
import { buildManualRemindPayload } from '@/lib/push-payloads'
import { sendPushNotification } from '@/lib/push'

// Manual Remind trigger (#29 slice 1). The button UI lands in slice 2;
// this function is the reusable trigger. It deliberately ignores the
// auto-reminders toggle: manual nudges always send when invoked.
export async function triggerManualRemind(params: {
  studentId: string
  payerProfileId: string
  studentName: string
  amount?: number
  currency?: string
  periodKey?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const service = createServiceClient()
  const ownerTeacherId = await assertOwnsStudent(service, user.id, params.studentId)
  if (!ownerTeacherId) return { error: 'Forbidden' }

  const target = buildManualRemindPayload({
    payerProfileId: params.payerProfileId,
    studentName: params.studentName,
    amount: params.amount,
    currency: params.currency,
    studentId: params.studentId,
    periodKey: params.periodKey,
  })

  const { data: subscription } = await service
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('profile_id', params.payerProfileId)
    .maybeSingle()

  if (!subscription) return { success: false, reason: 'no_subscription' }

  const sent = await sendPushNotification(subscription, target.payload)
  return { success: sent }
}
