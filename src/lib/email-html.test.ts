import { describe, it, expect } from 'vitest'
import {
  escapeHtml, escapeAttr, formatTextToHtml,
  renderEmailTemplate, wrapEmailHtml, generateItemsHtml,
} from './email-html'

describe('escapeHtml', () => {
  it('escapes the five XSS-relevant chars', () => {
    expect(escapeHtml('<script>alert("x")</script>'))
      .toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('escapes & first so subsequent escapes are not double-encoded', () => {
    // If & were escaped after < it would produce &amp;lt; instead of &lt;
    expect(escapeHtml('A & B < C')).toBe('A &amp; B &lt; C')
  })

  it('coerces non-string inputs without throwing', () => {
    expect(escapeHtml(null)).toBe('null')
    expect(escapeHtml(undefined)).toBe('undefined')
    expect(escapeHtml(42)).toBe('42')
  })

  it('escapeAttr is consistent with escapeHtml', () => {
    expect(escapeAttr('"><img>')).toBe(escapeHtml('"><img>'))
  })
})

describe('formatTextToHtml', () => {
  it('splits double newlines into <p> blocks', () => {
    const out = formatTextToHtml('First paragraph.\n\nSecond paragraph.')
    expect(out).toMatch(/<p[^>]*>First paragraph\.<\/p>/)
    expect(out).toMatch(/<p[^>]*>Second paragraph\.<\/p>/)
  })

  it('turns single newlines inside a block into <br>', () => {
    const out = formatTextToHtml('Line 1\nLine 2')
    expect(out).toMatch(/Line 1<br>Line 2/)
  })

  it('passes <table> / <div> blocks through wrapped in a margin <div>, not <p>', () => {
    const out = formatTextToHtml('<table><tr><td>cell</td></tr></table>')
    expect(out).toMatch(/<div style="margin:24px 0;"><table>/)
    expect(out).not.toMatch(/<p[^>]*><table>/)
  })

  it('converts **bold** to <strong>', () => {
    const out = formatTextToHtml('Hello **world**')
    expect(out).toMatch(/<strong[^>]*>world<\/strong>/)
  })

  it('drops empty blocks from the output', () => {
    const out = formatTextToHtml('Hello.\n\n\n\nWorld.')
    // The middle empty block should not appear as an empty <p>.
    expect(out).not.toMatch(/<p[^>]*><\/p>/)
  })
})

describe('renderEmailTemplate', () => {
  it('substitutes {{var}} in both subject and body', () => {
    const { subject, body } = renderEmailTemplate(
      { subject: 'Hello {{name}}', body: 'Hi {{name}}', format: 'text' },
      { name: 'Nadir' },
    )
    expect(subject).toBe('Hello Nadir')
    expect(body).toBe('Hi Nadir')
  })

  it('leaves a [missing] placeholder when a variable has no value', () => {
    const { subject, body } = renderEmailTemplate(
      { subject: '{{absent}}', body: '{{absent}}', format: 'text' },
      {},
    )
    expect(subject).toBe('[absent]')
    expect(body).toBe('[absent]')
  })

  it('wraps html templates in the full styled shell, text templates stay raw', () => {
    const html = renderEmailTemplate(
      { subject: 's', body: '<p>raw</p>', format: 'html' },
      {},
      { appName: 'VO Hub' },
    )
    expect(html.body).toMatch(/<html/i)
    expect(html.body).toMatch(/<p>raw<\/p>/)

    const text = renderEmailTemplate(
      { subject: 's', body: 'plain', format: 'text' },
      {},
    )
    expect(text.body).toBe('plain')
  })
})

describe('wrapEmailHtml', () => {
  it('wraps a body fragment in a full html shell', () => {
    const out = wrapEmailHtml('<p>Hi</p>', { appName: 'VO Hub' })
    expect(out).toMatch(/^<!DOCTYPE html>/i)
    expect(out).toMatch(/<p>Hi<\/p>/)
  })

  it('echoes the appName so it ends up in the rendered header', () => {
    const out = wrapEmailHtml('hello', { appName: 'My App' })
    expect(out).toContain('My App')
  })
})

describe('generateItemsHtml', () => {
  it('renders one row per item with the quantity', () => {
    const out = generateItemsHtml([
      { product_name: 'iPad Air', quantity: 2 },
      { product_name: 'Routeur 4G', quantity: 1 },
    ])
    expect(out).toContain('iPad Air')
    expect(out).toContain('Routeur 4G')
    expect(out).toMatch(/2/) // qty 2 surfaces somewhere
  })

  it('surfaces a "NOT returned" badge for outstanding items', () => {
    const out = generateItemsHtml(
      [{ id: 'i1', product_name: 'iPad Air', quantity: 1 }],
      [{ id: 'i1', is_returned: false }],
    )
    expect(out).toContain('NOT returned')
  })

  it('renders a return condition badge when the return has one', () => {
    const out = generateItemsHtml(
      [{ id: 'i1', product_name: 'iPad Air', quantity: 1 }],
      [{ id: 'i1', return_condition: 'damaged' }],
    )
    expect(out).toMatch(/Damaged/)
  })

  it('escapes user-supplied product names to prevent HTML injection', () => {
    const out = generateItemsHtml([
      { product_name: '<img src=x onerror=alert(1)>', quantity: 1 },
    ])
    expect(out).not.toContain('<img src=x')
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
