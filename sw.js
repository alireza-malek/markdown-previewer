const VERSION = 'md-prev-v1';

self.addEventListener('install', (event) => {
  const base = new URL(self.registration.scope).pathname; // e.g. "/markdown-previewer/" or "/"
  const urlsToCache = [
    base,
    base + 'index.html',
    base + 'markdown-previewer.html',
    base + 'manifest.webmanifest'
  ];
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === VERSION ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((resp) => {
      if (resp) return resp;
      return fetch(event.request).then((net) => {
        const copy = net.clone();
        caches.open(VERSION).then(c => { try { c.put(event.request, copy); } catch (_) { } });
        return net;
      }).catch(() => {
        const base = new URL(self.registration.scope).pathname;
        return caches.match(base + 'index.html') ||
          caches.match(base + 'markdown-previewer.html');
      });
    })
  );
});
