// Tax Calculator - Service Worker
// v3: shell is an iframe again; bump cache to evict the redirect-only shell.
// the <iframe> in it), and switched the HTML document to network-first so a
// stale cached page can never get "stuck" like this again.
const CACHE_NAME = 'tax-calculator-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon.png'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = event.request.mode === 'navigate' ||
                      event.request.destination === 'document';

  if (isDocument) {
    // Network-first for the shell page itself — always try to get the
    // latest index.html so a deploy is never masked by an old cached copy.
    // Only fall back to cache if the network is actually unreachable.
    event.respondWith(
      fetch(event.request).then(function(networkResponse) {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return networkResponse;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache-first for static assets (icon, manifest) — these rarely change.
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return networkResponse;
      }).catch(function() { return response; });
    })
  );
});
