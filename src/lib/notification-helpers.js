import { getNotificationRecipients } from '@/lib/api/notification-recipients'
import { sendEmail } from '@/lib/api/send-email'

/**
 * Send an admin notification using the configured notification_recipients table.
 * Safely ignores errors (returns success:false with error details).
 *
 * @param {object} opts
 * @param {'new_request' | 'status_change' | 'return'} opts.trigger - notification flag
 * @param {string} opts.subject
 * @param {string} opts.body
 * @param {boolean} [opts.isHtml]
 * @returns {Promise<{ success: boolean, recipients?: string[], error?: string }>}
 */
export async function notifyAdmins({ trigger, subject, body, isHtml = true }) {
  const flag = `notify_on_${trigger}`
  try {
    const recipients = await getNotificationRecipients()
    const adminEmails = (recipients || [])
      .filter((r) => r.is_active && r[flag])
      .map((r) => r.email)

    if (adminEmails.length === 0) {
      return { success: true, recipients: [] }
    }

    const result = await sendEmail({
      to: adminEmails,
      subject,
      body,
      isHtml,
    })

    return { success: !!result?.success, recipients: adminEmails, error: result?.error }
  } catch (err) {
    return { success: false, error: err?.message || 'Failed to notify admins' }
  }
}
