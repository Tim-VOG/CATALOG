-- Migration 012: Add checkout fields as template variables
-- Adds project_description, justification to order templates

-- Order confirmation: add project_description, justification
UPDATE email_templates
SET variables = ARRAY['user_name', 'project_name', 'pickup_date', 'return_date', 'item_list', 'items_html', 'project_description', 'justification', 'details_card']
WHERE template_key = 'order_confirmation';

-- Order ready: add project_description
UPDATE email_templates
SET variables = ARRAY['user_name', 'project_name', 'pickup_date', 'item_list', 'items_html', 'project_description', 'details_card']
WHERE template_key = 'order_ready';

-- Return reminder
UPDATE email_templates
SET variables = ARRAY['user_name', 'project_name', 'return_date', 'item_list', 'items_html', 'details_card']
WHERE template_key = 'return_reminder';

-- Return confirmation: add items_html, details_card
UPDATE email_templates
SET variables = ARRAY['user_name', 'project_name', 'return_date', 'condition', 'item_list', 'items_html', 'details_card']
WHERE template_key = 'return_confirmation';
