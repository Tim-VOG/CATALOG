import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml } from '@/lib/email-html'

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

      const inner = `<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Return reminder</h1>
<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi ${item.user_name || item.user_email.split('@')[0]},</p>
<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">This is a friendly reminder that <strong style="color:#0a2540;">${item.product_name}</strong> is due for return on <strong style="color:#0a2540;">${item.expected_return_date}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">
  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">
    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Return date</p>
    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">${item.expected_return_date}</p>
  </div>
</td></tr></table>
<p style="margin:24px 0 0;font-size:13px;color:#8898aa;">Please bring the equipment to the IT desk.</p>`

      await sendEmail({
        to: item.user_email,
        subject: `Reminder: ${item.product_name} due back on ${item.expected_return_date}`,
        body: wrapEmailHtml(inner, { appName: 'VO Hub', raw: true }),
        isHtml: true,
      })
    }
  } catch {
    // non-critical
  }
}
