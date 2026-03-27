-- ================================================================
-- REQUEST EMAIL TEMPLATES
-- Migration: 040_request_email_templates.sql
-- Adds confirmation email templates for all request types
-- ================================================================

-- Add new templates (only if they don't already exist)
INSERT INTO email_templates (template_key, name, subject, body, is_active) VALUES
  ('request_received', 'Request Received', 'Your request has been received', '<p>Hi {{requester_name}},</p><p>Your <strong>{{request_type}}</strong> request has been received and is being reviewed by the IT team.</p><p>You will be notified once it has been processed.</p><p>Thank you!</p>', true),
  ('request_approved', 'Request Approved', 'Your request has been approved', '<p>Hi {{requester_name}},</p><p>Your <strong>{{request_type}}</strong> request has been <strong>approved</strong>.</p><p>The IT team will follow up with next steps.</p>', true),
  ('request_rejected', 'Request Rejected', 'Update on your request', '<p>Hi {{requester_name}},</p><p>Your <strong>{{request_type}}</strong> request could not be approved at this time.</p><p>Please contact the IT team for more information.</p>', true),
  ('onboarding_request_received', 'Onboarding Request Received', 'Onboarding request received for {{employee_name}}', '<p>Hi {{requester_name}},</p><p>Your onboarding request for <strong>{{employee_name}}</strong> has been received.</p><p>Start date: {{start_date}}</p><p>The IT team will prepare everything before their arrival.</p>', true),
  ('offboarding_request_received', 'Offboarding Request Received', 'Offboarding request received for {{employee_name}}', '<p>Hi {{requester_name}},</p><p>Your offboarding request for <strong>{{employee_name}}</strong> has been received.</p><p>Departure date: {{departure_date}}</p><p>The IT team will handle access revocation and equipment collection.</p>', true),
  ('equipment_request_received', 'Equipment Request Received', 'Equipment request received: {{project_name}}', '<p>Hi {{requester_name}},</p><p>Your equipment request for <strong>{{project_name}}</strong> has been received.</p><p>Items requested: {{item_count}}</p><p>The IT team will review and get back to you.</p>', true)
ON CONFLICT (template_key) DO NOTHING;
