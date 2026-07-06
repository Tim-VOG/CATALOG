-- =============================================================
-- Migration 116 — User feedback / suggestions.
--
-- A lightweight inbox: any signed-in user can drop a suggestion or bug
-- report from the floating feedback widget; admins read them all.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.feedback (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  user_name   TEXT,
  kind        TEXT        NOT NULL DEFAULT 'idea' CHECK (kind IN ('idea', 'bug', 'other')),
  message     TEXT        NOT NULL,
  page        TEXT,
  status      TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'done')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback (created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can submit feedback (their own row).
DROP POLICY IF EXISTS "Users can submit feedback" ON public.feedback;
CREATE POLICY "Users can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can read + manage everything.
DROP POLICY IF EXISTS "Admins manage feedback" ON public.feedback;
CREATE POLICY "Admins manage feedback"
  ON public.feedback FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMIT;
