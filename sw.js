// يحفظ ملفات الواجهة ليفتح التطبيق بسرعة وبدون إنترنت (المطوّف والأدعية والمواقيت بتشتغل بدون نت).
var CACHE = 'siraj-shell-v4';
var FILES = ['./', 'index.html', 'offline.html', 'styles.css?v=4', 'app.js?v=4', 'server.js?v=4', 'config.js?v=4', 'content.js?v=4', 'prayer.js?v=4', 'intro.js?v=4', 'manifest.webmanifest', 'guide.pdf', 'files/adhkar.pdf', 'files/checklist.pdf',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-180.png', 'icons/logo-green.png', 'icons/logo-white.png', 'icons/mark-green.png', 'icons/mark-white.png', 'icons/shamcash-logo.png', 'icons/shamcash-qr.jpg', 'icons/badge-96.png',
  'fonts/DIN-Light.woff', 'fonts/DIN-Regular.woff', 'fonts/DIN-Medium.woff', 'fonts/DIN-Bold.woff'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) { if (r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); } return r; }).catch(function () {
    return caches.match(e.request).then(function (m) { return m || caches.match(e.request, { ignoreSearch: true }); }).then(function (m) { return m || (e.request.mode === 'navigate' ? caches.match('offline.html') : Response.error()); });
  }));
});
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'السراج المنير', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'السراج المنير', { body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: d.tag || undefined, dir: 'rtl', lang: 'ar', vibrate: [80, 40, 80], data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if (cs[i].url.indexOf(self.registration.scope) === 0 && 'focus' in cs[i]) { cs[i].navigate(url).catch(function () {}); return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
