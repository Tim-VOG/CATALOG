-- Migration 013: New email templates for status changes + extension decisions
-- Deactivate old templates that are no longer needed

-- Deactivate order_ready (step 2 — admin approves, no longer needed)
UPDATE email_templates SET is_active = false WHERE template_key = 'order_ready';

-- Deactivate return_reminder (step 4 — no longer needed)
UPDATE email_templates SET is_active = false WHERE template_key = 'return_reminder';

-- Update existing templates: remove request numbers, fix project_name quotes (styled vars add quotes)
UPDATE email_templates SET
  subject = 'Your equipment request for "{{project_name}}" has been received',
  body = E'Dear {{user_name}},\n\nYour equipment request for project {{project_name}} has been successfully submitted.\n\nPickup Date: {{pickup_date}}\nReturn Date: {{return_date}}\nItems: {{item_list}}\n\nYou will receive a notification once your request has been reviewed.\n\nBest regards,\nThe VO Gear Hub Team'
WHERE template_key = 'order_confirmation';

-- Update return_confirmation to HTML format matching equipment_picked_up design
UPDATE email_templates SET
  subject = 'Equipment return confirmed — "{{project_name}}"',
  body = E'Dear {{user_name}},\n\nThe equipment for project {{project_name}} has been returned and processed.\n\n{{details_card}}\n\n{{items_html}}\n\nCondition: {{condition}}\n\nThank you for returning the equipment.\n\nBest regards,\nThe VO Gear Hub Team',
  format = 'html',
  variables = ARRAY['user_name', 'project_name', 'request_number', 'pickup_date', 'return_date', 'item_list', 'location', 'details_card', 'items_html', 'condition', 'priority']
WHERE template_key = 'return_confirmation';

-- Insert new templates

-- Step 3: Equipment picked up
INSERT INTO email_templates (template_key, name, subject, body, description, variables, format, is_active) VALUES
(
    'equipment_picked_up',
    'Equipment Picked Up',
    'Equipment picked up — "{{project_name}}"',
    E'Dear {{user_name}},\n\nYour equipment for project {{project_name}} has been picked up successfully.\n\n{{details_card}}\n\n{{items_html}}\n\nPlease remember to return the equipment by the scheduled return date.\n\nBest regards,\nThe VO Gear Hub Team',
    'Sent when admin marks equipment as picked up by the user',
    ARRAY['user_name', 'project_name', 'request_number', 'pickup_date', 'return_date', 'item_list', 'location', 'details_card', 'items_html', 'priority'],
    'html',
    true
);

-- Step 6: Request closed
INSERT INTO email_templates (template_key, name, subject, body, description, variables, format, is_active) VALUES
(
    'request_closed',
    'Request Closed',
    'Request closed — "{{project_name}}"',
    E'Dear {{user_name}},\n\nYour equipment request for project {{project_name}} has been fully processed and closed.\n\n{{details_card}}\n\nThank you for using VO Gear Hub.\n\nBest regards,\nThe VO Gear Hub Team',
    'Sent when admin closes a completed request',
    ARRAY['user_name', 'project_name', 'request_number', 'details_card'],
    'html',
    true
);

-- Extension approved
INSERT INTO email_templates (template_key, name, subject, body, description, variables, format, is_active) VALUES
(
    'extension_approved',
    'Extension Approved',
    'Extension approved — "{{project_name}}" (+{{granted_days}} days)',
    E'Dear {{user_name}},\n\nYour extension request for project {{project_name}} has been approved.\n\nRequested: {{requested_days}} days\nGranted: {{granted_days}} days\nNew return date: {{new_return_date}}\n\nAdmin comment:\n{{admin_comment}}\n\n{{details_card}}\n\nBest regards,\nThe VO Gear Hub Team',
    'Sent when admin approves a loan extension request',
    ARRAY['user_name', 'project_name', 'request_number', 'requested_days', 'granted_days', 'new_return_date', 'admin_comment', 'details_card'],
    'html',
    true
);

-- Extension rejected
INSERT INTO email_templates (template_key, name, subject, body, description, variables, format, is_active) VALUES
(
    'extension_rejected',
    'Extension Declined',
    'Extension declined — "{{project_name}}"',
    E'Dear {{user_name}},\n\nYour extension request of {{requested_days}} days for project {{project_name}} has been declined.\n\nAdmin comment:\n{{admin_comment}}\n\n{{details_card}}\n\nIf you have questions, please contact the equipment team.\n\nBest regards,\nThe VO Gear Hub Team',
    'Sent when admin rejects a loan extension request',
    ARRAY['user_name', 'project_name', 'request_number', 'requested_days', 'admin_comment', 'details_card'],
    'html',
    true
);
