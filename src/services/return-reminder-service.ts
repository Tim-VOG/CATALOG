import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml, getEmailBranding } from '@/lib/email-html'
import { renderTemplate } from './request-status-service'

const REMINDER_STORAGE_KEY = 'vo-last-reminder-check'

export async function checkAndSendReturnReminders() {
  const today = new Date().toISOString().split('T')[0]
  const lastCheck = localStorage.getItem(REMINDER_STORAGE_KEY)
  if (lastCheck === today) return

  localStorage.setItem(REMINDER_STORAGE_KEY, today)

  try {
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const reminderDate = threeDaysFromNow.toISOString().split('T')[0]

    const { data: equipment, error } = await supabase
      .from('user_equipment')
      .select('*')
      .eq('status', 'active')
      .eq('expected_return_date', reminderDate)

    if (error || !equipment?.length) return

    for (const item of equipment) {
      if (!item.user_email) continue

      // Load from the DB template (or fall back to FALLBACK_TEMPLATES) so admin
      // edits in /admin/communications actually apply at runtime.
      const { subject, body } = await renderTemplate('request_return_reminder', {
        requester_name: item.user_name || item.user_email.split('@')[0],
        product_name: item.product_name,
        return_date: item.expected_return_date,
      })

      await sendEmail({
        to: item.user_email,
        subject,
        body: wrapEmailHtml(body, await getEmailBranding()),
        isHtml: true,
      })
    }
  } catch {
    // non-critical
  }
}

// One-off manual "relaunch" for a single overdue item — triggered from the
// admin Overdue page. Reuses the return-reminder template so admins can edit
// the copy in /admin/communications and it applies here too.
export async function sendOverdueReminder(item: {
  user_email?: string
  user_name?: string
  product_name?: string
  expected_return_date?: string
}) {
  if (!item?.user_email) throw new Error('No email on file for this holder')
  const { subject, body } = await renderTemplate('request_return_reminder', {
    requester_name: item.user_name || item.user_email.split('@')[0],
    product_name: item.product_name || 'the equipment',
    return_date: item.expected_return_date || '',
  })
  await sendEmail({
    to: item.user_email,
    subject,
    body: wrapEmailHtml(body, await getEmailBranding()),
    isHtml: true,
  })
}
