-- ============================================
-- MIGRATION 077: Drop any leftover unused templates so the admin
-- communications page only shows what's actually wired up to code.
-- Idempotent — safe to re-run.
-- ============================================

DELETE FROM email_templates
WHERE template_key NOT IN (
  'user_invitation',
  'request_confirmed',
  'request_in_progress',
  'request_ready',
  'request_return_reminder',
  'onboarding_confirmation',
  'mailbox_confirmation'
);
