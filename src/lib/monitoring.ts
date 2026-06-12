/**
 * Lightweight error monitoring shim.
 *
 * If VITE_SENTRY_DSN is set, lazy-load @sentry/react and register it.
 * Otherwise fall back to a no-op `captureException` so calling code
 * doesn't have to know whether monitoring is on.
 *
 * Why lazy: we don't pull Sentry into the bundle when it's not
 * configured (CI, dev, self-hosted).
 */

const DSN = import.meta.env.VITE_SENTRY_DSN

let sentryPromise = null
let initialized = false

async function loadSentry() {
  if (!DSN) return null
  if (sentryPromise) return sentryPromise
  // Treat @sentry/react as fully optional. The /* @vite-ignore */ comment
  // + variable specifier stops Vite/Rollup from attempting to resolve it
  // at build time, so the bundle builds whether or not the package is
  // installed. Catch branch handles the missing-package case at runtime.
  const pkg = '@sentry/react'
  sentryPromise = import(/* @vite-ignore */ pkg).then((Sentry) => {
    if (!initialized) {
      try {
        Sentry.init({
          dsn: DSN,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 0,
        })
        initialized = true
      } catch (e: any) {
        console.warn('[monitoring] Sentry.init failed', e)
      }
    }
    return Sentry
  }).catch((err) => {
    console.warn('[monitoring] @sentry/react not installed; skipping init', err)
    return null
  })
  return sentryPromise
}

export async function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!DSN) {
    console.error('[captureException]', err, context)
    return
  }
  try {
    const Sentry = await loadSentry()
    if (Sentry) Sentry.captureException(err, { extra: context || {} })
  } catch (e: any) {
    console.error('[captureException] backend failure', e, err)
  }
}

export async function setUser({ id, email }: { id?: string; email?: string } = {}) {
  if (!DSN) return
  const Sentry = await loadSentry()
  if (Sentry) Sentry.setUser(id ? { id, email } : null)
}

// Auto-capture: any uncaught error / unhandled rejection in prod
if (DSN && typeof window !== 'undefined') {
  window.addEventListener('error', (e) => captureException(e?.error || new Error(e?.message || 'window error')))
  window.addEventListener('unhandledrejection', (e) => captureException(e?.reason || new Error('unhandledrejection')))
}
