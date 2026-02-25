import { format } from 'date-fns'
import { generateItemsHtml, generateStyledVars, wrapEmailHtml } from '@/lib/email-html'

/**
 * Generate a return email draft from template + request data
 */
export function generateReturnDraft({ template, request, items, itemReturns, recipients }) {
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
    request_number: String(request.request_number || ''),
    pickup_date: request.pickup_date ? format(new Date(request.pickup_date), 'dd MMM yyyy') : '',
    return_date: request.return_date ? format(new Date(request.return_date), 'dd MMM yyyy') : '',
    item_list: itemList,
    items_html: itemsHtml,
    location: request.location_name || '',
    condition: overallCondition,
    priority: request.priority || 'normal',
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
  const subject = substituteVars(template?.subject || 'Equipment return confirmed for request #{{request_number}}', true)
  let body = substituteVars(template?.body || 'Return confirmation for {{project_name}}.\n\nItems:\n{{item_list}}\n\nCondition: {{condition}}')

  if (isHtml) {
    body = wrapEmailHtml(body, { appName: 'VO Gear Hub' })
  }

  // Build recipients
  const to = request.user_email || ''
  const cc = (recipients || [])
    .filter((r) => r.is_active && r.notify_on_return)
    .map((r) => r.email)

  return { to, cc, subject, body, isHtml }
}
