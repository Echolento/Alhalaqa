'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function registerPushSubscription(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  // Keyed by the caller's own id — service write, no anon writes (#25).
  const service = createServiceClient()

  const { error } = await service
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
  const service = createServiceClient()

  const { error } = await service
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

export async function setAutoRemindersEnabled(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  // Service-role write scoped to the caller's own teacher row (#25, #29).
  const service = createServiceClient()

  const { error } = await service
    .from('teachers')
    .update({ auto_reminders_enabled: enabled })
    .eq('profile_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getAutoRemindersEnabled(): Promise<boolean | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // Read-own via anon client RLS (Teacher can read own row).
  const { data } = await supabase
    .from('teachers')
    .select('auto_reminders_enabled')
    .eq('profile_id', user.id)
    .maybeSingle()

  const val = (data as { auto_reminders_enabled?: boolean } | null)?.auto_reminders_enabled
  return val ?? true
}
