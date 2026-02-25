-- Migration 007: Email Templates

CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    description TEXT,
    variables TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email templates viewable by admins" ON email_templates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Only admins can modify email templates" ON email_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed the 4 required templates
INSERT INTO email_templates (template_key, name, subject, body, description, variables) VALUES
(
    'order_confirmation',
    'Order Confirmation',
    'Your equipment request #{{request_number}} has been received',
    E'Dear {{user_name}},\n\nYour equipment request for project "{{project_name}}" has been successfully submitted.\n\nRequest #: {{request_number}}\nPickup Date: {{pickup_date}}\nReturn Date: {{return_date}}\nItems: {{item_list}}\n\nYou will receive a notification once your request has been reviewed.\n\nBest regards,\nThe EquipLend Team',
    'Sent when a user submits a new equipment request',
    ARRAY['user_name', 'project_name', 'request_number', 'pickup_date', 'return_date', 'item_list']
),
(
    'order_ready',
    'Order Ready for Pickup',
    'Your equipment for "{{project_name}}" is ready for pickup',
    E'Dear {{user_name}},\n\nGreat news! Your equipment request #{{request_number}} has been approved and is ready for pickup.\n\nPickup Location: {{location}}\nPickup Date: {{pickup_date}}\nItems: {{item_list}}\n\nPlease collect your equipment at your earliest convenience.\n\nBest regards,\nThe EquipLend Team',
    'Sent when admin approves a request and equipment is ready',
    ARRAY['user_name', 'project_name', 'request_number', 'location', 'pickup_date', 'item_list']
),
(
    'return_reminder',
    'Return Reminder',
    'Reminder: Equipment return due on {{return_date}}',
    E'Dear {{user_name}},\n\nThis is a reminder that your equipment for project "{{project_name}}" (Request #{{request_number}}) is due for return on {{return_date}}.\n\nItems to return: {{item_list}}\nReturn Location: {{location}}\n\nPlease ensure all equipment is returned in good condition.\n\nBest regards,\nThe EquipLend Team',
    'Sent a few days before the return date as a reminder',
    ARRAY['user_name', 'project_name', 'request_number', 'return_date', 'item_list', 'location']
),
(
    'return_confirmation',
    'Return Confirmation',
    'Equipment return confirmed for request #{{request_number}}',
    E'Dear {{user_name}},\n\nWe confirm that the equipment for project "{{project_name}}" (Request #{{request_number}}) has been returned successfully.\n\nReturn Date: {{return_date}}\nCondition: {{condition}}\n\nThank you for using EquipLend.\n\nBest regards,\nThe EquipLend Team',
    'Sent when equipment is returned and processed by admin',
    ARRAY['user_name', 'project_name', 'request_number', 'return_date', 'condition']
);
