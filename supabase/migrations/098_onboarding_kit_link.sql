-- =============================================================
-- Migration 098 — Link loan_requests back to the onboarding it_request
-- they were auto-reserved for.
--
-- Lets us:
--   1. Avoid duplicating the kit reservation if the admin clicks the
--      "Reserve kit" button twice (the SELECT in reserveOnboardingKit
--      checks this column for an existing row).
--   2. Surface "Kit reserved" status next to the onboarding card
--      without hitting a separate lookup.
-- =============================================================

BEGIN;

ALTER TABLE public.loan_requests
  ADD COLUMN IF NOT EXISTS onboarding_request_id UUID
    REFERENCES public.it_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_loan_requests_onboarding_request_id
  ON public.loan_requests (onboarding_request_id)
  WHERE onboarding_request_id IS NOT NULL;

COMMIT;
