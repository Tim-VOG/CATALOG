/**
 * Convert plain text with newlines into styled HTML paragraphs.
 * Preserves HTML blocks (tables, divs) as-is.
 */
export function formatTextToHtml(text) {
  const blocks = text.split(/\n\n+/)
  return blocks
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/<table[\s>]|<div[\s>]|<tr[\s>]/i.test(trimmed)) {
        return `<div style="margin:24px 0;">${trimmed}</div>`
      }
      const withBold = trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#0a2540;font-weight:600;">$1</strong>')
      const html = withBold.replace(/\n/g, '<br>')
      return `<p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">${html}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Build a CTA button (black solid, rounded). Used by templates via {{cta:Label|URL}}
 * or callable directly.
 */
export function ctaButton(label, url) {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;"><tr><td align="center">
    <a href="${escapeAttr(url)}" style="display:inline-block;padding:14px 32px;border-radius:10px;background:#0a0a0a;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;letter-spacing:-0.1px;box-shadow:0 1px 2px rgba(0,0,0,0.08);">${escapeHtml(label)}</a>
  </td></tr></table>`
}

export function styledDate(value) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#fef3ec;color:#c2410c;font-weight:600;font-size:13px;">&#128197; ${escapeHtml(value)}</span>`
}

export function styledCondition(value) {
  const isGood = /good|no damage|bon/i.test(value)
  const color = isGood ? '#0a7a3b' : '#a16207'
  const bg = isGood ? '#e7f6ec' : '#fef6e0'
  const icon = isGood ? '&#10003;' : '&#9888;'
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${bg};color:${color};font-weight:600;font-size:13px;">${icon} ${escapeHtml(value)}</span>`
}

/**
 * Info card: a clean white card with sections.
 */
export function generateDetailsCard(vars) {
  const rows = []

  if (vars.project_name) {
    rows.push(`<tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">
      <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Project</div>
      <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">${escapeHtml(vars.project_name)}</div>
    </td></tr>`)
  }

  const cells = []
  if (vars.pickup_date) {
    cells.push({ label: 'Pickup', value: escapeHtml(vars.pickup_date), accent: '#ea580c' })
  }
  if (vars.return_date_new && vars.return_date) {
    cells.push({
      label: 'New Return Date',
      value: `<span style="text-decoration:line-through;color:#94a3b8;font-weight:400;">${escapeHtml(vars.return_date)}</span> <span style="color:#0a7a3b;font-weight:700;">&rarr; ${escapeHtml(vars.return_date_new)}</span>`,
      accent: '#0a7a3b',
      rawHtml: true,
    })
  } else if (vars.return_date) {
    cells.push({ label: 'Return', value: escapeHtml(vars.return_date), accent: '#ea580c' })
  }

  if (cells.length > 0) {
    const tds = cells
      .map(
        (c) => `<td style="padding:16px 22px;vertical-align:top;width:50%;">
          <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">${c.label}</div>
          <div style="font-weight:600;color:${c.accent};font-size:14px;">${c.value}</div>
        </td>`
      )
      .join('')
    rows.push(`<tr><td style="padding:0;"><table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>${tds}</tr></table></td></tr>`)
  }

  if (rows.length === 0) return ''

  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">
    ${rows.join('')}
  </table>`
}

export function generateStyledVars(vars) {
  const styled = { ...vars }
  if (vars.pickup_date) styled.pickup_date = styledDate(vars.pickup_date)
  if (vars.return_date) styled.return_date = styledDate(vars.return_date)
  if (vars.condition) styled.condition = styledCondition(vars.condition)
  if (vars.user_name) styled.user_name = `<strong style="color:#0a2540;">${escapeHtml(vars.user_name)}</strong>`
  if (vars.project_name) styled.project_name = `<strong style="color:#0a2540;">&ldquo;${escapeHtml(vars.project_name)}&rdquo;</strong>`
  if (vars._items) styled.item_list = styledItemList(vars._items)
  styled.details_card = generateDetailsCard(vars)
  return styled
}

export function styledItemList(items) {
  if (!items || items.length === 0) return ''
  const badges = items.map((item) => {
    const qty = item.quantity > 1 ? ` &times;${item.quantity}` : ''
    const includes = (item.product_includes || [])
      .map((inc) => `<span style="color:#8898aa;font-weight:400;"> + ${escapeHtml(inc)}</span>`)
      .join('')
    return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#f6f9fc;border:1px solid #e6ebf1;color:#0a2540;font-weight:600;font-size:13px;margin:3px 4px 3px 0;">&#128230; ${escapeHtml(item.product_name || item.name || '')}${qty}${includes}</span>`
  })
  return badges.join('')
}

export function generateItemsHtml(items, itemReturns = []) {
  const rows = items.map((item) => {
    const ret = itemReturns.find((r) => r.id === item.id)
    const condition = ret?.return_condition
    const conditionStyles = {
      good: { color: '#0a7a3b', bg: '#e7f6ec' },
      minor: { color: '#a16207', bg: '#fef6e0' },
      damaged: { color: '#c2410c', bg: '#fef3ec' },
      lost: { color: '#b91c1c', bg: '#fde8e8' },
    }

    const includesBadges = (item.product_includes || [])
      .map(
        (inc) =>
          `<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#f6f9fc;border:1px solid #e6ebf1;color:#525f7f;font-size:11px;margin-right:4px;margin-top:2px;">${escapeHtml(inc)}</span>`
      )
      .join('')

    const optionsBadges = Object.entries(item.options || {})
      .filter(([, v]) => v && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => {
        const display = Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? k.replace(/_/g, ' ') : String(v)
        return `<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#eef4ff;border:1px solid #d9e4ff;color:#3955cf;font-size:11px;margin-right:4px;margin-top:2px;">${escapeHtml(display)}</span>`
      })
      .join('')

    const cs = conditionStyles[condition]
    const conditionBadge = cs
      ? `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${cs.bg};color:${cs.color};font-size:11px;font-weight:600;">${condition.charAt(0).toUpperCase() + condition.slice(1)}</span>`
      : ''

    const returnedBadge =
      ret && ret.is_returned === false
        ? '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#fde8e8;color:#b91c1c;font-size:11px;font-weight:600;">NOT returned</span>'
        : ''

    const notes = ret?.return_notes
      ? `<div style="font-size:12px;color:#8898aa;margin-top:4px;font-style:italic;">${escapeHtml(ret.return_notes)}</div>`
      : ''

    const imgCell = item.product_image
      ? `<img src="${escapeAttr(item.product_image)}" alt="" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;border:1px solid #e6ebf1;" />`
      : `<div style="width:56px;height:56px;border-radius:8px;background:#f6f9fc;border:1px solid #e6ebf1;display:flex;align-items:center;justify-content:center;font-size:20px;color:#8898aa;">&#128230;</div>`

    return `<tr>
      <td style="padding:14px 16px;border-bottom:1px solid #eef2f7;" width="72">
        ${imgCell}
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #eef2f7;">
        <div style="font-weight:600;color:#0a2540;font-size:14px;">${escapeHtml(item.product_name)}</div>
        <div style="font-size:12px;color:#8898aa;margin-top:2px;">Qty: <strong style="color:#525f7f;">${item.quantity}</strong></div>
        ${includesBadges ? `<div style="margin-top:6px;">${includesBadges}</div>` : ''}
        ${optionsBadges ? `<div style="margin-top:4px;">${optionsBadges}</div>` : ''}
        ${notes}
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #eef2f7;text-align:right;white-space:nowrap;">
        ${conditionBadge}
        ${returnedBadge}
      </td>
    </tr>`
  })

  return `<div style="margin:24px 0;">
  <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:10px;padding-left:4px;">&#128230; Equipment</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">
    <tbody>
      ${rows.join('\n')}
    </tbody>
  </table>
</div>`
}

/**
 * Load brand settings (logo, app name) from the DB so every email
 * caller doesn't have to re-fetch them. Cached for 60s per page load.
 */
import { supabase } from '@/lib/supabase'
let _brandingCache = null
let _brandingCacheAt = 0
export async function getEmailBranding() {
  if (_brandingCache && Date.now() - _brandingCacheAt < 60_000) return _brandingCache
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('app_name, logo_url, tagline, email_logo_height')
      .maybeSingle()
    _brandingCache = {
      appName: data?.app_name || 'VO Hub',
      logoUrl: data?.logo_url || '',
      tagline: data?.tagline || '',
      logoHeight: data?.email_logo_height || 0,
    }
  } catch {
    _brandingCache = { appName: 'VO Hub' }
  }
  _brandingCacheAt = Date.now()
  return _brandingCache
}

/**
 * Wrap email body in a full HTML document (Stripe-inspired light theme).
 */
export function wrapEmailHtml(body, { appName = 'VO Hub', logoUrl = '', tagline = '', logoHeight = 0, raw = false } = {}) {
  // Pre-process body:
  //  1. {{cta:Label|URL}} → styled black button
  //  2. **bold** → <strong> (also in raw mode — DB templates use markdown bold
  //     inside their inline-HTML status boxes and shouldn't render as literal asterisks)
  let processedBody = (body || '')
    .replace(/\{\{cta:([^|]+?)\|((?:[^{}]|\{\{[^}]+\}\})+?)\}\}(?!\})/g, (_, label, url) => ctaButton(label.trim(), url.trim()))
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong style="color:#0a2540;font-weight:600;">$1</strong>')

  const htmlBody = raw ? processedBody : formatTextToHtml(processedBody)

  const resolvedTagline = tagline || ''

  // Hard-cap the logo so a misconfigured email_logo_height in settings
  // (or an oversized SVG) can never blow out of the header. Even if every
  // inline style is somehow stripped, the outer wrapper enforces the cap.
  const h = Math.min(Math.max(logoHeight || 32, 16), 40)
  const logoCell = logoUrl
    ? `<div style="display:block;width:160px;height:${h}px;line-height:${h}px;overflow:hidden;"><img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(appName)}" width="auto" height="${h}" style="display:block;width:auto;height:${h}px;max-height:${h}px;max-width:160px;object-fit:contain;object-position:left center;border:0;outline:none;text-decoration:none;vertical-align:middle;" /></div>`
    : `<div style="display:inline-block;padding:6px 12px;border-radius:8px;background:#0a0a0a;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:-0.2px;">${escapeHtml(appName)}</div>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(appName)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#425466;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f6f9fc;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 2px 6px rgba(10,37,64,0.06),0 12px 32px rgba(10,37,64,0.04);">
          <!-- Accent stripe -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#f97316 0%,#ec4899 50%,#06b6d4 100%);line-height:4px;font-size:0;">&nbsp;</td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;">
                    ${logoCell}
                  </td>
                  ${resolvedTagline ? `<td style="vertical-align:middle;padding-left:14px;border-left:1px solid #e6ebf1;margin-left:14px;">
                    <div style="font-size:12px;color:#8898aa;font-weight:500;padding-left:14px;">${escapeHtml(resolvedTagline)}</div>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 40px 32px 40px;color:#425466;font-size:15px;line-height:1.65;">
              ${htmlBody}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 28px 40px;background:#f6f9fc;border-top:1px solid #eef2f7;">
              <div style="font-size:12px;color:#8898aa;line-height:1.6;">
                Sent from <strong style="color:#525f7f;font-weight:600;">${escapeHtml(appName)}</strong>
              </div>
              <div style="font-size:11px;color:#aab7c4;margin-top:4px;">
                This is an automated message &mdash; please do not reply directly.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Render a template with variable substitution, optionally wrapping in HTML
 */
export function renderEmailTemplate(template, vars, { appName, logoUrl, tagline, logoHeight } = {}) {
  const resolvedVars = template.format === 'html' ? generateStyledVars(vars) : vars

  let body = template.body.replace(/\{\{(\w+)\}\}/g, (_, key) => resolvedVars[key] || `[${key}]`)
  let subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `[${key}]`)

  if (template.format === 'html') {
    body = wrapEmailHtml(body, { appName, logoUrl, tagline, logoHeight })
  }

  return { subject, body }
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeAttr(str) {
  return escapeHtml(str)
}
