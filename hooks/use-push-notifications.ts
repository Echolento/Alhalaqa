'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsLoading(false)
      return
    }

    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        registrationRef.current = reg
        return reg.pushManager.getSubscription()
      })
      .then(sub => {
        setIsSubscribed(!!sub)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('[sw-register]', err)
        setIsLoading(false)
      })
  }, [])

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Push notifications not supported')
      return
    }

    try {
      let permission = Notification.permission
      if (permission === 'denied') {
        setError('الإشعارات محظورة في المتصفح. سمح بها من إعدادات الموقع (أيقونة القفل بجانب الرابط)')
        return
      }
      if (permission === 'default') {
        permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setError('لم يتم منح الإذن')
          return
        }
      }

      // Force clean SW registration
      const existingRegs = await navigator.serviceWorker.getRegistrations()
      for (const r of existingRegs) {
        await r.unregister()
      }

      await new Promise<void>((resolve) => {
        // Small delay to let browser clean up
        setTimeout(resolve, 300)
      })

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      registrationRef.current = reg

      if (!reg.active) {
        setError('الخدمة المساعدة (Service Worker) غير نشطة')
        return
      }
      if (!reg.pushManager) {
        setError('Push غير مدعوم في هذا المتصفح')
        return
      }

      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await existing.unsubscribe()
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        setError('VAPID key not configured')
        return
      }

      const subPromise = reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('تعذر الاتصال بخدمة الإشعارات — تحقق من اتصالك بالإنترنت أو جرب متصفح آخر')), 15000)
      )
      const subscription = await Promise.race([subPromise, timeout])

      const json = subscription.toJSON()
      const result = await registerPushSubscription({
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setIsSubscribed(true)
      setError(null)
    } catch (err: any) {
      console.error('[push-subscribe]', err)
      setError(err.message || 'Failed to subscribe')
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    try {
      const reg = registrationRef.current || await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
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
