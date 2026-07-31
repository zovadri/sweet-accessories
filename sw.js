const CACHE_NAME = 'sweet-cache-v2';
const CORE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo.jpeg',
  '/images/favicon.svg',
  '/images/placeholder.svg',
  '/dashboard/js/dashboard.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = event.request.mode === 'navigate' || (url.pathname.endsWith('.html') || url.pathname.endsWith('/'));

  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => { cache.put(event.request, clone); });
        return networkResponse;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('/images/placeholder.svg')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      }).catch(() => {
        return caches.match('/images/placeholder.svg');
      });
    })
  );
});
