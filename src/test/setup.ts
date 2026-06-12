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
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    get length() { return store.size },
  }
}

// matchMedia stub for components reacting to viewport
if (!globalThis.matchMedia) {
  ;(globalThis as any).matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// crypto.randomUUID polyfill (some test envs miss it)
if (!globalThis.crypto?.randomUUID) {
  ;(globalThis as any).crypto = globalThis.crypto || {}
  ;(globalThis as any).crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
}

export { vi }
