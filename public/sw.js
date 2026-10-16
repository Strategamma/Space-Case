const CACHE = 'space-case-1.0.1-auto-hollow';
const DEVELOPMENT = ['localhost', '127.0.0.1'].includes(self.location.hostname);
const SHELL = ['/', '/index.html', '/style.css?v=1.0.1-ballot', '/app.js?v=1.0.1-auto-hollow', '/roles.js?v=1.0.1-auto-hollow', '/setup.js?v=1.0.1-auto-hollow', '/script.js?v=1.0.1-auto-hollow', '/wiki.js?v=1.0.1-auto-hollow', '/cycles.js?v=1.0.0', '/avatars.js', '/manifest.webmanifest', '/assets/icon.svg', '/assets/icon-brand-192.png', '/assets/icon-brand-512.png', '/assets/icon-brand-maskable.png', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/icon-maskable.png', '/assets/voyage.webp', '/assets/space-case-logo.webp', '/assets/space-case-wordmark.webp', '/assets/crew-v2.webp', '/assets/crew-extra-v2.webp', '/assets/space-grotesk-regular.ttf', '/assets/space-grotesk-bold.ttf', '/socket.io/socket.io.js'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' })))).then(() => DEVELOPMENT ? self.skipWaiting() : undefined)); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || (url.pathname.startsWith('/socket.io/') && url.pathname !== '/socket.io/socket.io.js') || url.pathname === '/health') return;
  if (DEVELOPMENT) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); } return response; }).catch(() => caches.match(event.request.mode === 'navigate' ? '/' : event.request))); return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('/', copy)); } return response; }).catch(() => caches.match('/'))); return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
