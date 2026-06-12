-- =============================================================
-- Migration 107 — Per-user language preference.
--
-- The language switcher writes to profiles.language so the choice
-- (fr/en) follows the user across devices. localStorage already
-- covers same-device; this carries it on login elsewhere.
-- =============================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT
    CHECK (language IN ('fr', 'en'));

COMMENT ON COLUMN public.profiles.language IS
  'UI language override (fr/en); NULL = detect from browser, default fr';

COMMIT;
