/* HUYỀN KPI MOBILE — service worker: mở nhanh & cài được như ứng dụng.
 * Mạng trước (luôn lấy bản mới nhất khi có mạng), mất mạng thì dùng bản đã lưu. Không lưu dữ liệu công ty / AI. */
const CACHE = 'huyenkpi-v1.0.6';
const SHELL = ['./', 'index.html', 'app.css', 'shim.js', 'config.js', 'templates.js', 'core.js', 'agent.js', 'mobile-bridge.js', 'app.js', 'extras.js', 'quote.js', 'mkt-quote-core.js', 'mkt-quote-adapter.js', 'pagectl.js', 'worker.js', 'xlsx.full.min.js', 'logo-ideco.png', 'huyenkpi-icon-192.png', 'huyenkpi-icon-512.png', 'huyenkpi-icon-maskable-512.png', 'apple-touch-icon.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('huyenkpi-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // chỉ xử lý file của chính ứng dụng; website Dashboard, Firebase, AI đi thẳng mạng
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL('./', location).pathname)) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
