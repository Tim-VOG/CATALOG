-- Rename "VO Gear Hub" to "VO Hub" across stored data.

-- Update default for hub_main_title column (only affects new rows / restores).
ALTER TABLE app_settings ALTER COLUMN hub_main_title SET DEFAULT 'VO Hub';

-- Update existing app_settings rows still using the old name.
UPDATE app_settings
SET hub_main_title = 'VO Hub'
WHERE hub_main_title = 'VO Gear Hub';

-- Update any email templates that still reference the old brand name.
UPDATE email_templates
SET body = REPLACE(body, 'VO Gear Hub', 'VO Hub')
WHERE body LIKE '%VO Gear Hub%';

UPDATE email_templates
SET subject = REPLACE(subject, 'VO Gear Hub', 'VO Hub')
WHERE subject LIKE '%VO Gear Hub%';
