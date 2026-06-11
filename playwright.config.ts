import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for VO Hub end-to-end smoke tests.
 *
 * Two important constraints shape this config:
 *   1. Login uses Microsoft SSO — we can't drive an interactive OAuth
 *      flow from a CI runner. So the e2e suite stays focused on the
 *      public surface (unauthenticated routes + redirects) until we
 *      either (a) wire a Supabase test-user with email/password creds
 *      that bypasses SSO or (b) stub the auth state with a Playwright
 *      fixture that pre-fills localStorage.
 *   2. The CI build runs against ci-dummy.supabase.co so all data
 *      fetches throw network errors — tests stay on routes whose
 *      first paint doesn't depend on a Supabase round-trip.
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
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
