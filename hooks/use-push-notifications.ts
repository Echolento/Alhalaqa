'use client'

import { useState, useEffect, useCallback } from 'react'
import { registerPushSubscription, unregisterPushSubscription } from '@/lib/push-actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsLoading(false)
      return
    }

    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub)
        setIsLoading(false)
      })
    }).catch(() => {
      setIsLoading(false)
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Push notifications not supported')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        await existing.unsubscribe()
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        setError('VAPID key not configured')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const result = await registerPushSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
        },
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setIsSubscribed(true)
      setError(null)
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('تم رفض إذن الإشعارات')
      } else {
        setError('Failed to subscribe')
      }
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }

      await unregisterPushSubscription()
      setIsSubscribed(false)
      setError(null)
    } catch {
      setError('Failed to unsubscribe')
    }
  }, [])

  const toggle = useCallback(() => {
    if (isSubscribed) {
      unsubscribe()
    } else {
      subscribe()
    }
  }, [isSubscribed, subscribe, unsubscribe])

  return { isSubscribed, isLoading, error, toggle, subscribe, unsubscribe }
}
