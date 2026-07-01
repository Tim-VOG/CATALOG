-- ============================================
-- MIGRATION 043: Structured Request Notification Types
-- Adds request_type to notifications for categorization
-- Adds email templates for equipment assignment
-- ============================================

-- Add request_type column to notifications for categorization
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS request_type VARCHAR(30)
    CHECK (request_type IN (
        'equipment_request',
        'onboarding_request',
        'offboarding_request',
        'it_material_request',
        'mailbox_request',
        'equipment_assigned',
        'equipment_return_reminder',
        'equipment_overdue'
    ));

-- Index for filtering notifications by type
CREATE INDEX IF NOT EXISTS idx_notifications_request_type ON notifications(request_type);

-- Insert email templates for the new equipment assignment flow
INSERT INTO email_templates (template_key, name, subject, body, is_active) VALUES
    ('equipment_assigned', 'Equipment Assigned', 'Equipment has been assigned to you',
     '<p>Hi {{requester_name}},</p><p>The following equipment has been assigned to you:</p><p><strong>{{product_name}}</strong></p><p>Assigned on: {{assigned_date}}</p><p>Expected return: {{return_date}}</p><p>Please take good care of the equipment and return it on time.</p><p>Thank you!</p>',
     true),
    ('equipment_return_reminder', 'Return Reminder', 'Reminder: Equipment return due soon',
     '<p>Hi {{requester_name}},</p><p>This is a friendly reminder that the following equipment is due for return:</p><p><strong>{{product_name}}</strong></p><p>Return date: {{return_date}}</p><p>Please return it to the IT desk at your earliest convenience.</p><p>Thank you!</p>',
     true),
    ('equipment_overdue', 'Equipment Overdue', 'Action required: Equipment overdue',
     '<p>Hi {{requester_name}},</p><p>The following equipment is now <strong>overdue</strong> for return:</p><p><strong>{{product_name}}</strong></p><p>Originally due: {{return_date}}</p><p>Please return it to the IT desk as soon as possible or contact the IT team if you need an extension.</p>',
     true)
ON CONFLICT (template_key) DO NOTHING;
