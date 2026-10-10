// Minimal fetch handler. Chrome requires a registered service worker WITH a
// fetch handler before it treats the app as installable and fires
// `beforeinstallprompt`. We never call respondWith, so this is a pure
// passthrough and caching/offline behaviour is unchanged.
self.addEventListener('fetch', () => {})

// Take over as soon as a new version installs, so icon fixes apply without
// waiting for every tab/client to close.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'Payment Reminder'
    const body = data.body || ''
    const url = data.url || '/dashboard'

    // Absolute URLs are required: Android Chrome does not reliably resolve
    // relative notification icon paths and falls back to a domain monogram.
    // `icon` = large coloured logo; `badge` = small monochrome status-bar glyph.
    const origin = self.location.origin

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: `${origin}/icon-512.png`,
        badge: `${origin}/badge-96.png`,
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
