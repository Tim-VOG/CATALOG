// VO Hub service worker — bumps with every deploy to bust stale caches.
const CACHE_NAME = 'vo-hub-v2'
const CORE = ['/manifest.webmanifest', '/icon-192.svg', '/icon-512.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).catch(() => null)
  )
  self.skipWaiting()
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
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

  // Cross-origin (Supabase / Resend / etc.) — let the browser handle it
  if (url.origin !== location.origin) return

  // Hashed Vite chunks — always fresh from network
  if (url.pathname.startsWith('/assets/')) return

  // API routes — never cache
  if (url.pathname.startsWith('/api/')) return

  // Navigation requests (the user typing a URL or refreshing) MUST go to the
  // network so we never serve a stale index.html after a deploy. The deploy
  // re-hashes /assets/*.js filenames; a cached index.html still references
  // the old hashes and we'd 404 those chunks → blank page until 2nd refresh.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((c) => c || caches.match('/'))
      )
    )
    return
  }

  // Static assets (icons, favicon, manifest): stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(req, clone))
        }
        return res
      }).catch(() => cached)
      return cached || network
    })
  )
})
