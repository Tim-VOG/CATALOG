import { format } from 'date-fns'
import { generateItemsHtml, generateStyledVars, wrapEmailHtml } from '@/lib/email-html'

/**
 * Generate a status change email draft (picked_up, closed, etc.)
 */
export function generateStatusEmailDraft({ template, request, items = [], appName, logoUrl }) {
  const vars = {
    user_name: `${request.user_first_name || ''} ${request.user_last_name || ''}`.trim(),
    project_name: request.project_name || '',
    pickup_date: request.pickup_date ? format(new Date(request.pickup_date), 'dd MMM yyyy') : '',
    return_date: request.return_date ? format(new Date(request.return_date), 'dd MMM yyyy') : '',
    item_list: items.map((i) => `- ${i.product_name} x${i.quantity}`).join('\n'),
    items_html: generateItemsHtml(items),
    project_description: request.project_description || '',
    _items: items,
  }

  if (request.custom_fields && typeof request.custom_fields === 'object') {
    Object.entries(request.custom_fields).forEach(([key, val]) => {
      if (val !== undefined && val !== null) vars[key] = String(val)
    })
  }

  const isHtml = template?.format === 'html'
  const resolvedVars = isHtml ? generateStyledVars(vars) : vars

  const substituteVars = (text, useRaw = false) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key) => (useRaw ? vars : resolvedVars)[key] || `[${key}]`)

  const subject = substituteVars(template?.subject || '{{project_name}} — status update', true)
  let body = substituteVars(template?.body || 'Your request for {{project_name}} has been updated.')

  if (isHtml) {
    body = wrapEmailHtml(body, { appName, logoUrl })
  }

  return { to: request.user_email || '', subject, body, isHtml }
}

/**
 * Generate an extension decision email draft (approved or rejected)
 */
export function generateExtensionEmailDraft({ template, extension, request, appName, logoUrl }) {
  const vars = {
    user_name: `${extension.user_first_name || request?.user_first_name || ''} ${extension.user_last_name || request?.user_last_name || ''}`.trim(),
    project_name: extension.project_name || request?.project_name || '',
    pickup_date: (extension.pickup_date || request?.pickup_date) ? format(new Date(extension.pickup_date || request.pickup_date), 'dd MMM yyyy') : '',
    return_date: (extension.return_date || request?.return_date) ? format(new Date(extension.return_date || request.return_date), 'dd MMM yyyy') : '',
    requested_days: String(extension.requested_days || ''),
    granted_days: String(extension.granted_days || ''),
    new_return_date: '',
    admin_comment: extension.admin_notes || '',
    project_description: request?.project_description || '',
  }

  // Calculate new return date for approved extensions
  if (extension.status === 'approved' && extension.return_date && extension.granted_days) {
    const newDate = new Date(extension.return_date)
    newDate.setDate(newDate.getDate() + extension.granted_days)
    vars.new_return_date = format(newDate, 'dd MMM yyyy')
    // Pass to details_card for strikethrough old date + highlighted new date
    vars.return_date_new = vars.new_return_date
  }

  const isHtml = template?.format === 'html'
  const resolvedVars = isHtml ? generateStyledVars(vars) : vars

  const substituteVars = (text, useRaw = false) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key) => (useRaw ? vars : resolvedVars)[key] || `[${key}]`)

  const subject = substituteVars(template?.subject || 'Extension update — {{project_name}}', true)
  let body = substituteVars(template?.body || 'Your extension request has been reviewed.')

  if (isHtml) {
    body = wrapEmailHtml(body, { appName, logoUrl })
  }

  const to = extension.user_email || request?.user_email || ''
  return { to, subject, body, isHtml }
}

/**
 * Generate a return email draft from template + request data
 */
export function generateReturnDraft({ template, request, items, itemReturns, recipients, appName, logoUrl }) {
  // Build item list text (plain text version)
  const itemLines = items.map((item) => {
    const ret = itemReturns.find((r) => r.id === item.id) || {}
    const condition = ret.return_condition || 'good'
    const conditionLabel = {
      good: 'Good',
      minor: 'Minor issues',
      damaged: 'Damaged',
      lost: 'Lost',
    }[condition] || condition

    const returned = ret.is_returned !== false ? 'Returned' : 'NOT returned'
    const includes = item.product_includes?.length
      ? ` (incl. ${item.product_includes.join(', ')})`
      : ''
    const notes = ret.return_notes ? ` — ${ret.return_notes}` : ''

    return `- ${item.product_name} x${item.quantity}${includes}: ${returned} [${conditionLabel}]${notes}`
  })

  const itemList = itemLines.join('\n')

  // Build HTML items table
  const itemsHtml = generateItemsHtml(items, itemReturns)

  // Build overall condition summary
  const conditions = itemReturns.map((r) => r.return_condition || 'good')
  const hasIssues = conditions.some((c) => c !== 'good')
  const overallCondition = hasIssues
    ? 'Some items have issues - see details below'
    : 'Good - no damage reported'

  // Variable substitution
  const vars = {
    user_name: `${request.user_first_name || ''} ${request.user_last_name || ''}`.trim(),
    project_name: request.project_name || '',
    pickup_date: request.pickup_date ? format(new Date(request.pickup_date), 'dd MMM yyyy') : '',
    return_date: request.return_date ? format(new Date(request.return_date), 'dd MMM yyyy') : '',
    item_list: itemList,
    items_html: itemsHtml,
    condition: overallCondition,
    project_description: request.project_description || '',
    justification: request.justification || '',
    _items: items, // used by generateStyledVars for styled item_list
  }

  // Inject custom field values as template variables (e.g. {{first_name}}, {{last_name}})
  if (request.custom_fields && typeof request.custom_fields === 'object') {
    Object.entries(request.custom_fields).forEach(([key, val]) => {
      if (val !== undefined && val !== null) vars[key] = String(val)
    })
  }

  // For HTML format, use styled variable versions
  const isHtml = template?.format === 'html'
  const resolvedVars = isHtml ? generateStyledVars(vars) : vars

  const substituteVars = (text, useRaw = false) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key) => (useRaw ? vars : resolvedVars)[key] || `[${key}]`)

  // Subject always uses raw (plain text) vars
  const subject = substituteVars(template?.subject || 'Equipment return confirmed — {{project_name}}', true)
  let body = substituteVars(template?.body || 'Return confirmation for {{project_name}}.\n\nItems:\n{{item_list}}\n\nCondition: {{condition}}')

  if (isHtml) {
    body = wrapEmailHtml(body, { appName: appName || 'VO Gear Hub', logoUrl })
  }

  // Build recipients
  const to = request.user_email || ''
  const cc = (recipients || [])
    .filter((r) => r.is_active && r.notify_on_return)
    .map((r) => r.email)

  return { to, cc, subject, body, isHtml }
}
