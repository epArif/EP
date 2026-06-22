// ── EX·PO VAULT — Service Worker ──────────────────────────────────────────
// Works on iOS Safari + Android Chrome + Desktop
// Place this file at the ROOT of the Ev branch (same level as ev_fixed2.html)

const CACHE = 'expo-vault-v7';
const OFFLINE_KEY = 'expo-vault-page';

// ── Install: skip waiting immediately ─────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
});

// ── Activate: delete old caches, claim all clients ────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

// ── Fetch: Network-first for navigation, Cache-first for assets ───────────
self.addEventListener('fetch', e => {
  const req = e.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Skip cross-origin requests (CDN, API calls etc.)
  if (!req.url.startsWith(self.location.origin)) return;

  if (req.mode === 'navigate') {
    // Navigation (page load): Network-first, fallback to cached page
    e.respondWith(
      fetch(req)
        .then(res => {
          // Cache fresh copy on every successful load
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(OFFLINE_KEY, clone));
          return res;
        })
        .catch(() =>
          caches.open(CACHE).then(c => c.match(OFFLINE_KEY))
        )
    );
    return;
  }

  // All other requests: Cache-first, fallback to network
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Cache static assets (GeoJSON, fonts, etc.) for offline use
        if (res.ok && req.url.match(/\.(json|geojson|woff2?|ttf|png|svg)$/)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
