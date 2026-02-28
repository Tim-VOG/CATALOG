-- 030: Auto-cleanup old completed/rejected requests
-- Completed requests → deleted after 6 months
-- Rejected requests  → deleted after 3 months
-- Runs daily via pg_cron

-- 1. Enable pg_cron (Supabase has it available but it must be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required by Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- 2. Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_loans     INT := 0;
  deleted_it        INT := 0;
  deleted_mailbox   INT := 0;
BEGIN
  -- ── Loan / Catalog requests ──
  WITH d AS (
    DELETE FROM loan_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_loans FROM d;

  -- ── IT requests ──
  WITH d AS (
    DELETE FROM it_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_it FROM d;

  -- ── Mailbox requests ──
  WITH d AS (
    DELETE FROM mailbox_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_mailbox FROM d;

  -- Log the result
  RAISE LOG 'cleanup_old_requests: deleted % loans, % IT, % mailbox requests',
    deleted_loans, deleted_it, deleted_mailbox;
END;
$$;

-- 3. Schedule the cleanup to run every day at 03:00 UTC
SELECT cron.schedule(
  'cleanup-old-requests',     -- job name
  '0 3 * * *',                -- cron expression: daily at 03:00 UTC
  $$SELECT cleanup_old_requests()$$
);
