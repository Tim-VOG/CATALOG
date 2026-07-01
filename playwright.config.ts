import { defineConfig, devices } from '@playwright/test'
import { STORAGE_STATE_PATH } from './e2e/global-setup'

/**
 * Playwright config for VO Hub end-to-end tests.
 *
 * Two projects:
 *   1. `public` runs the original smoke specs (no auth required).
 *   2. `admin` runs authenticated specs and consumes the
 *      storageState produced by global-setup.ts. If the auth secrets
 *      aren't present in the env, global-setup writes an empty
 *      state and the auth specs skip themselves at runtime.
 *
 * The CI build needs the real VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * so the bundle can actually call Supabase. Those are wired in
 * .github/workflows/ci.yml from repo secrets.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Spin the production preview server before running tests so we
  // exercise the same bundle Vercel ships, not the dev server.
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'public',
      testMatch: /smoke\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin',
      testMatch: /admin\..*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_PATH,
      },
    },
  ],
})
