import { sendEmail } from '@/lib/api/send-email'

export const STATUS_TRANSITIONS = {
  pending: ['in_progress'],
  in_progress: ['ready'],
  ready: [],
}

export function getAvailableTransitions(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus] || []
}

// ── Branded email wrapper ──
function emailTemplate({ title, greeting, body, statusLabel, statusColor, statusBg }) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

  <!-- Header with logo -->
  <tr><td style="padding:32px 40px 20px 40px;border-bottom:1px solid #f1f5f9;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="font-size:24px;font-weight:800;color:#1e293b;">VO</span></td>
        <td style="text-align:right;">
          <span style="font-size:16px;font-weight:700;color:#f97316;">IT Hub</span><br>
          <span style="font-size:11px;color:#94a3b8;">Equipment Management</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 40px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#1e293b;">${title}</h1>
    <p style="margin:0 0 12px 0;font-size:15px;color:#64748b;line-height:1.6;">${greeting}</p>
    <p style="margin:0 0 24px 0;font-size:15px;color:#64748b;line-height:1.6;">${body}</p>

    <!-- Status badge -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <div style="background:${statusBg};border-radius:12px;padding:20px;text-align:center;">
          <p style="margin:0;font-size:12px;font-weight:600;color:${statusColor};letter-spacing:1px;text-transform:uppercase;">STATUS</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:${statusColor};">${statusLabel}</p>
        </div>
      </td></tr>
    </table>

    <p style="margin:24px 0 0 0;font-size:13px;color:#94a3b8;">You can track the status of your request on the IT Hub.</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Sent from <strong style="color:#64748b;">IT Hub</strong></p>
    <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">VO Group — Brussels</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

// ── Status configs ──
const STATUS_STYLE = {
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
  ready: { label: 'Ready', color: '#22c55e', bg: '#f0fdf4' },
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
  } catch {
    // non-critical
  }
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
