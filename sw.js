const CACHE = 'jarvis-v9';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  const ready = (async () => {
    const old = (await caches.keys()).filter(k => k !== CACHE);
    await Promise.all(old.map(k => caches.delete(k)));
    await self.clients.claim();
    return old.length > 0;
  })();
  e.waitUntil(ready);
  // Po aktualizacji przeładuj wszystkie otwarte okna Jarvisa, ale dopiero PO aktywacji:
  // nawigacja czeka na aktywnego service workera, więc nie może być częścią waitUntil.
  ready.then(updated => {
    if (!updated) return;
    setTimeout(() => {
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(ws => ws.forEach(w => { try { w.navigate(w.url).catch(() => {}); } catch (err) { /* ignore */ } }));
    }, 400);
  });
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const key = u.origin + u.pathname;
  e.respondWith(
    fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); } return r; })
      .catch(() => caches.match(key).then(m => m || caches.match('./index.html')))
  );
});
