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
      // HTML blocks (tables, divs) — wrap with spacing only
      if (/<table[\s>]|<div[\s>]|<tr[\s>]/i.test(trimmed)) {
        return `<div style="margin:20px 0;">${trimmed}</div>`
      }
      // Regular text → convert single newlines to <br>
      const html = trimmed.replace(/\n/g, '<br>')
      return `<p style="margin:0 0 16px 0;line-height:1.7;color:#334155;">${html}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Styled inline HTML for date values
 */
export function styledDate(value) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);color:#ea580c;font-weight:600;font-size:13px;">&#128197; ${escapeHtml(value)}</span>`
}

/**
 * Styled inline HTML for condition values
 */
export function styledCondition(value) {
  const isGood = /good|no damage|bon/i.test(value)
  const color = isGood ? '#16a34a' : '#ca8a04'
  const bg = isGood ? 'rgba(22,163,74,0.08)' : 'rgba(202,138,4,0.08)'
  const border = isGood ? 'rgba(22,163,74,0.2)' : 'rgba(202,138,4,0.2)'
  const icon = isGood ? '&#10003;' : '&#9888;'
  return `<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:${bg};border:1px solid ${border};color:${color};font-weight:600;font-size:13px;">${icon} ${escapeHtml(value)}</span>`
}

/**
 * Generate a styled info card with key details (table-based for email compat)
 */
export function generateDetailsCard(vars) {
  let html = ''

  // Project name in its own prominent section
  if (vars.project_name) {
    html += `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fafc;border-radius:8px 8px 0 0;border:1px solid #e2e8f0;border-bottom:none;margin:20px 0 0 0;">
      <tr>
        <td style="padding:14px 16px;">
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Project</div>
          <div style="font-weight:700;color:#0f172a;font-size:16px;">${escapeHtml(vars.project_name)}</div>
        </td>
      </tr>
    </table>`
  }

  // Date cells row
  const cells = []
  if (vars.pickup_date) {
    cells.push({ label: 'Pickup', value: escapeHtml(vars.pickup_date), color: '#ea580c' })
  }
  if (vars.return_date_new && vars.return_date) {
    // Extension: show old date struck through + new date highlighted
    cells.push({
      label: 'New Return Date',
      value: `<span style="text-decoration:line-through;color:#94a3b8;font-weight:400;">${escapeHtml(vars.return_date)}</span> <span style="color:#16a34a;font-weight:700;">&rarr; ${escapeHtml(vars.return_date_new)}</span>`,
      color: '#16a34a',
      rawHtml: true,
    })
  } else if (vars.return_date) {
    cells.push({ label: 'Return', value: escapeHtml(vars.return_date), color: '#ea580c' })
  }

  if (cells.length > 0) {
    const tds = cells
      .map(
        (c) => `<td style="padding:12px 16px;vertical-align:top;">
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${c.label}</div>
          <div style="font-weight:600;color:${c.color};font-size:14px;">${c.rawHtml ? c.value : c.value}</div>
        </td>`
      )
      .join('')

    const topRadius = vars.project_name ? '0' : '8px'
    html += `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fafc;border-radius:${topRadius} ${topRadius} 8px 8px;border:1px solid #e2e8f0;margin:${vars.project_name ? '0' : '20px'} 0 20px 0;">
      <tr>${tds}</tr>
    </table>`
  }

  return html
}

/**
 * Transform standard variable values into styled HTML versions
 */
export function generateStyledVars(vars) {
  const styled = { ...vars }
  if (vars.pickup_date) styled.pickup_date = styledDate(vars.pickup_date)
  if (vars.return_date) styled.return_date = styledDate(vars.return_date)
  if (vars.condition) styled.condition = styledCondition(vars.condition)
  if (vars.user_name) styled.user_name = `<strong style="color:#0f172a;">${escapeHtml(vars.user_name)}</strong>`
  if (vars.project_name) styled.project_name = `<strong style="color:#0f172a;">&ldquo;${escapeHtml(vars.project_name)}&rdquo;</strong>`
  // Styled item list from _items array (set by caller)
  if (vars._items) styled.item_list = styledItemList(vars._items)
  // details_card is built from raw vars
  styled.details_card = generateDetailsCard(vars)
  return styled
}

/**
 * Generate styled inline product badges (same badge style as dates)
 * Used for {{item_list}} in HTML mode — compact, inline layout
 */
export function styledItemList(items) {
  if (!items || items.length === 0) return ''
  const badges = items.map((item) => {
    const qty = item.quantity > 1 ? ` &times;${item.quantity}` : ''
    const includes = (item.product_includes || [])
      .map((inc) => `<span style="color:#64748b;font-weight:400;"> + ${escapeHtml(inc)}</span>`)
      .join('')
    return `<span style="display:inline-block;padding:6px 14px;border-radius:6px;background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.18);color:#1e293b;font-weight:600;font-size:13px;margin:3px 4px 3px 0;">&#128230; ${escapeHtml(item.product_name || item.name || '')}${qty}${includes}</span>`
  })
  return badges.join('')
}

/**
 * Generate an inline-styled HTML table for email items
 */
export function generateItemsHtml(items, itemReturns = []) {
  const rows = items.map((item) => {
    const ret = itemReturns.find((r) => r.id === item.id)
    const condition = ret?.return_condition
    const conditionColors = {
      good: '#16a34a',
      minor: '#ca8a04',
      damaged: '#ea580c',
      lost: '#dc2626',
    }

    const includesBadges = (item.product_includes || [])
      .map(
        (inc) =>
          `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;font-size:11px;margin-right:4px;margin-top:2px;">${escapeHtml(inc)}</span>`
      )
      .join('')

    const conditionBadge = condition
      ? `<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:${conditionColors[condition] || '#6b7280'}12;border:1px solid ${conditionColors[condition] || '#6b7280'}30;color:${conditionColors[condition] || '#6b7280'};font-size:11px;font-weight:600;">${condition.charAt(0).toUpperCase() + condition.slice(1)}</span>`
      : ''

    const returnedBadge =
      ret && ret.is_returned === false
        ? '<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.2);color:#dc2626;font-size:11px;font-weight:600;">NOT returned</span>'
        : ''

    const notes = ret?.return_notes
      ? `<div style="font-size:12px;color:#64748b;margin-top:4px;font-style:italic;">${escapeHtml(ret.return_notes)}</div>`
      : ''

    const imgCell = item.product_image
      ? `<img src="${escapeHtml(item.product_image)}" alt="" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;border:1px solid #e2e8f0;" />`
      : `<div style="width:56px;height:56px;border-radius:8px;background:#f1f5f9;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:20px;color:#94a3b8;">&#128230;</div>`

    return `<tr>
      <td style="padding:12px;border-bottom:1px solid #f1f5f9;" width="72">
        ${imgCell}
      </td>
      <td style="padding:12px;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:600;color:#0f172a;font-size:14px;">${escapeHtml(item.product_name)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">Qty: <strong style="color:#334155;">${item.quantity}</strong></div>
        ${includesBadges ? `<div style="margin-top:6px;">${includesBadges}</div>` : ''}
        ${notes}
      </td>
      <td style="padding:12px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">
        ${conditionBadge}
        ${returnedBadge}
      </td>
    </tr>`
  })

  return `<div style="margin:20px 0;">
  <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px;padding-left:12px;">&#128230; Equipment Details</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
    <tbody>
      ${rows.join('\n')}
    </tbody>
  </table>
</div>`
}

/**
 * Wrap email body in a full HTML document with light theme
 */
export function wrapEmailHtml(body, { appName = 'VO Gear Hub', logoUrl = '', tagline = '', logoHeight = 0 } = {}) {
  // Convert plain text newlines to HTML structure
  const htmlBody = formatTextToHtml(body)

  const h = logoHeight || 17
  const resolvedTagline = tagline || 'Equipment Lending Platform'

  const logoCell = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(appName)}" height="${h}" style="border-radius:0px;object-fit:contain;display:block;width:auto;" />`
    : `<div style="height:${h}px;border-radius:0px;background:linear-gradient(135deg,#f97316,#06b6d4);display:inline-block;text-align:center;line-height:${h}px;font-size:18px;padding:0 8px;">&#9881;</div>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 4px 24px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,rgba(249,115,22,0.04),rgba(6,182,212,0.04));border-bottom:1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    ${logoCell}
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:22px;font-weight:700;color:#f97316;letter-spacing:-0.3px;">${escapeHtml(appName)}</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:1px;">${escapeHtml(resolvedTagline)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#334155;font-size:14px;line-height:1.7;">
              ${htmlBody}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <div style="font-size:11px;color:#94a3b8;">Sent from <span style="color:#64748b;font-weight:500;">${escapeHtml(appName)}</span></div>
                    <div style="font-size:10px;color:#cbd5e1;margin-top:4px;">Equipment Lending Management System</div>
                  </td>
                </tr>
              </table>
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
  // For HTML templates, use styled variable versions
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
