const CACHE_NAME = 'vocab-v4';
const ASSETS = [
  '/chem-words/',
  '/chem-words/index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
