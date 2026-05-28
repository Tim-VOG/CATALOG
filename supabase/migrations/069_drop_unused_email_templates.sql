-- ============================================
-- MIGRATION 069: Drop email templates with no runtime sender
-- Audit confirmed nobody calls them; keep the table clean so the
-- admin Communications page doesn't list dangling rows.
-- ============================================

DELETE FROM email_templates
WHERE template_key IN (
  'request_overdue',           -- no scheduled cron in this codebase
  'request_return_confirmed'   -- no QR-return hook wired up either
);
