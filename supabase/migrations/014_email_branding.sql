-- Migration 014: Email branding settings (tagline + logo height)

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS email_tagline VARCHAR(120) DEFAULT 'Equipment Lending Platform',
  ADD COLUMN IF NOT EXISTS email_logo_height INTEGER DEFAULT 17;
