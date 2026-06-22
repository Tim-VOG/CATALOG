import { sendEmail } from '@/lib/api/send-email'
import { notifyRecipients, type RequestKind } from '@/lib/api/notify-recipients'
import { supabase } from '@/lib/supabase'
import { wrapEmailHtml, generateItemsHtml, getEmailBranding } from '@/lib/email-html'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'

function toRequestKind(requestType: string): RequestKind {
  if (requestType === 'onboarding') return 'onboarding'
  if (requestType === 'offboarding') return 'offboarding'
  if (requestType === 'mailbox') return 'mailbox'
  if (requestType === 'equipment') return 'equipment'
  return 'it'
}

export async function createNotification(userId, title, message, type = 'status_change') {
  if (!userId) return
  try {
    await supabase.from('notifications').insert({
      user_id: userId, type, title, message,
      link: '/my-requests',
    })
  } catch {}
}

export const STATUS_TRANSITIONS = {
  pending: ['in_progress'],
  in_progress: ['ready'],
  // 'ready' = ready for pickup. Once the gear comes back, the admin
  // marks it 'returned' — a real terminal state, distinct from
  // "ready for pickup".
  ready: ['returned'],
  returned: [],
}

export function getAvailableTransitions(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus] || []
}

// ── Hardcoded fallbacks (used if DB template is unavailable) ──
// All templates share the same "white bordered card with label + value rows"
// layout as mailbox_confirmation — single design across every email.
const CARD_OPEN = '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">'
const cardRow = (label, value, { last = false, big = false } = {}) =>
  `<tr><td style="padding:18px 22px;${last ? '' : 'border-bottom:1px solid #eef2f7;'}"><div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">${label}</div><div style="font-weight:${big ? '700' : '600'};color:#0a2540;font-size:${big ? '17' : '15'}px;letter-spacing:${big ? '-0.2px' : 'normal'};">${value}</div></td></tr>`
const card = (rows) => `${CARD_OPEN}${rows.map((r, i) => cardRow(r.label, r.value, { last: i === rows.length - 1, big: r.big })).join('')}</table>`

const FALLBACK_TEMPLATES = {
  request_confirmed: {
    subject: 'Your {{request_type}} request has been received',
    body: `Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n${card([{ label: 'Status', value: 'Pending', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\nYou can track your request anytime in the hub.\n\nBest,\nThe VO Hub Team`,
  },
  onboarding_confirmation: {
    subject: 'Onboarding request received for {{new_hire_name}}',
    body: `Hi {{requester_name}},\n\nYour onboarding request for **{{new_hire_name}}** has been received and the IT team will start processing it.\n\n${card([{ label: 'Status', value: 'Pending', big: true }, { label: 'New hire', value: '{{new_hire_name}}' }])}\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;"><tr><td><div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;"><p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">Don't forget</p><p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Send the <strong>PERSONAL INFORMATION form</strong> to {{new_hire_name}} via HR so we can deliver the welcome materials to their personal email.</p></div></td></tr></table>\n\nWe'll let you know as soon as the corporate account is ready.\n\nBest,\nThe VO Hub Team`,
  },
  request_in_progress: {
    subject: 'Your {{request_type}} request is being prepared',
    body: `Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n${card([{ label: 'Status', value: 'In Progress', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\n{{items_html}}\n\nWe'll let you know as soon as it's ready.\n\nBest,\nThe VO Hub Team`,
  },
  request_ready: {
    subject: 'Your {{request_type}} request is ready',
    body: `Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed and is ready for pickup at the IT desk.\n\n${card([{ label: 'Status', value: 'Ready', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\n{{items_html}}\n\nCome by the IT desk whenever you're ready.\n\nBest,\nThe VO Hub Team`,
  },
  request_return_reminder: {
    subject: 'Reminder: {{product_name}} due back on {{return_date}}',
    body: `Hi {{requester_name}},\n\nFriendly reminder that **{{product_name}}** is due for return on **{{return_date}}**. Please bring the equipment to the IT desk.\n\n${card([{ label: 'Equipment', value: '{{product_name}}', big: true }, { label: 'Return date', value: '{{return_date}}' }])}\n\nBest,\nThe VO Hub Team`,
  },
}

function substitute(text, vars) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `[${key}]`)
}

/**
 * Load a template from the DB and substitute {{vars}}.
 * Falls back to the hardcoded version if the DB row is missing.
 * Always returns { subject, body } where body is the inner content
 * (not yet wrapped by wrapEmailHtml).
 */
export async function renderTemplate(key, vars) {
  let tmpl = null
  try { tmpl = await getEmailTemplateByKey(key) } catch {}
  const source = tmpl || FALLBACK_TEMPLATES[key] || { subject: '', body: '' }
  return {
    subject: substitute(source.subject, vars),
    body: substitute(source.body, vars),
  }
}

// ── Public: build a confirmation email (called from form pages) ──
// For onboarding requests, uses the dedicated onboarding_confirmation
// template (which includes the HR personal-information reminder).
export async function buildConfirmationEmail({ name, type, detail, newHireName }: { name: string; type: string; detail?: string; newHireName?: string }) {
  const isOnboarding = type === 'onboarding'
  const key = isOnboarding ? 'onboarding_confirmation' : 'request_confirmed'
  const subjectName = newHireName || detail || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Equipment')
  const vars = {
    requester_name: name || 'there',
    request_type: type || 'equipment',
    detail: detail || '',
    new_hire_name: newHireName || detail || 'the new hire',
    subject_label: subjectLabelFor(type || 'equipment'),
    subject_name: subjectName,
  }
  const { body } = await renderTemplate(key, vars)
  return wrapEmailHtml(body, await getEmailBranding())
}

export async function buildConfirmationSubject({ type, newHireName, detail }: { type: string; newHireName?: string; detail?: string }) {
  const isOnboarding = type === 'onboarding'
  const key = isOnboarding ? 'onboarding_confirmation' : 'request_confirmed'
  const { subject } = await renderTemplate(key, {
    request_type: type || 'equipment',
    requester_name: '',
    new_hire_name: newHireName || detail || 'the new hire',
  })
  return subject
}

// Per-request-type "subject of the action" — the person/thing the
// request is about. Mirrors what onboarding shows via {{new_hire_name}}.
function fullName(...sources) {
  for (const s of sources) {
    const n = [s?.first_name, s?.last_name].filter(Boolean).join(' ').trim()
    if (n) return n
    if (s?.name) return s.name
    if (s?.full_name) return s.full_name
  }
  return ''
}
function subjectLabelFor(requestType) {
  if (requestType === 'onboarding') return 'New hire'
  if (requestType === 'offboarding') return 'Person leaving'
  if (requestType === 'mailbox') return 'Mailbox'
  return 'Request'
}
function subjectNameFor(req, requestType) {
  // For IT requests the form payload lives in req.data (jsonb) — dig into
  // it too so we never end up showing just the capitalised type.
  const data = req?.data || {}
  let v
  if (requestType === 'onboarding' || requestType === 'offboarding') {
    v = fullName(req, data)
      || req?.new_hire_name || data?.new_hire_name
      || data?.email_to_create
      || req?.requested_by_name
  } else if (requestType === 'mailbox') {
    v = req?.email_to_create || data?.email_to_create
      || req?.mailbox_email
      || req?.project_name || data?.project_name
  } else {
    v = req?.project_name || data?.project_name || data?.name
  }
  // Last-resort fallback: short request id so the manager can still identify
  // which request the email is about, even when the form left every name
  // field blank.
  if (v) return v
  const shortId = req?.id ? `#${String(req.id).slice(0, 8)}` : ''
  return shortId || '—'
}

// ── Status change emails (in_progress / ready) ──
export async function sendStatusChangeEmail(newStatus, { request, requestType = 'equipment' }) {
  const key =
    newStatus === 'in_progress' ? 'request_in_progress' :
    newStatus === 'ready' ? 'request_ready' :
    null
  if (!key) return

  // Try every known shape, then fall back to a profile lookup so older
  // rows (created before requester_email existed on a given table) still
  // trigger the email.
  console.log('[sendStatusChangeEmail] start', { newStatus, requestType, id: request?.id, requester_email: request?.requester_email, requested_by: request?.requested_by })
  let email = request.user_email || request.requester_email
  let name = request.user_first_name || request.requester_name || request.requested_by_name
  const userId = request.user_id || request.requester_id || request.requested_by
  if (!email && userId) {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', userId)
        .maybeSingle()
      if (prof?.email) email = prof.email
      if (!name && prof?.first_name) name = prof.first_name
    } catch {}
  }
  if (!email) {
    console.warn('[sendStatusChangeEmail] no email found for request', request.id, requestType)
    return
  }
  if (!name) name = email.split('@')[0]

  // For equipment loan requests, include the list of items (with images)
  // so the requester sees exactly what's being prepared / ready.
  let itemsHtml = ''
  if (requestType === 'equipment' && request?.id) {
    try {
      const { data: items } = await supabase
        .from('loan_request_items_with_details')
        .select('*')
        .eq('request_id', request.id)
      if (items?.length) itemsHtml = generateItemsHtml(items)
    } catch {}
  }

  const { subject, body } = await renderTemplate(key, {
    requester_name: name,
    request_type: requestType,
    subject_label: subjectLabelFor(requestType),
    subject_name: subjectNameFor(request, requestType),
    items_html: itemsHtml,
  })

  console.log('[sendStatusChangeEmail] sending', { to: email, subject, key })
  const result = await sendEmail({
    to: email,
    subject,
    body: wrapEmailHtml(body, await getEmailBranding()),
    isHtml: true,
  })
  console.log('[sendStatusChangeEmail] result', result)

  // Create in-app notification
  const notifTitle = newStatus === 'in_progress' ? 'Request in progress' : 'Request ready'
  const notifMsg = newStatus === 'in_progress'
    ? `Your ${requestType} request is being prepared by the IT team.`
    : `Your ${requestType} request is ready! Come pick it up at the IT desk.`
  createNotification(userId, notifTitle, notifMsg)

  // Fan-out to configured notification_recipients (notify_on_status_change).
  notifyRecipients({
    kind: toRequestKind(requestType),
    event: 'status_change',
    submitter: name,
    subject: subjectNameFor(request, requestType),
    detail: `New status: ${newStatus.replace('_', ' ')}`,
  })
}

/**
 * Fire-and-forget: notify recipients when an equipment loan is returned.
 * Called from the QR-scan / admin "mark returned" flow.
 */
export function notifyReturnRecipients(opts: {
  requestType?: string
  submitter?: string | null
  subject?: string | null
  detail?: string | null
}) {
  notifyRecipients({
    kind: toRequestKind(opts.requestType ?? 'equipment'),
    event: 'return',
    submitter: opts.submitter ?? null,
    subject: opts.subject ?? null,
    detail: opts.detail ?? null,
  })
}


export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

export function buildTimeline(request) {
  const events = [{ label: 'Submitted', date: request.created_at }]
  if (['in_progress', 'ready', 'returned'].includes(request.status)) {
    events.push({ label: 'In Progress', date: request.updated_at })
  }
  if (['ready', 'returned'].includes(request.status)) {
    events.push({ label: 'Ready', date: request.updated_at })
  }
  if (request.status === 'returned') {
    events.push({ label: 'Returned', date: request.updated_at })
  }
  return events
}
