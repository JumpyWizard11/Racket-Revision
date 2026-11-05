// Service worker: stores every file of the app on the phone so it works with no signal.
// IMPORTANT: when you change any app file, bump VERSION so phones download the new copy.
const VERSION = 'racket-rev-v1';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './js/racket.js', './js/viz.js', './js/questions1.js', './js/questions2.js', './js/questions3.js',
  './js/lessons.js', './js/map.js', './js/app.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Cache first (offline), falling back to the network; refresh the cache in the background when online.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
