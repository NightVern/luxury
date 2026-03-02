self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png', // Ganti dengan path icon Anda
      badge: '/badge.png',
      data: {
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  } catch (e) {
    console.error('Push event error:', e);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(clients.openWindow(url));
});