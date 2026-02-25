-- Migration 008: Custom checkout form fields + notification recipients

-- Custom form fields configuration
CREATE TABLE IF NOT EXISTS checkout_form_fields (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    field_key VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(30) NOT NULL CHECK (field_type IN (
        'text', 'textarea', 'number', 'email', 'phone', 'url',
        'select', 'multi_select', 'checkbox', 'radio', 'date'
    )),
    placeholder VARCHAR(255),
    help_text TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    options JSONB DEFAULT '[]',
    validation JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_checkout_form_fields_updated_at
    BEFORE UPDATE ON checkout_form_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Store custom field values on loan_requests
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Notification recipients for order notifications
CREATE TABLE IF NOT EXISTS notification_recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    notify_on_new_request BOOLEAN DEFAULT TRUE,
    notify_on_status_change BOOLEAN DEFAULT TRUE,
    notify_on_return BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE checkout_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;

-- Form fields: everyone reads (needed for checkout), admins write
CREATE POLICY "Form fields viewable by authenticated" ON checkout_form_fields
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage form fields" ON checkout_form_fields
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Notification recipients: only admins
CREATE POLICY "Admins can view notification recipients" ON notification_recipients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Only admins can manage notification recipients" ON notification_recipients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
