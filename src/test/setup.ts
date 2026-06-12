// @ts-nocheck — Phase-3 migration in progress; this file will be properly typed in a follow-up pass.
// Vitest global setup — minimal jsdom polyfills the app expects
import { vi } from 'vitest'

// Stub Supabase env so modules that statically import `@/lib/supabase`
// (eg. anything in src/lib/api or src/lib/email-html) can be loaded
// from a test file without crashing the createClient call.
if (typeof import.meta.env !== 'undefined') {
  import.meta.env.VITE_SUPABASE_URL ||= 'http://test.local'
  import.meta.env.VITE_SUPABASE_ANON_KEY ||= 'test-anon-key'
}

if (!globalThis.localStorage) {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] || null,
    get length() { return store.size },
  }
}

// matchMedia stub for components reacting to viewport
if (!globalThis.matchMedia) {
  globalThis.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

// crypto.randomUUID polyfill (some test envs miss it)
if (!globalThis.crypto?.randomUUID) {
  globalThis.crypto = globalThis.crypto || {}
  globalThis.crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
}

export { vi }
