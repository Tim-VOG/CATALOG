-- =============================================================
-- Migration 114 — Drop the unused personal_info_submissions table.
--
-- Created in 063 for a public "new hire fills in their own personal
-- info" flow that was never wired into the app (zero frontend
-- references). Removing it to keep the schema honest.
--
-- ⚠️ Before running in an environment that might hold real data, check:
--     SELECT count(*) FROM personal_info_submissions;
--   If it returns > 0, export/verify first — this DROP is irreversible.
-- =============================================================

BEGIN;

DROP VIEW IF EXISTS public.personal_info_submissions_with_details;
DROP TABLE IF EXISTS public.personal_info_submissions CASCADE;

COMMIT;
