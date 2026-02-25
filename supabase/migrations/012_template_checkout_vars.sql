-- Migration 012: Add checkout fields as template variables
-- Adds priority, project_description, justification to order templates

-- Order confirmation: add priority, project_description, justification
UPDATE email_templates
SET variables = ARRAY['user_name', 'project_name', 'request_number', 'pickup_date', 'return_date', 'item_list', 'items_html', 'location', 'priority', 'project_description', 'justification', 'details_card']
WHERE template_key = 'order_confirmation';

-- Order ready: add priority, project_description
UPDATE email_templates
SET variables = ARRAY['user_name', 'project_name', 'request_number', 'location', 'pickup_date', 'item_list', 'items_html', 'priority', 'project_description', 'details_card']
WHERE template_key = 'order_ready';

-- Return reminder: add priority
UPDATE email_templates
SET variables = ARRAY['user_name', 'project_name', 'request_number', 'return_date', 'item_list', 'items_html', 'location', 'priority', 'details_card']
WHERE template_key = 'return_reminder';

-- Return confirmation: add items_html, details_card (already had items_html from 011, ensure consistent)
UPDATE email_templates
SET variables = ARRAY['user_name', 'project_name', 'request_number', 'return_date', 'condition', 'item_list', 'items_html', 'details_card']
WHERE template_key = 'return_confirmation';
