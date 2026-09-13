// Swasthsetu service worker.
//
// Deliberately minimal. This app shows patient health information, so
// the one thing a service worker must never do here is keep copies of
// signed-in pages or API responses on the device: a cached dashboard
// outlives sign-out and would be served to whoever picks the phone up
// next. So the rules are:
//
//   * Next's hashed build assets (/_next/static/...) are cached. They
//     are immutable and carry no data, and caching them is what lets a
//     reopened app render at all on a dead connection.
//   * Page navigations go to the network. If the network fails, the
//     user gets /offline - a static page that explains what to do and
//     points at 108 - instead of the browser's dinosaur.
//   * Everything else (API routes, Server Action posts, auth, images
//     from Cloudinary) is passed straight through and never stored.
//
// The ASHA field-visit queue is what actually makes the app usable
// offline; see lib/offline-sync. This worker only keeps the shell
// loadable so that queue can be reached.

const VERSION = "swasthsetu-v1";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname === "/favicon.ico";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match(OFFLINE_URL);
          return (
            cached ??
            new Response("You are offline. In an emergency call 108.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
  }
});
