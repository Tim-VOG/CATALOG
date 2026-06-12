import { supabase } from '@/lib/supabase'

const KEY = 'vo-last-daily-maintenance'

/**
 * Client-side fallback for the daily server jobs. pg_cron runs these
 * server-side at 06:00, but if cron isn't available (or the instance
 * was asleep), an admin opening the dashboard triggers them too.
 * Debounced to once per calendar day via localStorage; the underlying
 * RPCs are idempotent so a double-run is harmless.
 */
export async function runDailyMaintenance() {
  const today = new Date().toISOString().split('T')[0]
  if (localStorage.getItem(KEY) === today) return
  localStorage.setItem(KEY, today)

  try {
    // Spawn offboarding requests for people leaving within 7 days.
    await supabase.rpc('auto_create_due_offboardings')
  } catch {
    // Non-critical: the server cron covers it. Roll back the stamp so
    // we retry next load instead of silently skipping for the day.
    localStorage.removeItem(KEY)
  }
}
