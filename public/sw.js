// Minimal fetch handler. Chrome requires a registered service worker WITH a
// fetch handler before it treats the app as installable and fires
// `beforeinstallprompt`. We never call respondWith, so this is a pure
// passthrough and caching/offline behaviour is unchanged.
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'Payment Reminder'
    const body = data.body || ''
    const url = data.url || '/dashboard'

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/icon-512.png',
        badge: '/icon-512.png',
        data: { url },
      }),
    )
  } catch {
    // Silently ignore malformed payloads
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})
