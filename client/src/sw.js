/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  let data = { title: 'Kindling', body: '새 메시지가 왔어요', roomCode: '' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Kindling', {
      body: data.body || '새 메시지가 왔어요',
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      data: { roomCode: data.roomCode || '' },
      tag: data.roomCode ? `kindling-${data.roomCode}` : 'kindling-msg',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const roomCode = event.notification.data?.roomCode;
  const url = roomCode ? `/?room=${encodeURIComponent(roomCode)}` : '/';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          await client.focus();
          client.postMessage({ type: 'OPEN_ROOM', roomCode });
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
