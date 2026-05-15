-- ============================================
-- MIGRATION 056: Centralize email templates
-- Add category, surface mailbox/onboarding/reminders
-- in the unified Communications editor.
-- ============================================

-- ─── 1. Add category column ─────────────────────────────────
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill categories on existing templates
UPDATE email_templates SET category = 'invitations'   WHERE template_key = 'user_invitation';
UPDATE email_templates SET category = 'requests'      WHERE template_key IN ('request_confirmed','request_in_progress','request_ready');
UPDATE email_templates SET category = 'reminders'     WHERE template_key IN ('request_return_reminder','request_overdue','request_return_confirmed');

-- ─── 2. New: mailbox_confirmation ───────────────────────────
INSERT INTO email_templates (template_key, name, subject, body, description, format, category, is_active) VALUES
(
  'mailbox_confirmation',
  'Mailbox Confirmation',
  '{{app_name}} — Your functional mailbox has been created',
  E'Hi {{requester_name}},\n\nYour functional mailbox has been created and is ready to use.\n\n**Mailbox** {{mailbox_email}}\n**Project** {{project_name}}\n**Display name** {{display_name}}\n\n{{onepassword_section}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe {{app_name}} Team',
  'Sent to the requester when a functional mailbox has been provisioned',
  'html',
  'mailbox',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
  description = EXCLUDED.description, format = EXCLUDED.format,
  category = EXCLUDED.category, is_active = true;

-- ─── 3. New: onboarding_welcome ─────────────────────────────
INSERT INTO email_templates (template_key, name, subject, body, description, format, category, is_active) VALUES
(
  'onboarding_welcome',
  'Onboarding Welcome',
  'Welcome to {{app_name}}, {{first_name}} 👋',
  E'Hi {{first_name}},\n\nWelcome to **{{company}}**! We''re thrilled to have you on board as {{job_title}}.\n\nYour account and IT access are configured and ready to go. Here are the key details for your first day:\n\n**Start date** {{start_date}}\n**Office** {{office}}\n**Manager** {{manager_name}}\n\n{{cta:Access the hub|{{login_url}}}}\n\nIf you have any questions before getting started, just reach out to your manager or the IT team — we''re here to help.\n\nSee you soon,\nThe {{app_name}} Team',
  'Sent to a new hire on or before their first day (single welcome email — for the block-based onboarding flow, see Onboarding Composer)',
  'html',
  'onboarding',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
  description = EXCLUDED.description, format = EXCLUDED.format,
  category = EXCLUDED.category, is_active = true;

-- ─── 4. New: dashboard_reminder ─────────────────────────────
INSERT INTO email_templates (template_key, name, subject, body, description, format, category, is_active) VALUES
(
  'dashboard_reminder',
  'Quick Return Reminder',
  'Reminder: {{product_name}} due tomorrow',
  E'Hi {{first_name}},\n\nThis is a friendly reminder that **{{product_name}}** is due for return tomorrow ({{return_date}}).\n\nPlease bring it to the IT desk.\n\nThanks!\nThe {{app_name}} Team',
  'Sent from the admin dashboard "Send reminders" quick action',
  'html',
  'reminders',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
  description = EXCLUDED.description, format = EXCLUDED.format,
  category = EXCLUDED.category, is_active = true;
