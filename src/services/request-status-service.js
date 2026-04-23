import { sendEmail } from '@/lib/api/send-email'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'

export const STATUS_TRANSITIONS = {
  pending: ['in_progress'],
  in_progress: ['ready'],
  ready: [],
}

const STATUS_EMAIL_MAP = {
  in_progress: 'request_in_progress',
  ready: 'request_ready',
}

export function getAvailableTransitions(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus] || []
}

export async function sendStatusChangeEmail(newStatus, { request, items, settings }) {
  const templateKey = STATUS_EMAIL_MAP[newStatus]
  if (!templateKey) return

  try {
    const template = await getEmailTemplateByKey(templateKey)
    if (!template || !template.is_active) return

    const requesterName = `${request.user_first_name || ''} ${request.user_last_name || ''}`.trim() || request.user_email
    const trackingUrl = `${window.location.origin}/track/${request.tracking_token}`

    let subject = (template.subject || '')
      .replace(/\{\{request_type\}\}/g, 'equipment')
      .replace(/\{\{requester_name\}\}/g, requesterName)

    let body = (template.body || '')
      .replace(/\{\{request_type\}\}/g, 'equipment')
      .replace(/\{\{requester_name\}\}/g, requesterName)
      .replace(/\{\{tracking_url\}\}/g, trackingUrl)
      .replace(/\{\{project_name\}\}/g, request.project_name || '')

    if (request.user_email) {
      await sendEmail({
        to: request.user_email,
        subject,
        body,
        isHtml: true,
      })
    }
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
