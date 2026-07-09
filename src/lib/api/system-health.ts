import { supabase } from '@/lib/supabase'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// A snapshot of platform health: DB reachability, edge-function activity,
// today's email volume vs the admin cap, and recent email failures.
export async function getSystemHealth() {
  const now = Date.now()
  const health: any = {
    dbOk: true,
    checkedAt: new Date().toISOString(),
    functions: [] as any[],
    emailHour: 0,
    emailDay: 0,
    emailFailed24h: 0,
    lastReminderAt: null as string | null,
  }

  // DB reachability + edge-function activity.
  try {
    const { data: calls, error } = await supabase
      .from('edge_function_calls')
      .select('function_name, called_at')
      .gte('called_at', new Date(now - DAY).toISOString())
      .order('called_at', { ascending: false })
      .limit(2000)
    if (error) throw error
    const byFn: Record<string, { count: number; last: string }> = {}
    for (const c of calls || []) {
      const e = byFn[c.function_name] || (byFn[c.function_name] = { count: 0, last: c.called_at })
      e.count++
      if (c.called_at > e.last) e.last = c.called_at
    }
    health.functions = Object.entries(byFn).map(([name, v]) => ({ name, count24h: v.count, last: v.last }))
    health.emailHour = (calls || []).filter((c: any) => c.function_name === 'send-email' && c.called_at >= new Date(now - HOUR).toISOString()).length
    health.emailDay = (calls || []).filter((c: any) => c.function_name === 'send-email').length
    const reminder = (calls || []).find((c: any) => c.function_name === 'daily-reminders')
    health.lastReminderAt = reminder?.called_at || null
  } catch (e: any) {
    // edge_function_calls may be locked down; treat as "no data", DB still ok
    // unless the error looks like a connectivity failure.
    if (/fetch|network|timeout/i.test(e?.message || '')) health.dbOk = false
  }

  // Recent email failures from our own log.
  try {
    const { count } = await supabase
      .from('email_log')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', new Date(now - DAY).toISOString())
    health.emailFailed24h = count || 0
  } catch { /* email_log may not exist yet */ }

  return health
}

// F3 — gather the app's configuration into one JSON blob for backup.
export async function exportConfig() {
  const tables = [
    'app_settings', 'email_templates', 'onboarding_block_templates',
    'business_units', 'holidays', 'it_form_fields', 'offboarding_form_fields',
    'mailbox_form_fields', 'checkout_form_fields',
  ]
  const out: any = { exported_at: new Date().toISOString(), tables: {} }
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw error
      out.tables[table] = data
    } catch (e: any) {
      out.tables[table] = { error: e?.message || 'unavailable' }
    }
  }
  return out
}
