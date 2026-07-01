import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import App from './App'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/dm-sans'
import './styles/globals.css'
import './lib/i18n' // initialises i18next (FR default, FR/EN)
import './lib/monitoring' // registers Sentry if VITE_SENTRY_DSN is set

// Auto-recover from stale code-split chunks after a deploy.
// When Vercel re-hashes the chunk filenames, browsers still holding the
// old index.html try to lazy-import the now-404 chunk and Vite throws
// "Failed to fetch dynamically imported module". A single forced reload
// pulls the latest index.html + chunks.
//
// The counter and isStaleChunkError helper are exposed on window so the
// React ErrorBoundary can share them — otherwise the same chunk error
// gets counted twice (once here, once in the boundary) and we hit the
// retry cap after a single real failure, leaving the user on a blank
// page.
const CHUNK_RELOAD_COUNTER = 'vo-hub-chunk-reload-count'
const CHUNK_RELOAD_MAX = 3
const CHUNK_RECENT_RELOAD = 'vo-hub-chunk-last-reload'
function isStaleChunkError(error) {
  const message = typeof error === 'string' ? error : (error?.message || '')
  const name = error?.name || ''
  if (name === 'ChunkLoadError') return true
  if (!message) return false
  return /Failed to (fetch|load) dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|error loading dynamically imported module|Unable to preload CSS/i.test(message)
}
function recoverFromStaleChunk(error) {
  if (!isStaleChunkError(error)) return
  // Debounce: ignore further fires while a reload was just triggered for
  // the same error burst (Suspense fires both window.error and React's
  // componentDidCatch for a single chunk failure).
  const lastAt = parseInt(sessionStorage.getItem(CHUNK_RECENT_RELOAD) || '0', 10)
  if (Date.now() - lastAt < 1500) return
  const tries = parseInt(sessionStorage.getItem(CHUNK_RELOAD_COUNTER) || '0', 10)
  if (tries >= CHUNK_RELOAD_MAX) return // give up after 3 auto-reloads
  sessionStorage.setItem(CHUNK_RELOAD_COUNTER, String(tries + 1))
  sessionStorage.setItem(CHUNK_RECENT_RELOAD, String(Date.now()))
  window.location.reload()
}
window.__voChunkRecover = recoverFromStaleChunk
window.__voIsStaleChunkError = isStaleChunkError
window.addEventListener('error', (e) => recoverFromStaleChunk(e?.error || e?.message))
window.addEventListener('unhandledrejection', (e) => recoverFromStaleChunk(e?.reason))
// Reset the counter once the new page has rendered successfully, so future
// deploys can still trigger auto-recovery from the same tab. Shortened
// to 1.5s — the user has clearly gotten past the lazy loads by then.
window.addEventListener('load', () => setTimeout(() => {
  sessionStorage.removeItem(CHUNK_RELOAD_COUNTER)
  sessionStorage.removeItem(CHUNK_RECENT_RELOAD)
}, 1500))

// Register the PWA service worker (production only — keeps the dev
// experience uncluttered by stale-cache surprises).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      // When a new SW takes over (after a deploy), reload once so the page
      // is rendered from the fresh shell + chunks instead of the cached pair.
      let reloaded = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return
        reloaded = true
        window.location.reload()
      })
      // Force the waiting SW to activate ASAP — it skipWaiting()s itself but
      // we nudge it for browsers that hold off.
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing
        if (!nw) return
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
    } catch {}
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
