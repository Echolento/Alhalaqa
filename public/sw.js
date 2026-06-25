self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'Payment Reminder'
    const body = data.body || ''
    const url = data.url || '/dashboard/payments'

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/Logo.png',
        badge: '/Logo.png',
        data: { url },
      }),
    )
  } catch {
    // Silently ignore malformed payloads
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard/payments'
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
