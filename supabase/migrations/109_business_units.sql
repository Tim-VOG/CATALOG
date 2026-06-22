-- =============================================================
-- Migration 109 — Business units as an editable, first-class table.
--
-- The list of business units (VO GROUP, VO EUROPE, ACT-EVENTS, …)
-- and their corporate email domains lived as a TypeScript constant
-- (src/lib/constants/business-units.ts). That blocked admins from
-- adding / renaming a BU without a deploy, and meant the database
-- had no way to map a BU to its email domain (needed for the
-- upcoming Manager-scope RLS that filters it_requests by BU).
--
-- Move the list into the database as a real CRUD resource:
--   - admin can edit via /admin/business-units
--   - any authenticated user can SELECT (needed by the onboarding
--     form's BU dropdown and email-pattern computation)
--   - audit trigger + updated_at trigger like every other table
--
-- Seeded with the 7 existing BUs plus ACT-EVENTS (act-events.com).
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.business_units (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  value         TEXT        NOT NULL UNIQUE,
  domain        TEXT        NOT NULL UNIQUE,
  email_pattern TEXT        NOT NULL CHECK (email_pattern IN ('initial_last', 'first', 'initials')),
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup by domain for the future Manager-scope RLS that maps
-- a profile.business_unit to it_requests.data->>'corporate_email'.
CREATE INDEX IF NOT EXISTS idx_business_units_domain ON public.business_units (domain);

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read — the onboarding form needs the list
-- to populate its BU dropdown, and generateCorporateEmail() needs
-- the domain + pattern.
CREATE POLICY "Business units readable by authenticated"
  ON public.business_units
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify business units"
  ON public.business_units
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reuse the shared updated_at trigger (defined in full_schema.sql).
DROP TRIGGER IF EXISTS update_business_units_updated_at ON public.business_units;
CREATE TRIGGER update_business_units_updated_at
  BEFORE UPDATE ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit trigger — match the pattern from migration 100.
DROP TRIGGER IF EXISTS trg_audit_business_units ON public.business_units;
CREATE TRIGGER trg_audit_business_units
  AFTER INSERT OR UPDATE OR DELETE ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- Seed: the 7 BUs that were already hard-coded in the front-end,
-- plus ACT-EVENTS. Idempotent on `value` so reruns are safe.
INSERT INTO public.business_units (value, domain, email_pattern, sort_order) VALUES
  ('VO GROUP',         'vo-group.be',       'initial_last', 10),
  ('THE LITTLE VOICE', 'thelittlevoice.be', 'first',        20),
  ('VO EUROPE',        'vo-europe.eu',      'initial_last', 30),
  ('VO EVENT',         'vo-event.be',       'initial_last', 40),
  ('MAX',              'vo-event-max.be',   'first',        50),
  ('SIGN BRUSSELS',    'sign.brussels',     'initials',     60),
  ('ART ON PAPER',     'artonpaper.be',     'first',        70),
  ('ACT-EVENTS',       'act-events.com',    'initial_last', 80)
ON CONFLICT (value) DO NOTHING;

COMMIT;
