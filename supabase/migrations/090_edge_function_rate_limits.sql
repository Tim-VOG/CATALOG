-- =============================================================
-- Migration 090 — Rate limit ledger for Edge Functions.
--
-- Lightweight log of every Edge Function invocation. Each function
-- counts how many recent rows match (user, function) before doing
-- the real work and refuses to proceed past a configured threshold.
-- Used by:
--   * send-email      — caps per-user e-mail bursts so a buggy
--                       loop in the front-end can't drain the
--                       Resend quota or get the sender domain
--                       flagged as spam.
--   * daily-reminders — refuses to re-run within 23h so a misfired
--                       cron / curl can't blast every leaver with
--                       repeated nudges.
--
-- Rows older than 30 days are trimmed by a daily pg_cron job
-- (defined further down) to keep the table cheap.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.edge_function_calls (
    id            BIGSERIAL PRIMARY KEY,
    function_name TEXT NOT NULL,
    user_id       UUID,
    called_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_edge_function_calls_lookup
    ON public.edge_function_calls (function_name, user_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_function_calls_recent
    ON public.edge_function_calls (function_name, called_at DESC);

-- RLS: only writable from the service-role-key paths inside the
-- edge functions themselves. Admins can read the audit trail; no
-- end-user-facing access.
ALTER TABLE public.edge_function_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read edge function calls" ON public.edge_function_calls;
CREATE POLICY "Admins can read edge function calls" ON public.edge_function_calls
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Daily cleanup so the table doesn't grow forever. Uses pg_cron
-- which is already enabled for the daily-reminders schedule.
SELECT cron.unschedule('edge_function_calls_cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'edge_function_calls_cleanup');

SELECT cron.schedule(
  'edge_function_calls_cleanup',
  '15 3 * * *',
  $$DELETE FROM public.edge_function_calls WHERE called_at < NOW() - INTERVAL '30 days';$$
);

NOTIFY pgrst, 'reload schema';
