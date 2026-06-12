/**
 * Playwright global setup — sign the test user in once before the
 * suite runs and persist the resulting Supabase session to disk.
 *
 * Why a global setup and not per-test:
 *   * one login call instead of N (the e2e suite ships read-only
 *     navigation tests so a single session is plenty);
 *   * the saved storageState file is consumed by playwright.config
 *     and applied to every spec — tests start already authenticated.
 *
 * If PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD aren't set
 * (eg. running locally without secrets) we still write a file so the
 * config doesn't error out, but it stays empty and the auth-only
 * specs are skipped at runtime via `test.skip(!process.env.…)`.
 */
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const STORAGE_STATE_PATH = resolve('./e2e/.auth/admin.json')

const EMPTY_STATE = { cookies: [], origins: [] }

export default async function globalSetup() {
  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  const email = process.env.PLAYWRIGHT_TEST_EMAIL
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD

  mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true })

  if (!url || !anon || !email || !password) {
    // Write an empty state and let auth specs skip themselves.
    writeFileSync(STORAGE_STATE_PATH, JSON.stringify(EMPTY_STATE, null, 2))
    console.log('[e2e] auth secrets missing — wrote empty storageState; auth specs will skip')
    return
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data?.session) {
    throw new Error(`[e2e] signInWithPassword failed: ${error?.message || 'no session'}`)
  }

  // Reverse-engineer the localStorage key Supabase v2 uses in the
  // browser. The key is `sb-<project-ref>-auth-token` and the value
  // is the serialised session object.
  const projectRef = url.replace(/^https?:\/\//, '').split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`
  const origin = new URL('http://127.0.0.1:4173').origin

  const state = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: storageKey, value: JSON.stringify(data.session) },
          // RequireAdmin gate — accept the PIN as already verified for
          // the next 4 h (matching its expiry constant). Without this
          // every admin route gets intercepted by the unlock form.
          {
            name: 'vo-admin-pin-verified',
            value: JSON.stringify({ timestamp: Date.now() }),
          },
        ],
      },
    ],
  }

  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(state, null, 2))
  console.log(`[e2e] storageState written for ${email}`)
}
