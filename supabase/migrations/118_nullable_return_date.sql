-- =============================================================
-- Migration 118 — Allow open-ended loans (no return date).
--
-- Onboarding starter kits (laptop + charger handed to a new hire) are
-- kept, not returned, so reserveOnboardingKit() inserts a loan_request
-- with return_date = NULL. The original NOT NULL constraint blocked that
-- with: null value in column "return_date" violates not-null constraint.
-- Drop it so indefinite loans are allowed.
-- =============================================================

ALTER TABLE public.loan_requests
  ALTER COLUMN return_date DROP NOT NULL;
