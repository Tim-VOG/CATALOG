import { supabase } from '@/lib/supabase'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Best-effort write to the email_log table. Never throws — a logging
// failure must not affect the send result the caller sees.
async function logEmail(row: any) {
  try {
    await supabase.from('email_log').insert(row)
  } catch (e) {
    console.warn('[Email] could not write email_log', e)
  }
}

/**
 * Send an email via the Supabase Edge Function (Resend).
 * - Fails gracefully — never throws, returns { success, error }.
 * - Retries transient failures (network / edge invoke errors) up to 3
 *   attempts with backoff. Application-level rejections from Resend
 *   (e.g. invalid address) are NOT retried — they won't get better.
 * - Records every attempt outcome in email_log (A1). Pass `meta`
 *   ({ templateKey, businessUnit }) to enrich the log.
 */
export async function sendEmail(
  { to, cc, subject, body, isHtml = true }: { to: string; cc?: string | string[]; subject: string; body: string; isHtml?: boolean },
  meta: { templateKey?: string; businessUnit?: string } = {},
) {
  const backoff = [400, 1200] // ms before retry 2 and 3
  let lastError = 'Unknown error'
  let attempts = 0

  for (let attempt = 0; attempt < 3; attempt++) {
    attempts = attempt + 1
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, cc, subject, body, isHtml },
      })

      // Application-level rejection (Resend said no) — don't retry.
      if (data?.error) {
        console.warn('[Email] Send error:', data.error)
        lastError = data.error
        await logEmail({ to_email: String(to), cc: cc ? String(Array.isArray(cc) ? cc.join(', ') : cc) : null, subject, template_key: meta.templateKey || null, business_unit: meta.businessUnit || null, status: 'failed', error: lastError, attempts })
        return { success: false, error: lastError }
      }

      // Transient edge/network error — worth retrying.
      if (error) {
        console.warn(`[Email] Edge function error (attempt ${attempts}):`, error.message)
        lastError = error.message
        if (attempt < 2) { await sleep(backoff[attempt]); continue }
        await logEmail({ to_email: String(to), cc: cc ? String(Array.isArray(cc) ? cc.join(', ') : cc) : null, subject, template_key: meta.templateKey || null, business_unit: meta.businessUnit || null, status: 'failed', error: lastError, attempts })
        return { success: false, error: lastError }
      }

      // Success.
      await logEmail({ to_email: String(to), cc: cc ? String(Array.isArray(cc) ? cc.join(', ') : cc) : null, subject, template_key: meta.templateKey || null, business_unit: meta.businessUnit || null, status: 'sent', error: null, attempts })
      return { success: true, id: data?.id }
    } catch (err: any) {
      console.warn(`[Email] Failed to send (attempt ${attempts}):`, err?.message || err)
      lastError = err?.message || 'Unknown error'
      if (attempt < 2) { await sleep(backoff[attempt]); continue }
    }
  }

  await logEmail({ to_email: String(to), cc: cc ? String(Array.isArray(cc) ? cc.join(', ') : cc) : null, subject, template_key: meta.templateKey || null, business_unit: meta.businessUnit || null, status: 'failed', error: lastError, attempts })
  return { success: false, error: lastError }
}
