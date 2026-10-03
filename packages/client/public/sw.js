/**
 * Offline support, so the farm opens on a plane or a bad signal.
 *
 * The game itself is entirely local: only playing together needs the network.
 * Built asset names carry a hash, so they can be cached forever; the page
 * itself is fetched fresh when possible so updates arrive, with the cached
 * copy as a fallback. Supabase and the keep-alive are never cached.
 */
const CACHE = 'our-journey-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, fonts: straight to the network
  if (url.pathname.startsWith('/api/')) return;

  // the page: fresh when online, cached when not
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((r) => {
          const copy = r.clone();
          void caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return r;
        })
        .catch(() => caches.match('./index.html').then((r) => r ?? Response.error())),
    );
    return;
  }

  // everything else: cached first, and anything new is kept for next time
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((r) => {
          if (r.ok && r.type === 'basic') {
            const copy = r.clone();
            void caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return r;
        }),
    ),
  );
});
