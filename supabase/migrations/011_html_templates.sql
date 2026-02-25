-- Migration 011: HTML Email Templates
-- Adds format column and items_html variable support

ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS format VARCHAR(10) DEFAULT 'text'
    CHECK (format IN ('text', 'html'));

-- Add items_html to variables arrays for templates that use item_list
UPDATE email_templates
SET variables = array_append(variables, 'items_html')
WHERE NOT ('items_html' = ANY(variables))
  AND 'item_list' = ANY(variables);
