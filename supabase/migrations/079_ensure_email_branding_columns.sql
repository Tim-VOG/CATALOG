-- Ensure email branding columns exist (migration 014 may not have run
-- on every environment). Safe to re-run thanks to IF NOT EXISTS.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS email_tagline VARCHAR(120) DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_logo_height INTEGER DEFAULT 0;

NOTIFY pgrst, 'reload schema';
