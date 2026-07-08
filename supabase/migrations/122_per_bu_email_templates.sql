-- Per-business-unit email templates (all the non-onboarding emails:
-- request confirmations, mailbox confirmation, invitations, reminders…).
-- Same model as the onboarding blocks: business_unit '' is the default set
-- every BU inherits from; a BU can add its own row per template_key to
-- override subject/body.

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS business_unit text NOT NULL DEFAULT '';

-- Replace the single-column unique on template_key with a composite one.
ALTER TABLE email_templates
  DROP CONSTRAINT IF EXISTS email_templates_template_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS email_templates_bu_key
  ON email_templates (business_unit, template_key);
