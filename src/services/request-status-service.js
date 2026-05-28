import { sendEmail } from '@/lib/api/send-email'
import { supabase } from '@/lib/supabase'
import { wrapEmailHtml } from '@/lib/email-html'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'

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
  ready: [],
}

export function getAvailableTransitions(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus] || []
}

// ── Hardcoded fallbacks (used if DB template is unavailable) ──
const FALLBACK_TEMPLATES = {
  request_confirmed: {
    subject: 'Your {{request_type}} request has been received',
    body: `Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n\nYou can track your request anytime in the hub.\n\nBest,\nThe VO Hub Team`,
  },
  onboarding_confirmation: {
    subject: 'Onboarding request received for {{new_hire_name}}',
    body: `Hi {{requester_name}},\n\nYour onboarding request for **{{new_hire_name}}** has been received and the IT team will start processing it.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0;"><tr><td>\n  <div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;">\n    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">⚠️ Don't forget</p>\n    <p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Send the <strong>PERSONAL INFORMATION form</strong> to {{new_hire_name}} via HR so we can deliver the welcome materials to their personal email.</p>\n  </div>\n</td></tr></table>\n\nWe'll let you know as soon as the corporate account is ready.\n\nBest,\nThe VO Hub Team`,
  },
  request_in_progress: {
    subject: 'Your {{request_type}} request is being prepared',
    body: `Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#eef4ff;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#3955cf;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#3955cf;letter-spacing:-0.3px;">In Progress</p>\n  </div>\n</td></tr></table>\n\nWe'll let you know as soon as it's ready.\n\nBest,\nThe VO Hub Team`,
  },
  request_ready: {
    subject: 'Your {{request_type}} request is ready',
    body: `Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed. Your equipment is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Ready</p>\n  </div>\n</td></tr></table>\n\nCome by the IT desk whenever you're ready.\n\nBest,\nThe VO Hub Team`,
  },
  request_return_reminder: {
    subject: 'Reminder: {{product_name}} due back on {{return_date}}',
    body: `Hi {{requester_name}},\n\nFriendly reminder that **{{product_name}}** is due for return on **{{return_date}}**.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Return date</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">{{return_date}}</p>\n  </div>\n</td></tr></table>\n\nPlease bring the equipment to the IT desk.\n\nBest,\nThe VO Hub Team`,
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
export async function buildConfirmationEmail({ name, type, detail, newHireName }) {
  const isOnboarding = type === 'onboarding'
  const key = isOnboarding ? 'onboarding_confirmation' : 'request_confirmed'
  const vars = {
    requester_name: name || 'there',
    request_type: type || 'equipment',
    detail: detail || '',
    new_hire_name: newHireName || detail || 'the new hire',
  }
  const { body } = await renderTemplate(key, vars)
  return wrapEmailHtml(body, { appName: 'VO Hub' })
}

export async function buildConfirmationSubject({ type, newHireName, detail }) {
  const isOnboarding = type === 'onboarding'
  const key = isOnboarding ? 'onboarding_confirmation' : 'request_confirmed'
  const { subject } = await renderTemplate(key, {
    request_type: type || 'equipment',
    requester_name: '',
    new_hire_name: newHireName || detail || 'the new hire',
  })
  return subject
}

// ── Status change emails (in_progress / ready) ──
export async function sendStatusChangeEmail(newStatus, { request, requestType = 'equipment' }) {
  // For onboarding, the requester is the IT admin (not the new hire), so a
  // generic "your request is in progress" email is noise. The admin sends a
  // dedicated welcome email to the new hire from the composer instead.
  if (requestType === 'onboarding') return

  const key =
    newStatus === 'in_progress' ? 'request_in_progress' :
    newStatus === 'ready' ? 'request_ready' :
    null
  if (!key) return

  const email = request.user_email || request.requester_email
  if (!email) return

  const name = request.user_first_name || request.requester_name || email.split('@')[0]

  const { subject, body } = await renderTemplate(key, {
    requester_name: name,
    request_type: requestType,
  })

  try {
    await sendEmail({
      to: email,
      subject,
      body: wrapEmailHtml(body, { appName: 'VO Hub' }),
      isHtml: true,
    })
  } catch {}

  // Create in-app notification
  const userId = request.user_id || request.requester_id
  const notifTitle = newStatus === 'in_progress' ? 'Request in progress' : 'Request ready'
  const notifMsg = newStatus === 'in_progress'
    ? `Your ${requestType} request is being prepared by the IT team.`
    : `Your ${requestType} request is ready! Come pick it up at the IT desk.`
  createNotification(userId, notifTitle, notifMsg)
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
  if (request.status === 'in_progress' || request.status === 'ready') {
    events.push({ label: 'In Progress', date: request.updated_at })
  }
  if (request.status === 'ready') {
    events.push({ label: 'Ready', date: request.updated_at })
  }
  return events
}
