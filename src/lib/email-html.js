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
      return `<p style="margin:0 0 16px 0;line-height:1.7;">${html}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Styled inline HTML for date values
 */
export function styledDate(value) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.25);color:#f97316;font-weight:600;font-size:13px;">&#128197; ${escapeHtml(value)}</span>`
}

/**
 * Styled inline HTML for request numbers
 */
export function styledRequestNumber(value) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:6px;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.25);color:#06b6d4;font-weight:700;font-size:13px;">#${escapeHtml(value)}</span>`
}

/**
 * Styled inline HTML for condition values
 */
export function styledCondition(value) {
  const isGood = /good|no damage|bon/i.test(value)
  const color = isGood ? '#22c55e' : '#eab308'
  const icon = isGood ? '&#10003;' : '&#9888;'
  return `<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:${color}18;border:1px solid ${color}40;color:${color};font-weight:600;font-size:13px;">${icon} ${escapeHtml(value)}</span>`
}

/**
 * Styled inline HTML for location values
 */
export function styledLocation(value) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:6px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.25);color:#a78bfa;font-weight:600;font-size:13px;">&#128205; ${escapeHtml(value)}</span>`
}

/**
 * Generate a styled info card with key details (table-based for email compat)
 */
export function generateDetailsCard(vars) {
  let html = ''

  // Project name in its own prominent section
  if (vars.project_name) {
    html += `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:rgba(15,20,25,0.5);border-radius:8px 8px 0 0;border:1px solid #1e293b;border-bottom:none;margin:20px 0 0 0;">
      <tr>
        <td style="padding:14px 16px;">
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Project</div>
          <div style="font-weight:700;color:#f1f5f9;font-size:16px;">${escapeHtml(vars.project_name)}</div>
        </td>
      </tr>
    </table>`
  }

  // Date & location cells row
  const cells = []
  if (vars.pickup_date) {
    cells.push({ label: 'Pickup', value: escapeHtml(vars.pickup_date), color: '#f97316' })
  }
  if (vars.return_date_new && vars.return_date) {
    // Extension: show old date struck through + new date highlighted
    cells.push({
      label: 'New Return Date',
      value: `<span style="text-decoration:line-through;color:#64748b;font-weight:400;">${escapeHtml(vars.return_date)}</span> <span style="color:#22c55e;font-weight:700;">&rarr; ${escapeHtml(vars.return_date_new)}</span>`,
      color: '#22c55e',
      rawHtml: true,
    })
  } else if (vars.return_date) {
    cells.push({ label: 'Return', value: escapeHtml(vars.return_date), color: '#f97316' })
  }
  if (vars.location) {
    cells.push({ label: 'Location', value: escapeHtml(vars.location), color: '#a78bfa' })
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
    html += `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:rgba(15,20,25,0.5);border-radius:${topRadius} ${topRadius} 8px 8px;border:1px solid #1e293b;margin:${vars.project_name ? '0' : '20px'} 0 20px 0;">
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
  if (vars.request_number) styled.request_number = styledRequestNumber(vars.request_number)
  if (vars.condition) styled.condition = styledCondition(vars.condition)
  if (vars.location) styled.location = styledLocation(vars.location)
  if (vars.user_name) styled.user_name = `<strong style="color:#f1f5f9;">${escapeHtml(vars.user_name)}</strong>`
  if (vars.project_name) styled.project_name = `<strong style="color:#f1f5f9;">&ldquo;${escapeHtml(vars.project_name)}&rdquo;</strong>`
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
      .map((inc) => `<span style="color:#94a3b8;font-weight:400;"> + ${escapeHtml(inc)}</span>`)
      .join('')
    return `<span style="display:inline-block;padding:6px 14px;border-radius:6px;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);color:#f1f5f9;font-weight:600;font-size:13px;margin:3px 4px 3px 0;">&#128230; ${escapeHtml(item.product_name || item.name || '')}${qty}${includes}</span>`
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
      good: '#22c55e',
      minor: '#eab308',
      damaged: '#f97316',
      lost: '#ef4444',
    }

    const includesBadges = (item.product_includes || [])
      .map(
        (inc) =>
          `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#1e293b;color:#94a3b8;font-size:11px;margin-right:4px;margin-top:2px;">${escapeHtml(inc)}</span>`
      )
      .join('')

    const conditionBadge = condition
      ? `<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:${conditionColors[condition] || '#6b7280'}22;color:${conditionColors[condition] || '#6b7280'};font-size:11px;font-weight:600;">${condition.charAt(0).toUpperCase() + condition.slice(1)}</span>`
      : ''

    const returnedBadge =
      ret && ret.is_returned === false
        ? '<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:#ef444422;color:#ef4444;font-size:11px;font-weight:600;">NOT returned</span>'
        : ''

    const notes = ret?.return_notes
      ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;font-style:italic;">${escapeHtml(ret.return_notes)}</div>`
      : ''

    const imgCell = item.product_image
      ? `<img src="${escapeHtml(item.product_image)}" alt="" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;" />`
      : `<div style="width:56px;height:56px;border-radius:8px;background:#1e293b;display:flex;align-items:center;justify-content:center;font-size:20px;color:#475569;">&#128230;</div>`

    return `<tr>
      <td style="padding:12px;border-bottom:1px solid #1e293b;" width="72">
        ${imgCell}
      </td>
      <td style="padding:12px;border-bottom:1px solid #1e293b;">
        <div style="font-weight:600;color:#f1f5f9;font-size:14px;">${escapeHtml(item.product_name)}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Qty: <strong style="color:#e2e8f0;">${item.quantity}</strong></div>
        ${includesBadges ? `<div style="margin-top:6px;">${includesBadges}</div>` : ''}
        ${notes}
      </td>
      <td style="padding:12px;border-bottom:1px solid #1e293b;text-align:right;white-space:nowrap;">
        ${conditionBadge}
        ${returnedBadge}
      </td>
    </tr>`
  })

  return `<div style="margin:20px 0;">
  <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;margin-bottom:8px;padding-left:12px;">&#128230; Equipment Details</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:rgba(15,20,25,0.4);border-radius:8px;border:1px solid #1e293b;overflow:hidden;">
    <tbody>
      ${rows.join('\n')}
    </tbody>
  </table>
</div>`
}

/**
 * Wrap email body in a full HTML document with dark theme
 */
export function wrapEmailHtml(body, { appName = 'VO Gear Hub', logoUrl = '' } = {}) {
  // Convert plain text newlines to HTML structure
  const htmlBody = formatTextToHtml(body)

  const logoCell = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(appName)}" width="36" height="36" style="border-radius:8px;object-fit:contain;display:block;" />`
    : `<div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#f97316,#06b6d4);display:inline-block;text-align:center;line-height:36px;font-size:18px;">&#9881;</div>`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f1419;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1419;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1f25;border-radius:12px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,0.3);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,rgba(249,115,22,0.12),rgba(6,182,212,0.08));border-bottom:1px solid #1e293b;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    ${logoCell}
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:22px;font-weight:700;color:#f97316;letter-spacing:-0.3px;">${escapeHtml(appName)}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:1px;">Equipment Lending Platform</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#cbd5e1;font-size:14px;line-height:1.7;">
              ${htmlBody}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:rgba(15,20,25,0.5);border-top:1px solid #1e293b;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <div style="font-size:11px;color:#475569;">Sent from <span style="color:#64748b;font-weight:500;">${escapeHtml(appName)}</span></div>
                    <div style="font-size:10px;color:#334155;margin-top:4px;">Equipment Lending Management System</div>
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
export function renderEmailTemplate(template, vars, { appName, logoUrl } = {}) {
  // For HTML templates, use styled variable versions
  const resolvedVars = template.format === 'html' ? generateStyledVars(vars) : vars

  let body = template.body.replace(/\{\{(\w+)\}\}/g, (_, key) => resolvedVars[key] || `[${key}]`)
  let subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `[${key}]`)

  if (template.format === 'html') {
    body = wrapEmailHtml(body, { appName, logoUrl })
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
