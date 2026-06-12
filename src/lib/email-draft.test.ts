import { describe, it, expect } from 'vitest'
import {
  generateStatusEmailDraft,
  generateExtensionEmailDraft,
  generateReturnDraft,
} from './email-draft'

const baseRequest = {
  user_first_name: 'Nadir',
  user_last_name: 'Saâdi',
  user_email: 'nsaadi@vo-group.be',
  project_name: 'NE26 NATO Edge',
  pickup_date: '2026-01-15',
  return_date: '2026-01-22',
  project_description: 'Live demo equipment',
}

describe('generateStatusEmailDraft', () => {
  it('substitutes the request vars in subject + body', () => {
    const { subject, body, to } = generateStatusEmailDraft({
      template: {
        subject: '{{project_name}} — {{user_name}}',
        body: 'Hi {{user_name}}, your request for {{project_name}} is updated.',
        format: 'text',
      },
      request: baseRequest,
    })
    expect(to).toBe('nsaadi@vo-group.be')
    expect(subject).toBe('NE26 NATO Edge — Nadir Saâdi')
    expect(body).toContain('Nadir Saâdi')
    expect(body).toContain('NE26 NATO Edge')
  })

  it('falls back to a default subject/body when the template is missing', () => {
    const out = generateStatusEmailDraft({ template: null, request: baseRequest })
    // Both subject + body are non-empty and mention the project name.
    expect(out.subject).toContain('NE26 NATO Edge')
    expect(out.body).toContain('NE26 NATO Edge')
  })

  it('formats pickup / return dates as "dd MMM yyyy"', () => {
    const { body } = generateStatusEmailDraft({
      template: { subject: 's', body: 'Pickup {{pickup_date}} return {{return_date}}', format: 'text' },
      request: baseRequest,
    })
    expect(body).toMatch(/15 Jan 2026/)
    expect(body).toMatch(/22 Jan 2026/)
  })

  it('exposes the items list both as plain text and styled html', () => {
    const items = [
      { product_name: 'iPad Air', quantity: 2 },
      { product_name: 'Routeur 4G', quantity: 1 },
    ]
    const textOut = generateStatusEmailDraft({
      template: { subject: 's', body: '{{item_list}}', format: 'text' },
      request: baseRequest,
      items,
    })
    expect(textOut.body).toContain('iPad Air')
    expect(textOut.body).toContain('Routeur 4G')

    const htmlOut = generateStatusEmailDraft({
      template: { subject: 's', body: '{{items_html}}', format: 'html' },
      request: baseRequest,
      items,
    })
    expect(htmlOut.isHtml).toBe(true)
    // items_html resolves to the styled <table> block
    expect(htmlOut.body).toMatch(/<table/)
  })

  it('merges custom_fields into the substitution map', () => {
    const { body } = generateStatusEmailDraft({
      template: { subject: 's', body: 'Note: {{special_note}}', format: 'text' },
      request: { ...baseRequest, custom_fields: { special_note: 'fragile' } },
    })
    expect(body).toBe('Note: fragile')
  })

  it('returns to: "" when the request has no user_email', () => {
    const out = generateStatusEmailDraft({
      template: { subject: 's', body: 'x', format: 'text' },
      request: { ...baseRequest, user_email: undefined },
    })
    expect(out.to).toBe('')
  })
})

describe('generateExtensionEmailDraft', () => {
  it('combines extension + request vars in the substitution', () => {
    const extension = {
      requested_days: 7,
      granted_days: 7,
      admin_notes: 'Approved — event postponed',
      status: 'approved',
      return_date: '2026-01-22',
    }
    const { subject, body } = generateExtensionEmailDraft({
      template: {
        subject: 'Extension {{status}} for {{project_name}}',
        body: 'Granted {{granted_days}} days. New return: {{new_return_date}}. {{admin_comment}}',
        format: 'text',
      },
      extension,
      request: baseRequest,
    })
    expect(subject).toContain('NE26 NATO Edge')
    expect(body).toContain('Granted 7 days')
    // 22 Jan + 7 days = 29 Jan 2026
    expect(body).toContain('29 Jan 2026')
    expect(body).toContain('Approved — event postponed')
  })

  it('shows a [new_return_date] placeholder when the extension is not yet approved', () => {
    // The new return date is only computed once the extension is
    // approved + has granted_days. Until then the substitution
    // surface treats it as missing and renders the [key] sentinel.
    const { body } = generateExtensionEmailDraft({
      template: { subject: 's', body: 'New: {{new_return_date}}', format: 'text' },
      extension: { requested_days: 7, granted_days: 7, return_date: '2026-01-22', status: 'pending' },
      request: baseRequest,
    })
    expect(body).toBe('New: [new_return_date]')
  })
})

describe('generateReturnDraft', () => {
  it('does not crash on a return without itemReturns', () => {
    const out = generateReturnDraft({
      template: { subject: 'Return for {{project_name}}', body: 'Done.', format: 'text' },
      request: baseRequest,
      items: [{ product_name: 'iPad Air', quantity: 1 }],
      itemReturns: [],
      recipients: [],
    })
    expect(out.subject).toContain('NE26 NATO Edge')
    expect(out.body).toBeTruthy()
  })
})
