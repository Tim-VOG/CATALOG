import { sendEmail } from '@/lib/api/send-email'
import { supabase } from '@/lib/supabase'
import { wrapEmailHtml } from '@/lib/email-html'

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

// ── Branded email wrapper ──
// Builds inner body + status badge, then delegates chrome to wrapEmailHtml.
function emailTemplate({ title, greeting, body, statusLabel, statusColor, statusBg }) {
  const inner = `<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">${title}</h1>
<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">${greeting}</p>
<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">${body}</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0 8px 0;">
  <tr><td align="center">
    <div style="background:${statusBg};border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">
      <p style="margin:0;font-size:11px;font-weight:600;color:${statusColor};letter-spacing:1px;text-transform:uppercase;">Status</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:${statusColor};letter-spacing:-0.3px;">${statusLabel}</p>
    </div>
  </td></tr>
</table>

<p style="margin:24px 0 6px 0;font-size:15px;color:#425466;line-height:1.65;">You can track your request anytime in the hub.</p>
<p style="margin:18px 0 0 0;font-size:15px;color:#425466;line-height:1.65;">Best,<br>The VO Hub Team</p>`

  return wrapEmailHtml(inner, { appName: 'VO Hub', raw: true })
}

// ── Status configs ──
const STATUS_STYLE = {
  pending: { label: 'Pending', color: '#a16207', bg: '#fef6e0' },
  in_progress: { label: 'In Progress', color: '#3955cf', bg: '#eef4ff' },
  ready: { label: 'Ready', color: '#0a7a3b', bg: '#e7f6ec' },
}

// ── Public: build a confirmation email (called from form pages) ──
export function buildConfirmationEmail({ name, type, detail }) {
  const style = STATUS_STYLE.pending
  return emailTemplate({
    title: 'Request received',
    greeting: `Hi ${name},`,
    body: `Your <strong>${type}</strong> request${detail ? ` for <strong>${detail}</strong>` : ''} has been received and will be processed by the IT team.`,
    statusLabel: style.label,
    statusColor: style.color,
    statusBg: style.bg,
  })
}

// ── Status change emails (in_progress / ready) ──
const STATUS_EMAIL = {
  in_progress: {
    subject: 'Your request is being prepared',
    title: "We're on it",
    body: (name, type) => `Your <strong>${type}</strong> request is now being prepared by the IT team.`,
  },
  ready: {
    subject: 'Your request is ready!',
    title: 'Your request is ready',
    body: (name, type) => `Your <strong>${type}</strong> request has been completed and is ready.`,
  },
}

export async function sendStatusChangeEmail(newStatus, { request, requestType = 'equipment' }) {
  // For onboarding, the requester is the IT admin (not the new hire), so a
  // generic "your request is in progress" email is noise. The admin sends a
  // dedicated welcome email to the new hire from the composer instead.
  if (requestType === 'onboarding') return

  const content = STATUS_EMAIL[newStatus]
  if (!content) return

  const email = request.user_email || request.requester_email
  if (!email) return

  const name = request.user_first_name || request.requester_name || email.split('@')[0]
  const style = STATUS_STYLE[newStatus]

  try {
    await sendEmail({
      to: email,
      subject: content.subject,
      body: emailTemplate({
        title: content.title,
        greeting: `Hi ${name},`,
        body: content.body(name, requestType),
        statusLabel: style.label,
        statusColor: style.color,
        statusBg: style.bg,
      }),
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
