// VO Hub service worker — bumps with every deploy to bust stale caches.
// Bumped to v3: harder guarantees that respondWith() never resolves to
// undefined (the bug that froze the screen when a navigation request
// failed and the cache was empty).
const CACHE_NAME = 'vo-hub-v3'
const CORE = ['/manifest.webmanifest', '/icon-192.svg', '/icon-512.svg']

// Tiny offline shell: a real HTML Response so respondWith() never
// returns undefined on a failed navigation. Auto-reloads when the
// network comes back so the user doesn't have to do it manually.
const OFFLINE_SHELL = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>VO Hub — Offline</title>
<style>body{font-family:system-ui,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0f1419;color:#f1f5f9;text-align:center;padding:24px}
.card{max-width:380px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#94a3b8;margin:0 0 16px}
button{background:#f97316;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer}</style>
</head><body><div class="card"><h1>VO Hub is offline</h1>
<p>Your browser couldn't reach the server. We'll reconnect automatically when the network is back.</p>
<button onclick="location.reload()">Retry now</button></div>
<script>
addEventListener('online', () => location.reload());
setTimeout(() => fetch('/').then((r) => { if (r.ok) location.reload() }).catch(() => {}), 3000);
</script></body></html>`

const offlineResponse = () =>
  new Response(OFFLINE_SHELL, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).catch(() => null)
  )
  self.skipWaiting()
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ── Web push ────────────────────────────────────────────────
// Payload is JSON: { title, body, url, tag }. Falls back to sane
// defaults if a push arrives without a body (e.g. a keep-alive).
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (_e) { data = {} }
  const title = data.title || 'VO Hub'
  const options = {
    body: data.body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: data.tag || 'vo-hub',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) { client.navigate(url); return client.focus() }
      }
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Cross-origin (Supabase / Resend / etc.) — let the browser handle it.
  if (url.origin !== location.origin) return

  // Hashed Vite chunks — always fresh from network, no caching.
  if (url.pathname.startsWith('/assets/')) return

  // API routes — never cache.
  if (url.pathname.startsWith('/api/')) return

  // Navigation requests: network first, fall back to cached / on offline,
  // and as a last resort the offline shell. We MUST always resolve to a
  // Response so the browser never gets "Failed to convert value to
  // 'Response'" (which manifests as a frozen white page).
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req)
      } catch {
        const cached = await caches.match(req)
        if (cached) return cached
        const root = await caches.match('/')
        if (root) return root
        return offlineResponse()
      }
    })())
    return
  }

  // Static assets (icons, favicon, manifest): stale-while-revalidate,
  // with a guaranteed Response on every path.
  event.respondWith((async () => {
    const cached = await caches.match(req)
    if (cached) {
      // Refresh in the background, ignore failures.
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(req, clone))
        }
      }).catch(() => {})
      return cached
    }
    try {
      const res = await fetch(req)
      if (res && res.status === 200) {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((c) => c.put(req, clone))
      }
      return res
    } catch {
      // Asset not in cache and the network is down. Return a 504
      // instead of leaving the promise unresolved.
      return new Response('Offline', { status: 504, statusText: 'Offline' })
    }
  })())
})
