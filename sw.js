// グラウンド・ゴルフ記録 サービスワーカー
// 方針: ページは「ネットワーク優先」（更新がすぐ反映される）。
//       つながらない時だけキャッシュから表示。アイコン等は都度キャッシュ。
const CACHE = 'gg-v1';
const STATIC = [
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(STATIC.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 外部（フォント・Supabase・CDN）はそのままネットワークへ
  if (url.origin !== location.origin) return;

  // ページ本体: ネットワーク優先 → 失敗時キャッシュ
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./ground_golf.html')))
    );
    return;
  }

  // その他（アイコン等）: キャッシュ優先
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => {
    const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r;
  })));
});
