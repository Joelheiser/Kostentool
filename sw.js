// Offline-Cache. Bei jeder neuen App-Version VERSION erhöhen.
const VERSION = 'kostentool-v1';
const DATEIEN = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/app.js',
  './src/berechnung.js',
  './src/datum.js',
  './src/feiertage.js',
  './src/geld.js',
  './src/periode.js',
  './src/sicherung.js',
  './src/speicher.js',
  './src/wiederkehrend.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Erst aus dem Cache (funktioniert offline), im Hintergrund aktualisieren.
self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const treffer = await cache.match(req, { ignoreSearch: true });
      const netz = fetch(req)
        .then((antwort) => {
          if (antwort.ok) cache.put(req, antwort.clone());
          return antwort;
        })
        .catch(() => null);
      if (treffer) {
        ev.waitUntil(netz);
        return treffer;
      }
      return (await netz) || (await cache.match('./index.html')) || Response.error();
    }),
  );
});
