-- 029: Add 'email_tags' field type for mailbox_form_fields
-- Allows the "Who Needs Access" field to enforce email addresses as tags

-- Drop and recreate the CHECK constraint to include 'email_tags'
ALTER TABLE mailbox_form_fields
  DROP CONSTRAINT IF EXISTS mailbox_form_fields_field_type_check;

ALTER TABLE mailbox_form_fields
  ADD CONSTRAINT mailbox_form_fields_field_type_check
  CHECK (field_type IN (
    'text', 'select', 'multi_select', 'date', 'checkbox', 'toggle', 'textarea', 'file', 'email_tags'
  ));

-- Update the who_needs_access field to use 'email_tags' type
UPDATE mailbox_form_fields
SET field_type = 'email_tags',
    help_text = 'Type an email address and press Enter to add. These emails will be CC''d on the confirmation email.',
    placeholder = 'name@company.com'
WHERE field_key = 'who_needs_access';

-- Change the who_needs_access column type on mailbox_requests from TEXT to TEXT
-- (remains TEXT, but will store comma-separated emails from the tags input)
-- No schema change needed — the column stays TEXT.
