-- ============================================================
-- 028 — Functional Mailbox: email draft, template persistence,
--       archive/deletion date form fields
-- ============================================================

-- ── 1. Add archive_date & deletion_date as system form fields ──
INSERT INTO mailbox_form_fields
  (field_key, label, field_type, step, placeholder, help_text, is_required, options, sort_order, is_system, condition_field, condition_operator, condition_value)
VALUES
  ('archive_date',  'Archive Date',  'date', 'management', '', 'When should the mailbox be archived?',  true, '[]', 122, true, 'deleted_archived', 'equals',   'ARCHIVE & DELETE'),
  ('deletion_date', 'Deletion Date', 'date', 'management', '', 'When should the mailbox be deleted?', true, '[]', 124, true, 'deleted_archived', 'contains', 'DELETE')
ON CONFLICT (field_key) DO NOTHING;

-- ── 2. Email draft columns on mailbox_requests ──
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_subject TEXT;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_body    TEXT;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_to      TEXT;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_cc      TEXT;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_onepassword TEXT;

-- ── 3. Global email template on app_settings ──
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS mailbox_email_template TEXT;

NOTIFY pgrst, 'reload schema';
