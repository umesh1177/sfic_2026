/* Swachh Setu PWA Service Worker — Native Mobile Push Notifications & Offline Support */

const SW_VERSION = 'swachh-setu-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle real background Web Push payloads (even when app is closed / screen locked)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Swachh Setu · NMC Alert',
    body: 'You have a new municipal notification.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'swachh-setu-alert',
    url: '/'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: payload.tag || `swachhsetu-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    timestamp: payload.timestamp || Date.now(),
    data: {
      url: payload.url || '/',
      type: payload.type || 'notification',
      referenceId: payload.referenceId || null
    }
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Handle foreground/polled notification requests from the open PWA (Android Chrome requires SW showNotification)
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.type !== 'SHOW_NOTIFICATION') return;

  const { title, body, tag, url, referenceId } = msg.payload || {};
  event.waitUntil(
    self.registration.showNotification(title || 'Swachh Setu', {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: tag || `swachhsetu-${Date.now()}`,
      renotify: true,
      data: { url: url || '/', referenceId: referenceId || null }
    })
  );
});

// Focus existing Swachh Setu PWA window or open it when user taps the OS notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data || {}
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
