-- =============================================================
-- Schedule the daily-reminders edge function via Supabase pg_cron.
-- Run ONCE in the Supabase SQL Editor on prod.
--
-- Replace <PROJECT_REF> and <REMINDER_TOKEN_VALUE> with the real
-- values for your project. The token must match the REMINDER_TOKEN
-- secret you set on the edge function.
-- =============================================================

-- 1. Enable extensions (idempotent).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Drop any previous schedule for this job (idempotent).
SELECT cron.unschedule('daily-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-reminders');

-- 3. Schedule the job at 09:00 Europe/Brussels every day.
--    pg_cron uses UTC; 09:00 Brussels = 07:00 UTC (CET) / 08:00 UTC (CEST).
--    Using '0 8 * * *' gives 10:00 in summer and 09:00 in winter — pick
--    your tradeoff or switch with a manual reschedule on DST changes.
SELECT cron.schedule(
  'daily-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <REMINDER_TOKEN_VALUE>'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- 4. Verify.
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'daily-reminders';
