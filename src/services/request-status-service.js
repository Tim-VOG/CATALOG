import { sendEmail } from '@/lib/api/send-email'

export const STATUS_TRANSITIONS = {
  pending: ['in_progress'],
  in_progress: ['ready'],
  ready: [],
}

export function getAvailableTransitions(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus] || []
}

const EMAIL_CONTENT = {
  in_progress: {
    subject: 'Your request is being prepared',
    body: (name, type) => `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#1e293b;margin-bottom:8px;">We're on it</h2>
        <p style="color:#64748b;font-size:15px;line-height:1.6;">Hi ${name},</p>
        <p style="color:#64748b;font-size:15px;line-height:1.6;">Your <strong>${type}</strong> request is now being prepared by the IT team.</p>
        <div style="background:#eff6ff;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
          <p style="margin:0;font-size:13px;color:#93c5fd;">STATUS</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#3b82f6;">In Progress</p>
        </div>
        <p style="color:#64748b;font-size:14px;">You can check the status of your request anytime on the IT Hub.</p>
      </div>`,
  },
  ready: {
    subject: 'Your request is ready!',
    body: (name, type) => `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Your request is ready</h2>
        <p style="color:#64748b;font-size:15px;line-height:1.6;">Hi ${name},</p>
        <p style="color:#64748b;font-size:15px;line-height:1.6;">Your <strong>${type}</strong> request has been completed.</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
          <p style="margin:0;font-size:13px;color:#86efac;">STATUS</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#22c55e;">Ready</p>
        </div>
        <p style="color:#64748b;font-size:14px;">Please come to the IT desk to pick up your equipment.</p>
      </div>`,
  },
}

export async function sendStatusChangeEmail(newStatus, { request, requestType = 'equipment' }) {
  const content = EMAIL_CONTENT[newStatus]
  if (!content) return

  const email = request.user_email || request.requester_email
  if (!email) return

  const name = request.user_first_name
    || request.requester_name
    || email.split('@')[0]

  try {
    await sendEmail({
      to: email,
      subject: content.subject,
      body: content.body(name, requestType),
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
  const events = [
    { label: 'Submitted', date: request.created_at },
  ]
  if (request.status === 'in_progress' || request.status === 'ready') {
    events.push({ label: 'In Progress', date: request.updated_at })
  }
  if (request.status === 'ready') {
    events.push({ label: 'Ready', date: request.updated_at })
  }
  return events
}
