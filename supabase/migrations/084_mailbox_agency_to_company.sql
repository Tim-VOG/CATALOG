-- Tester feedback (Mariya): the mailbox form's 'Agency' field is too
-- internal jargon — IT-side ops know it as a company, every other
-- requester just asks "Agency?". Rename the label to 'Company' and
-- align the placeholder so the form reads naturally for newcomers.
-- (The field_key stays 'agency' so existing rows / templates / variable
-- references keep working.)

UPDATE mailbox_form_fields
SET label = 'Company',
    placeholder = COALESCE(NULLIF(placeholder, ''), 'Select the entity')
WHERE field_key = 'agency';
