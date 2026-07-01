-- =============================================================
-- Migration 097 — Persist a per-user theme preference.
--
-- Today the dark/light toggle only lives in localStorage, so the user
-- has to re-pick on every device + every cleared browser cache. Store
-- it on profiles so it follows the user once they sign in.
-- =============================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference TEXT
    CHECK (theme_preference IN ('light', 'dark', 'system'));

COMMENT ON COLUMN public.profiles.theme_preference IS
  'NULL = inherit app default; "light"/"dark"/"system" = user override';

COMMIT;
