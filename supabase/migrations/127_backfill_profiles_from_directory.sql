-- =============================================================
-- Migration 127 — Backfill existing profiles from the people directory.
--
-- Users who signed in via SSO before the directory existed show up as
-- "Unnamed" (empty first/last name) and without phone/title. Fill those
-- empty fields from people_directory, matched by email. Only empty fields
-- are touched — anything the user already set is kept.
-- =============================================================

BEGIN;

UPDATE public.profiles p SET
  first_name    = COALESCE(NULLIF(p.first_name, ''), d.first_name),
  last_name     = COALESCE(NULLIF(p.last_name, ''),  d.last_name),
  phone         = COALESCE(NULLIF(p.phone, ''),         d.phone),
  job_title     = COALESCE(NULLIF(p.job_title, ''),     d.job_title),
  business_unit = COALESCE(NULLIF(p.business_unit, ''), d.business_unit),
  language      = COALESCE(NULLIF(p.language, ''),      d.language),
  department    = COALESCE(NULLIF(p.department, ''),    d.department)
FROM public.people_directory d
WHERE lower(p.email) = lower(d.email);

COMMIT;
