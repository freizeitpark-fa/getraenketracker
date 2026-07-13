const CACHE_NAME = 'cruisesip-v4-3-2-20260713a';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './css/styles.css',
  './js/app.js',
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
  './docs/GITHUB_PAGES.md'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
