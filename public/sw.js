// ─────────────────────────────────────────────────────────────────────────────
// Service Worker — Web Push notifications
// Recibe push events del dispatcher (WebPushChannel) y muestra notificaciones
// del navegador. Click abre la actionUrl de la notificación.
// ─────────────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  // Sin data (ej: push emulado desde DevTools sin payload) mostramos una
  // notificación genérica en vez de fallar en silencio — facilita el debug.
  let payload = { title: 'Notificación', description: '' };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.description = event.data.text();
    }
  }

  const title = payload.title || 'Notificación';
  const options = {
    body: payload.description || '',
    icon: '/icon-192.png',
    badge: '/badge/ic_stat_gs.png',
    tag: payload.tag || 'giftcardshop-notification',
    data: { actionUrl: payload.actionUrl || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actionUrl = event.notification.data?.actionUrl || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si ya hay una pestaña abierta de la app, la enfoca y navega
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(actionUrl);
          return;
        }
      }
      return self.clients.openWindow(actionUrl);
    }),
  );
});
