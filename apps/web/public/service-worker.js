// PWA service worker (BACKLOG.md Ref 89). No offline asset caching yet --
// this exists to make the app installable and to receive Web Push. If
// offline support becomes a separate goal, add caching in the fetch
// listener below (or adopt Serwist) without touching the push/notification
// handlers.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally a no-op passthrough (the browser serves the request
  // normally) -- present so the browser recognizes this as a fetch-handling
  // service worker rather than one that just runs push.
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
