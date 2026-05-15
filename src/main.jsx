import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import App from './App'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/dm-sans'
import './styles/globals.css'

// Auto-recover from stale code-split chunks after a deploy.
// When Vercel re-hashes the chunk filenames, browsers still holding the
// old index.html try to lazy-import the now-404 chunk and Vite throws
// "Failed to fetch dynamically imported module". A single forced reload
// pulls the latest index.html + chunks.
const CHUNK_RELOAD_FLAG = 'vo-hub-chunk-reload'
function isStaleChunkError(message) {
  if (!message) return false
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(message)
}
function recoverFromStaleChunk(message) {
  if (!isStaleChunkError(message)) return
  if (sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return // already retried once
  sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1')
  window.location.reload()
}
window.addEventListener('error', (e) => recoverFromStaleChunk(e?.message || e?.error?.message))
window.addEventListener('unhandledrejection', (e) => recoverFromStaleChunk(e?.reason?.message || String(e?.reason || '')))
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_FLAG), 5000))

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
