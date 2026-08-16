// PWA service worker (BACKLOG.md Ref 89). No offline asset caching yet --
// this exists to make the app installable and to receive Web Push. No fetch
// listener: Chrome's installability criteria haven't required one since
// Chrome 68, and an empty fetch handler just adds per-request overhead
// (Chrome's DevTools flags this as a no-op handler). If offline support
// becomes a separate goal, add a real fetch listener with actual caching
// logic (or adopt Serwist) without touching the push/notification handlers.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Spored", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Spored", {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
