// Minimal service worker: enables "Add to Home Screen" / installability and
// caches the app shell so the SPA still boots (with cached UI) when offline.
// Deliberately does NOT cache API responses - all live ride/booking data
// must always come from the network, never a stale cache.
const CACHE_NAME = "bikeride-shell-v1";
const SHELL_URLS = ["/", "/manifest.json", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Never intercept API calls or websocket upgrades - only the static app shell.
  if (request.method !== "GET" || request.url.includes("/api/") || request.url.includes("/socket.io/")) {
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
