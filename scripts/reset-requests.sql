-- =============================================================
-- RESET ALL REQUESTS — PRODUCTION
-- =============================================================
-- Wipes every "request" table and its derived history.
-- KEEPS: profiles, products, qr_codes, email_templates,
--        app_settings, form fields, invitations, inventory items.
--
-- HOW TO USE (Supabase SQL Editor):
--   1. Paste the entire file.
--   2. Run as-is to PREVIEW row counts (wrapped in BEGIN/ROLLBACK).
--   3. To actually apply, change "ROLLBACK;" at the bottom to "COMMIT;".
--
-- THIS IS IRREVERSIBLE ONCE COMMITTED.
-- =============================================================

BEGIN;

-- ─── Pre-flight: row counts before deletion ────────────────────
SELECT 'loan_requests'        AS table_name, COUNT(*) AS rows FROM loan_requests
UNION ALL SELECT 'loan_request_items',     COUNT(*) FROM loan_request_items
UNION ALL SELECT 'extension_requests',     COUNT(*) FROM extension_requests
UNION ALL SELECT 'mailbox_requests',       COUNT(*) FROM mailbox_requests
UNION ALL SELECT 'it_requests',            COUNT(*) FROM it_requests
UNION ALL SELECT 'offboarding_processes',  COUNT(*) FROM offboarding_processes
UNION ALL SELECT 'onboarding_emails',      COUNT(*) FROM onboarding_emails
UNION ALL SELECT 'notifications',          COUNT(*) FROM notifications
UNION ALL SELECT 'audit_logs',             COUNT(*) FROM audit_logs
UNION ALL SELECT 'qr_reservations',        COUNT(*) FROM qr_reservations
UNION ALL SELECT 'qr_waitlist',            COUNT(*) FROM qr_waitlist
UNION ALL SELECT 'qr_reminders_sent',      COUNT(*) FROM qr_reminders_sent
UNION ALL SELECT 'user_equipment',         COUNT(*) FROM user_equipment
UNION ALL SELECT 'cart_items',             COUNT(*) FROM cart_items;

-- ─── Truncate all request tables + derived history ─────────────
-- CASCADE follows foreign keys (e.g. loan_request_items, extension_requests
-- referencing loan_requests). RESTART IDENTITY resets serial sequences.

TRUNCATE TABLE
  loan_requests,
  loan_request_items,
  extension_requests,
  mailbox_requests,
  it_requests,
  offboarding_processes,
  onboarding_emails,
  notifications,
  audit_logs,
  qr_reservations,
  qr_waitlist,
  qr_reminders_sent,
  user_equipment,
  cart_items
RESTART IDENTITY CASCADE;

-- ─── Post-flight: verify all empty ─────────────────────────────
SELECT 'loan_requests'        AS table_name, COUNT(*) AS rows FROM loan_requests
UNION ALL SELECT 'loan_request_items',     COUNT(*) FROM loan_request_items
UNION ALL SELECT 'extension_requests',     COUNT(*) FROM extension_requests
UNION ALL SELECT 'mailbox_requests',       COUNT(*) FROM mailbox_requests
UNION ALL SELECT 'it_requests',            COUNT(*) FROM it_requests
UNION ALL SELECT 'offboarding_processes',  COUNT(*) FROM offboarding_processes
UNION ALL SELECT 'onboarding_emails',      COUNT(*) FROM onboarding_emails
UNION ALL SELECT 'notifications',          COUNT(*) FROM notifications
UNION ALL SELECT 'audit_logs',             COUNT(*) FROM audit_logs
UNION ALL SELECT 'qr_reservations',        COUNT(*) FROM qr_reservations
UNION ALL SELECT 'qr_waitlist',            COUNT(*) FROM qr_waitlist
UNION ALL SELECT 'qr_reminders_sent',      COUNT(*) FROM qr_reminders_sent
UNION ALL SELECT 'user_equipment',         COUNT(*) FROM user_equipment
UNION ALL SELECT 'cart_items',             COUNT(*) FROM cart_items;

-- =============================================================
-- Change ROLLBACK -> COMMIT to apply for real.
-- =============================================================
ROLLBACK;
