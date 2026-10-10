import webpush from 'web-push'
import type { createServiceClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceClient>

export async function getPushSubscription(
  service: ServiceClient,
  profileId: string,
): Promise<{ endpoint: string; p256dh: string; auth: string } | null> {
  const { data } = await service
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('profile_id', profileId)
    .maybeSingle()
  return (data as { endpoint: string; p256dh: string; auth: string } | null) ?? null
}

function getVapidKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey }
}

export function ensureVapidKeys() {
  const keys = getVapidKeys()
  if (keys) {
    webpush.setVapidDetails(
      'mailto:support@alhalaqa.app',
      keys.publicKey,
      keys.privateKey,
    )
    return true
  }
  return false
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
) {
  if (!ensureVapidKeys()) return false

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    )
    return true
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      throw new SubscriptionGoneError()
    }
    return false
  }
}

export class SubscriptionGoneError extends Error {
  constructor() {
    super('Push subscription is no longer valid')
    this.name = 'SubscriptionGoneError'
  }
}
