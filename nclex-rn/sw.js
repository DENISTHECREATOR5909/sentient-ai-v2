/* Offline cache for the NCLEX-RN adaptive practice exam.
   Cache-first: once the app has loaded a single time it runs with
   no network connection at all. */
var CACHE = 'nclex-cat-v1';
var ASSETS = [
  './', './index.html', './css/styles.css',
  './js/irt.js', './js/items.js', './js/app.js',
  './js/bank/moc.js', './js/bank/sic.js', './js/bank/hpm.js', './js/bank/psi.js',
  './js/bank/bcc.js', './js/bank/pha.js', './js/bank/rrp.js', './js/bank/phy.js',
  './js/bank/ngn.js', './js/bank/cases.js', './manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
