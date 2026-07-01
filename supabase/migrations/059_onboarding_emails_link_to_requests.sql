-- ============================================
-- MIGRATION 059: Link onboarding_emails to it_requests
-- so the admin UI can show "welcome email sent" on a request
-- and auto-mark the request as ready after sending.
-- ============================================

ALTER TABLE onboarding_emails
  ADD COLUMN IF NOT EXISTS it_request_id UUID REFERENCES it_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_emails_it_request_id
  ON onboarding_emails(it_request_id);
