// v3: network-first, and the app's own files always ask the site for the latest version
// (skips the browser's 10-minute copy), so an update shows up on the next open.
// The saved copy is only used when offline or when the site is down.
// v5: the Excel library and the font are saved too, so Excel export works without internet.
const CACHE = 'weighing-v5';
const FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const host = new URL(e.request.url).hostname;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  const keep = sameOrigin || host === 'cdn.sheetjs.com' || host === 'fonts.googleapis.com' || host === 'fonts.gstatic.com';
  const net = sameOrigin
    ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(e.request);
  e.respondWith(
    net
      .then(res => {
        if ((res.ok || res.type === 'opaque') && keep) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        }
        if (res.ok) return res;
        // Site down or removed: keep running from the saved copy if there is one
        return caches.match(e.request).then(cached => cached || res);
      })
      .catch(() => caches.match(e.request))
  );
});
