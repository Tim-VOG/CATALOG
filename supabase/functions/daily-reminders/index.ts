// Daily reminders job.
//
// Designed to be triggered once a day (e.g. at 09:00 Europe/Brussels)
// from Supabase Cron / pg_cron via:
//   select net.http_post(
//     url := 'https://<project>.functions.supabase.co/daily-reminders',
//     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.daily_reminders_token'))
//   );
//
// Sends two kinds of reminder emails:
//   1) Onboarding reminder — 2 days before the new hire's first_day,
//      a one-shot heads-up to admin@vo-group.be so IT can finish setup.
//   2) Offboarding reminder — starting 7 days before the new hire's
//      last_day (stored on the onboarding form), a daily nudge sent
//      to the onboarding's original requester to remind them to fill
//      the offboarding form. Stops as soon as an offboarding it_request
//      matching the same person (by name) exists.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'VO Hub <noreply@vo-group.be>'
const IT_ADMIN_EMAIL = Deno.env.get('IT_ADMIN_EMAIL') || 'admin@vo-group.be'
const APP_URL = Deno.env.get('APP_URL') || 'https://hub.vo-group.be'
const REMINDER_TOKEN = Deno.env.get('REMINDER_TOKEN') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function startOfTodayUtc(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function wrapEmail(appName: string, logoUrl: string, bodyHtml: string): string {
  const logoCell = logoUrl
    ? `<div style="display:block;width:160px;height:32px;line-height:32px;overflow:hidden;"><img src="${logoUrl}" alt="${appName}" width="auto" height="32" style="display:block;width:auto;height:32px;max-height:32px;max-width:160px;object-fit:contain;object-position:left center;border:0;outline:none;text-decoration:none;vertical-align:middle;" /></div>`
    : `<div style="display:inline-block;color:#0a2540;font-size:18px;font-weight:700;letter-spacing:-0.3px;line-height:32px;">${appName}</div>`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${appName}</title></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#425466;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f6f9fc;"><tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 2px 6px rgba(10,37,64,0.06),0 12px 32px rgba(10,37,64,0.04);">
<tr><td style="height:4px;background:linear-gradient(90deg,#f97316 0%,#ec4899 50%,#06b6d4 100%);line-height:4px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 40px 8px 40px;">${logoCell}</td></tr>
<tr><td style="padding:24px 40px 32px 40px;color:#425466;font-size:15px;line-height:1.65;">${bodyHtml}</td></tr>
<tr><td style="padding:24px 40px 28px 40px;background:#f6f9fc;border-top:1px solid #eef2f7;"><div style="font-size:12px;color:#8898aa;line-height:1.6;">Sent from <strong style="color:#525f7f;font-weight:600;">${appName}</strong></div><div style="font-size:11px;color:#aab7c4;margin-top:4px;">Automated reminder — reply to this email if anything is off.</div></td></tr>
</table></td></tr></table></body></html>`
}

async function sendResend(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('[daily-reminders] RESEND_API_KEY not configured')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error('[daily-reminders] Resend error', res.status, data)
      return false
    }
    return true
  } catch (err) {
    console.error('[daily-reminders] Resend exception', err)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Token gate — the cron job must pass REMINDER_TOKEN as Bearer.
  if (REMINDER_TOKEN) {
    const auth = req.headers.get('Authorization') || ''
    if (auth !== `Bearer ${REMINDER_TOKEN}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // ── Rate limit: refuse to run more than once every 23h ──
  // The cron schedules us once a day; anything tighter than 23h is a
  // misfire / curl loop / replay attack with the token. Returning 200
  // with a 'skipped' flag means the cron job still looks healthy in
  // pg_cron and we don't blast users with duplicate reminders.
  const { data: lastCall } = await supabase
    .from('edge_function_calls')
    .select('called_at')
    .eq('function_name', 'daily-reminders')
    .eq('success', true)
    .order('called_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastCall && Date.now() - new Date(lastCall.called_at).getTime() < 23 * 60 * 60 * 1000) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: 'already ran in the last 23h', last_run: lastCall.called_at }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
  // ── End rate limit ──

  // ── Branding ──
  let branding = { appName: 'VO Hub', logoUrl: '' }
  try {
    const { data } = await supabase.from('app_settings').select('*').maybeSingle()
    branding = { appName: data?.app_name || 'VO Hub', logoUrl: data?.logo_url || '' }
  } catch (e) {
    console.warn('[daily-reminders] could not load branding', e)
  }

  const today = todayIsoDate()
  const todayPlus2 = addDays(today, 2)
  const todayPlus7 = addDays(today, 7)
  const startToday = startOfTodayUtc().toISOString()

  // ── Pull onboarding requests we care about ──
  const { data: onboardings, error: onbErr } = await supabase
    .from('it_requests')
    .select('id, type, status, requester_email, requester_name, data, onboarding_reminder_sent_at, offboarding_reminder_last_sent_at')
    .eq('type', 'onboarding')
    .neq('status', 'cancelled')
  if (onbErr) {
    console.error('[daily-reminders] failed to fetch onboardings', onbErr)
    return new Response(JSON.stringify({ error: onbErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Pull offboardings to match by name ──
  const { data: offboardings } = await supabase
    .from('it_requests')
    .select('id, data')
    .eq('type', 'offboarding')
  const offboardingNames = new Set<string>(
    (offboardings || []).map((o: any) => {
      const d = o.data || {}
      return (d.employee_name || d.name || `${d.first_name || ''} ${d.last_name || ''}`).trim().toLowerCase()
    }).filter(Boolean)
  )

  const summary = { onboarding_sent: 0, offboarding_sent: 0, return_reminders_sent: 0, overdue_reminders_sent: 0, skipped: 0 }

  for (const req of (onboardings || [])) {
    const data = req.data || {}
    const fullName = (data.name || `${data.first_name || ''} ${data.last_name || ''}`).trim() || 'the new hire'
    const company = data.company || data.business_unit || ''
    const corporateEmail = (data.email_local && data.email_domain)
      ? `${data.email_local}@${data.email_domain}`
      : (data.email_to_create || '—')

    // ── 1) Onboarding 2-day-before reminder ──
    if (data.first_day && data.first_day === todayPlus2 && !req.onboarding_reminder_sent_at) {
      const subject = `Reminder: ${fullName} starts in 2 days`
      const body = `
        <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">Hi IT team,</p>
        <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">
          <strong style="color:#0a2540;">${fullName}</strong> is starting on <strong style="color:#0a2540;">${data.first_day}</strong>.
          ${company ? `(${company})` : ''}
        </p>
        <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">
          Make sure their onboarding is fully set up before then — laptop, accesses, mailbox, welcome email.
        </p>
        <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">
          Corporate email: <strong style="color:#0a2540;">${corporateEmail}</strong>
        </p>
        <p style="margin:0;line-height:1.65;color:#425466;font-size:15px;">
          Open the request: <a href="${APP_URL}/admin/onboarding/requests" style="color:#3955cf;">${APP_URL}/admin/onboarding/requests</a>
        </p>`
      const ok = await sendResend(IT_ADMIN_EMAIL, subject, wrapEmail(branding.appName, branding.logoUrl, body))
      if (ok) {
        await supabase.from('it_requests').update({ onboarding_reminder_sent_at: new Date().toISOString() }).eq('id', req.id)
        summary.onboarding_sent++
      } else {
        summary.skipped++
      }
    }

    // ── 2) Offboarding pre-departure daily reminder ──
    // Only when last_day is in [today, today+7] and we don't already have
    // a matching offboarding it_request submitted for this person, and we
    // haven't already nudged today.
    if (data.last_day && data.last_day >= today && data.last_day <= todayPlus7) {
      const personKey = (`${data.first_name || ''} ${data.last_name || ''}`).trim().toLowerCase()
      const alreadyOffboarded = personKey && offboardingNames.has(personKey)
      const sentToday = req.offboarding_reminder_last_sent_at && req.offboarding_reminder_last_sent_at >= startToday
      if (!alreadyOffboarded && !sentToday && req.requester_email) {
        const subject = `Action needed: submit the offboarding form for ${fullName}`
        const body = `
          <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">Hi ${req.requester_name || 'there'},</p>
          <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">
            <strong style="color:#0a2540;">${fullName}</strong> is leaving on <strong style="color:#0a2540;">${data.last_day}</strong>.
            ${company ? `(${company})` : ''}
          </p>
          <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">
            Please submit the offboarding form so IT can revoke accesses, retrieve equipment
            and close mailboxes in time. This reminder will keep coming daily until the form is submitted.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;"><tr><td align="center">
            <a href="${APP_URL}/offboarding-request" style="display:inline-block;padding:14px 32px;border-radius:10px;background:#0a0a0a;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;letter-spacing:-0.1px;">Open the offboarding form</a>
          </td></tr></table>`
        const ok = await sendResend(req.requester_email, subject, wrapEmail(branding.appName, branding.logoUrl, body))
        if (ok) {
          await supabase.from('it_requests').update({ offboarding_reminder_last_sent_at: new Date().toISOString() }).eq('id', req.id)
          summary.offboarding_sent++
        } else {
          summary.skipped++
        }
      }
    }
  }

  // ── 3) Equipment return reminder — 3 days before the expected return ──
  // Server-side replacement for the old client-side reminder (which only
  // fired when an admin happened to open the dashboard). Matching the exact
  // date, combined with the once-a-day cron, means each active loan gets
  // exactly one reminder — no per-row "sent" flag needed.
  const todayPlus3 = addDays(today, 3)
  try {
    const { data: dueSoon } = await supabase
      .from('user_equipment')
      .select('user_email, user_name, product_name, expected_return_date')
      .eq('status', 'active')
      .eq('expected_return_date', todayPlus3)

    if (dueSoon?.length) {
      // Respect admin edits to the template in /admin/communications.
      let tmplSubject = 'Reminder: {{product_name}} due back on {{return_date}}'
      let tmplBody = ''
      try {
        const { data: tmpl } = await supabase
          .from('email_templates')
          .select('subject, body')
          .eq('template_key', 'request_return_reminder')
          .maybeSingle()
        if (tmpl?.subject) tmplSubject = tmpl.subject
        if (tmpl?.body) tmplBody = tmpl.body
      } catch (_e) { /* fall back to the inline default below */ }

      for (const eq of dueSoon) {
        if (!eq.user_email) continue
        const vars: Record<string, string> = {
          requester_name: eq.user_name || eq.user_email.split('@')[0],
          product_name: eq.product_name || 'the equipment',
          return_date: eq.expected_return_date || '',
        }
        const subst = (t: string) => (t || '').replace(/\{\{(\w+)\}\}/g, (_m: string, k: string) => vars[k] ?? `[${k}]`)
        const subject = subst(tmplSubject)
        const inner = tmplBody
          ? subst(tmplBody)
          : `<p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">Hi ${vars.requester_name},</p>
             <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">Friendly reminder that <strong style="color:#0a2540;">${vars.product_name}</strong> is due for return on <strong style="color:#0a2540;">${vars.return_date}</strong>. Please bring it to the IT desk.</p>`
        const ok = await sendResend(eq.user_email, subject, wrapEmail(branding.appName, branding.logoUrl, inner))
        if (ok) summary.return_reminders_sent++
        else summary.skipped++
      }
    }
  } catch (e) {
    console.error('[daily-reminders] return reminder block failed', e)
  }

  // ── 4) Overdue reminder — 1 day AFTER the expected return date ──
  // A single follow-up nudge the day after a loan becomes overdue. Exact-date
  // match + once-a-day cron means one overdue email per loan (no spam).
  const yesterday = addDays(today, -1)
  try {
    const { data: overdue } = await supabase
      .from('user_equipment')
      .select('user_email, user_name, product_name, expected_return_date')
      .eq('status', 'active')
      .eq('expected_return_date', yesterday)

    if (overdue?.length) {
      let tmplSubject = 'Action required: {{product_name}} is overdue'
      let tmplBody = ''
      try {
        const { data: tmpl } = await supabase
          .from('email_templates')
          .select('subject, body')
          .eq('template_key', 'request_overdue')
          .maybeSingle()
        if (tmpl?.subject) tmplSubject = tmpl.subject
        if (tmpl?.body) tmplBody = tmpl.body
      } catch (_e) { /* fall back to the inline default below */ }

      for (const eq of overdue) {
        if (!eq.user_email) continue
        const vars: Record<string, string> = {
          requester_name: eq.user_name || eq.user_email.split('@')[0],
          product_name: eq.product_name || 'the equipment',
          return_date: eq.expected_return_date || '',
        }
        const subst = (t: string) => (t || '').replace(/\{\{(\w+)\}\}/g, (_m: string, k: string) => vars[k] ?? `[${k}]`)
        const subject = subst(tmplSubject)
        const inner = tmplBody
          ? subst(tmplBody)
          : `<p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;">Hi ${vars.requester_name},</p>
             <p style="margin:0 0 18px 0;line-height:1.65;color:#425466;font-size:15px;"><strong style="color:#0a2540;">${vars.product_name}</strong> was due back on <strong style="color:#0a2540;">${vars.return_date}</strong> and hasn't been returned yet. Please bring it to the IT desk as soon as possible.</p>`
        const ok = await sendResend(eq.user_email, subject, wrapEmail(branding.appName, branding.logoUrl, inner))
        if (ok) summary.overdue_reminders_sent++
        else summary.skipped++
      }
    }
  } catch (e) {
    console.error('[daily-reminders] overdue reminder block failed', e)
  }

  // Log this successful run so the 23h rate-limit gate above blocks
  // accidental double-fires.
  await supabase.from('edge_function_calls').insert({
    function_name: 'daily-reminders', user_id: null, success: true,
  })

  return new Response(JSON.stringify({ ok: true, ...summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
