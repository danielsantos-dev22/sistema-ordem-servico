const CACHE_NAME = 'os2-v4';
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase e Google APIs: sempre pela rede
  if (
    url.includes('firebaseapp.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firestore.googleapis.com')
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // index.html: SEMPRE busca na rede, nunca usa cache
  if (
    url.endsWith('/') ||
    url.endsWith('/index.html') ||
    url === self.location.origin + '/'
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais assets (ícones, manifest, fonts): cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
