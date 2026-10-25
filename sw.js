// SAVE ME service worker: يخزّن واجهة الصفحات فقط. لا يلمس أي طلب لـ Supabase.
const CACHE = 'saveme-v1';
const SHELL = [
  'saveme-portal.html', 'saveme-dashboard.html', 'saveme-device.html', 'saveme-signup.html',
  'saveme-logo.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'manifest.webmanifest', 'device.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase وغيره: مباشرة من الشبكة

  // الصفحات: الشبكة أولًا (تحديث فوري)، والكاش عند انقطاع الإنترنت
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
        return res;
      } catch (err) {
        return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('saveme-dashboard.html')) || Response.error();
      }
    })());
    return;
  }

  // الصور والملفات الثابتة: الكاش أولًا
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
