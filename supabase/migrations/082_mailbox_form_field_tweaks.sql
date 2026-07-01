-- Tester feedback round:
--   * Mailbox agency dropdown was missing VO EVENT, VO GROUP and MIT;
--     also reorder it alphabetically and tag it as a single source of
--     truth ahead of any later additions.
--   * Display name needs a clearer help text so a non-IT requester
--     understands it's what recipients see (e.g. "ABC Secretariat Team").

UPDATE mailbox_form_fields
SET options = '["AOP","KRAFTHAUS","MAX","MIT","SIGN BRUSSELS","THE LITTLE VOICE","VO CONSULTING","VO EUROPE","VO EVENT","VO GROUP","VO LAB","VO PRODUCTION","VO STUDIOS"]'::jsonb
WHERE field_key = 'agency';

UPDATE mailbox_form_fields
SET help_text = 'This is the sender name people will see in their inbox before opening the email (e.g. "ABC Secretariat Team" instead of an individual person).'
WHERE field_key = 'display_name'
  AND (help_text IS NULL OR help_text = '');
