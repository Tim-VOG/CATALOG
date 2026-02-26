-- Add theme_mode column to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10) DEFAULT 'dark';
