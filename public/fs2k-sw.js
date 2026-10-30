// FS2K Studio app: lets the Studio open even with a weak or no connection.
// Only handles the Studio page, its app icons and fonts. Everything else (the website,
// the Client Pool, /api/*) goes straight to the network, untouched.
const CACHE = 'fs2k-studio-v3';
const SHELL = ['/studio', '/app/icon-192.png', '/app/icon-512.png', '/app/fs2k.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('fs2k-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const studioPage = url.origin === location.origin && (url.pathname === '/studio' || url.pathname === '/tools/listing-carousel.html');
  const appFile = url.origin === location.origin && url.pathname.startsWith('/app/');
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!studioPage && !appFile && !font) return;

  if (studioPage) {
    // Newest version when online, saved copy when offline.
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/studio', copy)); }
        return res;
      }).catch(() => caches.match('/studio'))
    );
    return;
  }
  // Icons and fonts rarely change: saved copy first.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
