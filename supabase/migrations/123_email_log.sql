-- =============================================================
-- Migration 123 — Email send log.
--
-- Every email sent from the app (welcome, mailbox, access, status
-- changes, invitations…) records one row here so admins can confirm
-- what actually went out — and see what failed.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email      TEXT        NOT NULL,
  cc            TEXT,
  subject       TEXT,
  template_key  TEXT,
  business_unit TEXT,
  status        TEXT        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error         TEXT,
  attempts      INTEGER     NOT NULL DEFAULT 1,
  created_by    UUID        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_created ON public.email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_status  ON public.email_log (status);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Any signed-in user (i.e. an admin/manager triggering a send) can log a row.
DROP POLICY IF EXISTS "Users can log emails" ON public.email_log;
CREATE POLICY "Users can log emails"
  ON public.email_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins + managers can read the log.
DROP POLICY IF EXISTS "Staff can read email log" ON public.email_log;
CREATE POLICY "Staff can read email log"
  ON public.email_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Admins can clean up.
DROP POLICY IF EXISTS "Admins delete email log" ON public.email_log;
CREATE POLICY "Admins delete email log"
  ON public.email_log FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMIT;
