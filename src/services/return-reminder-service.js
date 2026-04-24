import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'

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

      await sendEmail({
        to: item.user_email,
        subject: `Reminder: ${item.product_name} due back on ${item.expected_return_date}`,
        body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
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
  <tr><td style="padding:32px 40px;">
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#1e293b;">Return reminder</h1>
    <p style="margin:0 0 12px 0;font-size:15px;color:#64748b;">Hi ${item.user_name || item.user_email.split('@')[0]},</p>
    <p style="margin:0 0 24px 0;font-size:15px;color:#64748b;">This is a friendly reminder that <strong>${item.product_name}</strong> is due for return on <strong>${item.expected_return_date}</strong>.</p>
    <div style="background:#fffbeb;border-radius:12px;padding:20px;text-align:center;">
      <p style="margin:0;font-size:12px;font-weight:600;color:#f59e0b;letter-spacing:1px;">RETURN DATE</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#f59e0b;">${item.expected_return_date}</p>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">Please bring the equipment to the IT desk.</p>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Sent from <strong style="color:#64748b;">IT Hub</strong></p>
    <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">VO Group — Brussels</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
        isHtml: true,
      })
    }
  } catch {
    // non-critical
  }
}
