// ── AURATRIX STORE SERVICE WORKER ─────────────────────────────────────────────
// This is a LIVE e-commerce store. Inventory and products change constantly.
// POLICY: Network-only for ALL pages and APIs. No caching of dynamic content.
// Only the offline fallback page is cached for when the user truly has no internet.

const CACHE_NAME = 'auratrix-offline-v4';
const OFFLINE_URL = '/offline.html';

// Install: only cache the offline fallback page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete ALL previous caches (v1, v2, v3, anything old)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name).catch(() => {}))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-ONLY for everything.
// Only fall back to the offline page if a page navigation fails.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-HTTP requests (chrome-extension://, etc.)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  // Only intercept navigation requests (page loads/reloads)
  // Everything else (JS, CSS, APIs, images) goes directly to the network
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        // Only show offline page if truly offline
        const offlinePage = await caches.match(OFFLINE_URL).catch(() => null);
        return (
          offlinePage ||
          new Response('You are offline. Please check your internet connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          })
        );
      })
    );
  }

  // For all other request types: do nothing — browser handles natively (network-only)
});
