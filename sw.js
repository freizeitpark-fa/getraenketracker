const CACHE_NAME = 'cruisesip-v4-4-0-20260713b';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css?v=4.4.0',
  './js/app.js?v=4.4.0',
  './data/barkarte.json',
  './data/pakete.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png',
  './assets/favicon.ico',
  './favicon.ico',
  './README.md',
  './CHANGELOG.md',
  './ROADMAP.md',
  './OFFLINE.md',
  './docs/BARKARTE_IMPORT.md',
  './docs/DATENMODELL.md',
  './docs/GITHUB_PAGES.md',
  './docs/ZWEITES_GERAET.md'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      }
      return response;
    } catch (_) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      throw _;
    }
  })());
});
