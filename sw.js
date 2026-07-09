const CACHE='getraenketracker-v31-0-2';
const ASSETS=['./','./index.html','index.html','style.css','app.js','manifest.json','CHANGELOG.md','data/barkarte.json','data/pakete.json','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/favicon-32x32.png','icons/favicon-16x16.png','favicon.ico'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html').then(x=>x||caches.match('index.html')))));});
