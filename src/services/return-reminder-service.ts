import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml, getEmailBranding } from '@/lib/email-html'
import { renderTemplate } from './request-status-service'

// Note: the daily 3-days-before return reminders now run server-side in the
// `daily-reminders` edge function (reliable via cron). The old client-side
// checkAndSendReturnReminders() was removed — only the manual per-item
// relaunch below remains, triggered from the admin Overdue page.

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
