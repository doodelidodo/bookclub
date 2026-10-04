/* Book Club – offline cache. Network first for the app files, so updates arrive
   on the next visit; the cache only answers when there is no connection. */
var CACHE = "bookclub-v2";
var FILES = [
  "./", "index.html", "css/style.css", "vendor/chess.js", "assets/pieces.js", "assets/icon.svg",
  "js/repertoire.js", "js/sync.js", "js/board.js", "js/app.js",
  "packs/vienna.js", "packs/caro-kann.js", "packs/slav.js",
  "fonts/YoungSerif-Regular.woff2", "fonts/AtkinsonHyperlegible-Regular.woff2", "fonts/AtkinsonHyperlegible-Bold.woff2",
  "fonts/IBMPlexMono-Regular.woff2", "fonts/IBMPlexMono-Medium.woff2", "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.indexOf("/api/") >= 0) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
