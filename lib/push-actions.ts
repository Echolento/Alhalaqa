'use server'

import { createClient } from '@/lib/supabase/server'

export async function registerPushSubscription(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        profile_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'profile_id' },
    )

  if (error) return { error: error.message }
  return { success: true }
}

export async function unregisterPushSubscription() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('profile_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getPushSubscription(profileId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('profile_id', profileId)
    .maybeSingle()

  return data
}
