const CACHE_NAME = 'cruisesip-v5-4-1-20260714a';
const ASSETS = [
  './',
  './index.html',
  './manifest.json?v=5.4.1a',
  './css/styles.css?v=5.4.1a',
  './js/app.js?v=5.4.1a',
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
  './docs/ZWEITES_GERAET.md',
  './docs/REISEVERLAUF_IMPORT.md',
  './docs/BERICHT_EXPORT.md',
  './docs/PAKET_PROGNOSE.md',
  './docs/V5_UMSETZUNG.md',
  './docs/WIEDERHERSTELLUNGSPUNKTE.md',
  './docs/GERAETEABGLEICH_V52.md',
  './docs/BARKARTEN_VERSIONIERUNG_V53.md',
  './docs/REISE_BARKARTENVERSION_V531.md',
  './docs/REISEABSCHLUSS_V54.md',
  './docs/REISEVERLAUF_BEARBEITEN_V541.md',
  './TESTBERICHT.md'
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
