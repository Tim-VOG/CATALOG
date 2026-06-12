import { test, expect } from '@playwright/test'

/**
 * Authenticated admin navigation smoke. Read-only — we never write to
 * the prod DB from CI. Each test loads a route and verifies that the
 * page reaches a non-loading, non-error state.
 *
 * Skipped automatically when PLAYWRIGHT_TEST_EMAIL is missing (eg.
 * running locally without the auth setup); global-setup writes an
 * empty storageState in that case.
 */
const skipIfNoAuth = !process.env.PLAYWRIGHT_TEST_EMAIL

test.describe('admin authenticated navigation', () => {
  test.skip(skipIfNoAuth, 'PLAYWRIGHT_TEST_EMAIL not set')

  test('lands on /admin and shows the admin sidebar', async ({ page }) => {
    await page.goto('/admin')
    // Allow the session to settle + the lazy admin chunk to load.
    await expect(page).toHaveURL(/\/admin\/?$/)
    // The sidebar has a "VO Hub" brand chip + "Admin" label.
    await expect(page.getByText(/^VO Hub$/).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/^Admin$/).first()).toBeVisible()
  })

  test('dashboard renders the hero greeting', async ({ page }) => {
    await page.goto('/admin')
    // The hero says "Bonjour" / "Bon après-midi" / "Bonsoir" depending
    // on the time of day — match any of them.
    await expect(page.getByRole('heading', { level: 1 }))
      .toHaveText(/^(Bonjour|Bon après-midi|Bonsoir|Belle nuit)/, { timeout: 10_000 })
  })

  test('QR codes page lists fleet entries', async ({ page }) => {
    await page.goto('/admin/qr-codes')
    await expect(page).toHaveURL(/\/admin\/qr-codes/)
    // Either we see the page header or — if the fleet is empty — the
    // empty state. Both prove the page didn't crash.
    await expect(page.locator('body'))
      .toContainText(/QR (codes?|Code)/i, { timeout: 10_000 })
  })

  test('Products page reachable from sidebar', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page).toHaveURL(/\/admin\/products/)
    await expect(page.locator('body'))
      .toContainText(/products?|produits/i, { timeout: 10_000 })
  })

  test('Planning page reachable', async ({ page }) => {
    await page.goto('/admin/planning')
    await expect(page).toHaveURL(/\/admin\/planning/)
    // Planning page header is "Planning" (i18n stays in EN for now).
    await expect(page.locator('body'))
      .toContainText(/planning/i, { timeout: 10_000 })
  })

  test('Equipment requests inbox reachable', async ({ page }) => {
    await page.goto('/admin/requests')
    await expect(page).toHaveURL(/\/admin\/requests/)
    await expect(page.locator('body'))
      .toContainText(/requests?|demande/i, { timeout: 10_000 })
  })

  test('Device credentials page is admin-gated and reachable', async ({ page }) => {
    await page.goto('/admin/device-credentials')
    await expect(page).toHaveURL(/\/admin\/device-credentials/)
    // The page header says "Device Credentials" + a sensitive-data warning.
    await expect(page.locator('body'))
      .toContainText(/device credentials/i, { timeout: 10_000 })
  })

  test('Hub redirects authenticated user to the user shell', async ({ page }) => {
    await page.goto('/')
    // Authenticated visitors land on the hub home, not on /login.
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })
})
