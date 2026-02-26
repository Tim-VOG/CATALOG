/**
 * Request Status Service — status workflow logic + email dispatch for status changes.
 *
 * Encapsulates the status transition map and automates email sending
 * when an admin changes a request's status.
 */

import { sendEmail } from '@/lib/api/send-email'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'
import { generateStatusEmailDraft } from '@/lib/email-draft'

/**
 * Status workflow: maps current status → allowed next statuses.
 */
export const STATUS_TRANSITIONS = {
  pending: ['approved', 'rejected'],
  approved: ['picked_up', 'cancelled'],
  picked_up: ['returned'],
  returned: ['closed'],
  rejected: [],
  cancelled: [],
  closed: [],
}

/**
 * Email template keys that should be sent automatically on status change.
 */
const STATUS_EMAIL_MAP = {
  picked_up: 'equipment_picked_up',
  closed: 'request_closed',
}

/**
 * Get the list of statuses a request can transition to from its current status.
 * @param {string} currentStatus
 * @returns {string[]}
 */
export function getAvailableTransitions(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus] || []
}

/**
 * Send a status change email (fire-and-forget).
 * @param {string} newStatus - The new status triggering the email
 * @param {object} params - { request, items, settings }
 */
export async function sendStatusChangeEmail(newStatus, { request, items, settings }) {
  const templateKey = STATUS_EMAIL_MAP[newStatus]
  if (!templateKey) return

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url || ''
  const tagline = settings?.email_tagline || ''
  const logoHeight = settings?.email_logo_height || 0
  const ccEmails = request.custom_fields?.cc_emails || []

  try {
    const template = await getEmailTemplateByKey(templateKey)
    if (!template || !template.is_active) return

    const draft = generateStatusEmailDraft({
      template,
      request,
      items,
      appName,
      logoUrl,
      tagline,
      logoHeight,
    })

    if (draft.to) {
      await sendEmail({
        to: draft.to,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: draft.subject,
        body: draft.body,
        isHtml: draft.isHtml,
      })
    }
  } catch {
    // Email is non-critical — don't block the action
  }
}

/**
 * Format a date for display in timelines.
 */
export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Build timeline events from a request object.
 * @param {object} request - Request with date fields
 * @returns {Array<{ label: string, date: string }>}
 */
export function buildTimeline(request) {
  return [
    { label: 'Submitted', date: request.created_at },
    request.approved_at && { label: 'Approved', date: request.approved_at },
    request.picked_up_at && { label: 'Picked up', date: request.picked_up_at },
    request.returned_at && { label: 'Returned', date: request.returned_at },
    request.closed_at && { label: 'Closed', date: request.closed_at },
    request.status === 'rejected' && { label: 'Rejected', date: request.updated_at },
    request.status === 'cancelled' && { label: 'Cancelled', date: request.updated_at },
  ].filter(Boolean)
}
