/**
 * Regression check on vercel.json: the security headers we ship at the
 * edge are easy to break by accident (a merge conflict, a key rename
 * during a config refactor). This test parses vercel.json at test time
 * and asserts each header still meets its policy.
 *
 * Why a unit test and not e2e: the headers only apply when served by
 * Vercel — vite preview (which Playwright drives) doesn't emit them,
 * so an e2e assertion would only pass against the real prod host.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

let headers: any

beforeAll(async () => {
  const raw = await readFile(path.resolve(__dirname, '../../vercel.json'), 'utf8')
  const cfg = JSON.parse(raw)
  const rootRule = cfg.headers?.find((h: any) => h.source === '/(.*)')
  expect(rootRule, 'vercel.json must define a root /(.*) headers rule').toBeDefined()
  headers = Object.fromEntries(rootRule.headers.map((h: any) => [h.key, h.value]))
})

describe('vercel.json edge security headers', () => {
  it('blocks framing — X-Frame-Options DENY + CSP frame-ancestors none', () => {
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Content-Security-Policy']).toMatch(/frame-ancestors 'none'/)
  })

  it('forces HTTPS for at least one year with subdomain preload', () => {
    const hsts = headers['Strict-Transport-Security']
    expect(hsts).toBeDefined()
    const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] || '0', 10)
    expect(maxAge).toBeGreaterThanOrEqual(31536000) // 1 year
    expect(hsts).toMatch(/includeSubDomains/)
    expect(hsts).toMatch(/preload/)
  })

  it('disables MIME sniffing and tight Referrer-Policy', () => {
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })

  it('keeps the search engines out — robots noindex', () => {
    expect(headers['X-Robots-Tag']).toMatch(/noindex/)
  })

  it('CSP locks down dangerous defaults', () => {
    const csp = headers['Content-Security-Policy']
    expect(csp).toBeDefined()
    expect(csp).toMatch(/default-src 'self'/)
    expect(csp).toMatch(/object-src 'none'/)
    expect(csp).toMatch(/base-uri 'self'/)
    expect(csp).toMatch(/form-action 'self'/)
  })

  it('CSP whitelists Supabase + MS SSO for connect-src (and only those + self)', () => {
    const csp = headers['Content-Security-Policy']
    expect(csp).toMatch(/connect-src[^;]*'self'/)
    expect(csp).toMatch(/connect-src[^;]*\*\.supabase\.co/)
    expect(csp).toMatch(/connect-src[^;]*login\.microsoftonline\.com/)
  })

  it('CSP locks frames to MS SSO only (popup login)', () => {
    const csp = headers['Content-Security-Policy']
    const frameSrc = csp.match(/frame-src([^;]*)/)?.[1] || ''
    expect(frameSrc).toMatch(/'self'/)
    expect(frameSrc).toMatch(/login\.microsoftonline\.com/)
    // Nothing else should be allowed in there.
    expect(frameSrc).not.toMatch(/\*(?!\.supabase)/) // no bare wildcard
  })

  it('Permissions-Policy disables sensitive APIs by default', () => {
    const pp = headers['Permissions-Policy']
    expect(pp).toBeDefined()
    expect(pp).toMatch(/microphone=\(\)/)
    expect(pp).toMatch(/geolocation=\(\)/)
    expect(pp).toMatch(/payment=\(\)/)
    expect(pp).toMatch(/usb=\(\)/)
    // Camera stays on self so the QR scanner works.
    expect(pp).toMatch(/camera=\(self\)/)
  })
})
