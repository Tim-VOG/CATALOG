-- =============================================================
-- Migration 113 — Allow Dutch (nl) as a profile language.
--
-- Migration 107 added profiles.language with CHECK (language IN
-- ('fr','en')). The language switcher now offers Nederlands too, so
-- widen the constraint to accept 'nl'.
-- =============================================================

BEGIN;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_language_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_language_check
  CHECK (language IN ('fr', 'en', 'nl'));

COMMIT;
