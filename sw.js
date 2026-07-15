const CACHE_NAME = 'daleel-albar-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(()=>{}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

/* استراتيجية: الشبكة أولاً لملف الصفحة نفسه (لضمان آخر تحديث)،
   وذاكرة مؤقتة أولاً لبلاطات الخرائط وملفات المكتبات الخارجية
   (كي تعمل المناطق التي زرتها سابقًا بدون إنترنت) */
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isTileOrLib = /tile\.openstreetmap\.org|arcgisonline\.com|cdnjs\.cloudflare\.com|fonts\.g(oogleapis|static)\.com|gstatic\.com\/firebasejs/.test(url);

  if (isTileOrLib) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(res => {
            if (res && res.status === 200) cache.put(event.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  if (event.request.mode === 'navigate' || APP_SHELL.some(p => url.endsWith(p.replace('./','')))) {
    event.respondWith(
      fetch(event.request).then(res => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, res.clone()));
        return res;
      }).catch(() => caches.match(event.request))
    );
  }
});
