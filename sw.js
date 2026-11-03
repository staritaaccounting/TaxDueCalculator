// Tax Calculator - Service Worker
// Bump this version whenever you change index.html / manifest / icon.
const CACHE_NAME = 'tax-calculator-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Cache each file individually so one missing file doesn't break install
      return Promise.all(ASSETS.map(function (a) {
        return cache.add(a).catch(function () {});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  // Only handle our own GitHub Pages files. Apps Script / Google requests go straight to the network.
  if (url.origin !== self.location.origin) return;

  // Pages: network first (so updates show up), fall back to cache when offline
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  // Static files: cache first
  event.respondWith(
    caches.match(req).then(function (res) { return res || fetch(req); })
  );
});
