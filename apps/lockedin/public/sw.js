// LockedIn service worker — hand-rolled (no next-pwa: it predates the app
// router and adds a dependency ~60 lines replace).
// Strategy:
//   - navigations: network-first, offline.html fallback
//   - /_next/static/ + /icons/: cache-first (content-hashed / immutable)
//   - everything else (Supabase, API, HMR): untouched — never cache user data,
//     so there is nothing user-scoped to purge on logout.
const CACHE = "lockedin-v2";
const PRECACHE = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Phase 21a: web push. Payload is JSON from /api/push/dispatch:
// { title, body, link, nid }.
self.addEventListener("push", (event) => {
  let data = { title: "LockedIn", body: "You have a new notification", link: "/notifications" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // keep defaults on malformed payload
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { link: data.link },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      const open = tabs.find((t) => "focus" in t);
      if (open) {
        open.navigate(link);
        return open.focus();
      }
      return self.clients.openWindow(link);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase etc.

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("/offline.html").then((hit) => hit ?? Response.error())
      )
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
