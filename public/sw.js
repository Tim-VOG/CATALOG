// VO Hub service worker — bumps with every deploy to bust stale caches.
const CACHE_NAME = 'vo-hub-v1'
const CORE = ['/', '/manifest.webmanifest', '/icon-192.svg', '/icon-512.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).catch(() => null)
  )
  self.skipWaiting()
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

  // Never cache Supabase / API / hashed Vite chunks — fresh always
  if (url.origin !== location.origin) return
  if (url.pathname.startsWith('/assets/')) return
  if (url.pathname.startsWith('/api/')) return

  // Stale-while-revalidate for shell pages
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
