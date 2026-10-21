// Service worker: makes the app installable and lets the weekly reminder be
// shown as a system notification. It caches nothing — the app needs Supabase
// to be useful, so there is no offline mode to pretend to.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Clicking the reminder brings the app forward, or opens it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) =>
        windows.length > 0 ? windows[0].focus() : self.clients.openWindow("/"),
      ),
  );
});
