-- =============================================================
-- Migration 124 — Onboarding checklist (B1) + company holidays (E3).
-- =============================================================

BEGIN;

-- B1: a per-request checklist (IT provisioning steps). Stored as JSONB:
--   [{ "id": "...", "label": "Create user in AD", "done": false }, ...]
ALTER TABLE it_requests
  ADD COLUMN IF NOT EXISTS checklist JSONB;

-- E3: company holidays, so reminders/planning can avoid off days.
CREATE TABLE IF NOT EXISTS public.holidays (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  day        DATE        NOT NULL UNIQUE,
  label      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holidays_day ON public.holidays (day);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read (planning views need it); admins manage.
DROP POLICY IF EXISTS "Anyone can read holidays" ON public.holidays;
CREATE POLICY "Anyone can read holidays"
  ON public.holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage holidays" ON public.holidays;
CREATE POLICY "Admins manage holidays"
  ON public.holidays FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMIT;
