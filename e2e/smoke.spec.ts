import { test, expect } from '@playwright/test'

/**
 * Public-surface smoke tests — these run against the production
 * Vite build with a CI-dummy Supabase URL, so any test that depends
 * on real data will fail with a network error. We stay on the
 * unauthenticated routes + redirect behaviour:
 *
 *   * the login page renders and the SSO CTA is reachable;
 *   * protected admin and user routes redirect to /login when no
 *     session is present;
 *   * 404 path renders the not-found page rather than blowing up;
 *   * the manifest + service worker are served (PWA basics).
 *
 * When we later wire a Supabase test user, add an authenticated
 * project in playwright.config.ts and put scenario tests in their
 * own *.auth.spec.ts files.
 */

test.describe('public surface', () => {
  test('login page renders and exposes the Microsoft SSO CTA', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login$/)
    // The login page is the only public entry point; assert something
    // distinctive enough that a blank-page regression would fail loud.
    await expect(page.locator('body')).toContainText(/sign in/i)
  })

  test('protected user route redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test('protected admin route redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test('unknown route falls through to the SPA shell (not a 500)', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist')
    // Vercel rewrites every unknown path back to index.html, so the
    // shell loads and the React router decides what to render.
    expect(response?.status()).toBeLessThan(500)
  })

  test('PWA manifest is served', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.name).toMatch(/VO Hub/i)
  })
})
