-- =============================================================
-- 000_baseline.sql — Consolidated schema (Phase F)
--
-- Verbatim, in-order concatenation of every migration 001..114.
-- Running this ONE file on a fresh database is equivalent to
-- running the 114 migrations in sequence.
--
-- The individual migration files are KEPT (see this directory)
-- as the source of truth and history. This baseline is a
-- convenience for provisioning a brand-new database quickly.
-- Existing databases (prod/staging) are already migrated and
-- must NOT re-run this.
-- =============================================================


-- ═══════════════════════════════════════════════════════════
-- 001_loan_requests.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 001: Loan Requests System
-- Adds request workflow, notifications, audit logs, locations
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- NEW TABLES
-- ============================================

-- Locations table (for pickup/return locations)
CREATE TABLE locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loan requests table (project-based request grouping)
CREATE TABLE loan_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_number SERIAL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
    -- Project info
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    location_id UUID REFERENCES locations(id),
    location_other TEXT,
    justification TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    -- Dates
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    actual_return_date DATE,
    -- Status lifecycle
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'draft', 'pending', 'approved', 'rejected', 'reserved',
        'picked_up', 'returned', 'closed', 'cancelled', 'overdue', 'expired'
    )),
    -- Consent
    terms_accepted BOOLEAN DEFAULT FALSE,
    responsibility_accepted BOOLEAN DEFAULT FALSE,
    -- Admin fields
    rejection_reason TEXT,
    admin_notes TEXT,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    picked_up_at TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Loan request items (products in a request)
CREATE TABLE loan_request_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    options JSONB DEFAULT '{}',
    -- Return info per item
    return_condition VARCHAR(20) CHECK (return_condition IN ('good', 'minor', 'damaged', 'lost')),
    return_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_loan_requests_user ON loan_requests(user_id);
CREATE INDEX idx_loan_requests_status ON loan_requests(status);
CREATE INDEX idx_loan_requests_dates ON loan_requests(pickup_date, return_date);
CREATE INDEX idx_loan_request_items_request ON loan_request_items(request_id);
CREATE INDEX idx_loan_request_items_product ON loan_request_items(product_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_loan_requests_updated_at
    BEFORE UPDATE ON loan_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Available stock calculation for new request system
CREATE OR REPLACE FUNCTION get_available_stock_v2(
    p_product_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_request_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_total_stock INTEGER;
    v_reserved_new INTEGER;
    v_reserved_legacy INTEGER;
BEGIN
    SELECT total_stock INTO v_total_stock
    FROM products WHERE id = p_product_id;

    -- Count from new loan_requests system
    SELECT COALESCE(SUM(lri.quantity), 0) INTO v_reserved_new
    FROM loan_request_items lri
    JOIN loan_requests lr ON lri.request_id = lr.id
    WHERE lri.product_id = p_product_id
    AND lr.status IN ('pending', 'approved', 'reserved', 'picked_up')
    AND NOT (lr.return_date < p_start_date OR lr.pickup_date > p_end_date)
    AND (p_exclude_request_id IS NULL OR lr.id != p_exclude_request_id);

    -- Count from legacy loans table
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_legacy
    FROM loans
    WHERE product_id = p_product_id
    AND status IN ('active', 'pending')
    AND NOT (return_date < p_start_date OR pickup_date > p_end_date);

    RETURN v_total_stock - v_reserved_new - v_reserved_legacy;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Locations: everyone can read
CREATE POLICY "Locations are viewable by everyone" ON locations
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify locations" ON locations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Loan requests: users see their own, admins see all
CREATE POLICY "Users can view own requests" ON loan_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all requests" ON loan_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can create requests" ON loan_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft/pending requests" ON loan_requests
    FOR UPDATE USING (
        user_id = auth.uid() AND status IN ('draft', 'pending')
    );

CREATE POLICY "Admins can modify all requests" ON loan_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Loan request items: follow parent request visibility
CREATE POLICY "Users can view own request items" ON loan_request_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM loan_requests WHERE id = request_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can view all request items" ON loan_request_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can create request items" ON loan_request_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM loan_requests WHERE id = request_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can modify all request items" ON loan_request_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Notifications: users see only their own
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Audit logs: only admins can read
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW loan_requests_with_details AS
SELECT
    lr.*,
    p.first_name AS user_first_name,
    p.last_name AS user_last_name,
    p.email AS user_email,
    loc.name AS location_name,
    loc.address AS location_address,
    (SELECT COUNT(*) FROM loan_request_items WHERE request_id = lr.id) AS item_count
FROM loan_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
LEFT JOIN locations loc ON lr.location_id = loc.id;

CREATE OR REPLACE VIEW loan_request_items_with_details AS
SELECT
    lri.*,
    p.name AS product_name,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    c.name AS category_name,
    c.color AS category_color
FROM loan_request_items lri
LEFT JOIN products p ON lri.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO locations (name, address) VALUES
    ('HQ - Brussels', 'Rue de la Loi 200, 1000 Brussels'),
    ('Office - Antwerp', 'Meir 50, 2000 Antwerp'),
    ('Office - Ghent', 'Korenmarkt 1, 9000 Ghent'),
    ('Warehouse', 'Industrieweg 10, 1000 Brussels'),
    ('Remote / Ship to address', NULL);

-- ═══════════════════════════════════════════════════════════
-- 002_profile_sso_fields.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 002: Add SSO fields to profiles
-- Supports Azure AD / Microsoft Entra ID SSO

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS azure_oid text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en';

-- Index for fast SSO lookup
CREATE INDEX IF NOT EXISTS idx_profiles_azure_oid ON profiles(azure_oid) WHERE azure_oid IS NOT NULL;

-- Update the handle_new_user trigger to capture Azure AD metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, azure_oid, department, job_title, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name', ''),
    new.raw_user_meta_data->>'oid',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'jobTitle',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
    azure_oid = COALESCE(EXCLUDED.azure_oid, profiles.azure_oid),
    department = COALESCE(EXCLUDED.department, profiles.department),
    job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- 003_notification_triggers.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 003: Notification triggers
-- Auto-create notifications on request status changes

-- Notify user when their request status changes
CREATE OR REPLACE FUNCTION notify_request_status_change()
RETURNS trigger AS $$
DECLARE
  v_title text;
  v_message text;
  v_link text;
BEGIN
  -- Only fire on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_link := '/requests/' || NEW.id;

  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'Request Approved';
      v_message := 'Your request "' || NEW.project_name || '" has been approved. You can pick up your equipment.';
    WHEN 'rejected' THEN
      v_title := 'Request Rejected';
      v_message := 'Your request "' || NEW.project_name || '" has been rejected.';
      IF NEW.rejection_reason IS NOT NULL THEN
        v_message := v_message || ' Reason: ' || NEW.rejection_reason;
      END IF;
    WHEN 'picked_up' THEN
      v_title := 'Equipment Picked Up';
      v_message := 'Equipment for "' || NEW.project_name || '" has been marked as picked up.';
    WHEN 'returned' THEN
      v_title := 'Equipment Returned';
      v_message := 'Equipment for "' || NEW.project_name || '" has been marked as returned.';
    WHEN 'closed' THEN
      v_title := 'Request Closed';
      v_message := 'Your request "' || NEW.project_name || '" has been closed.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (NEW.user_id, 'request_status', v_title, v_message, v_link);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_notify_request_status ON loan_requests;
CREATE TRIGGER trg_notify_request_status
  AFTER UPDATE ON loan_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_status_change();

-- Notify admins when a new request is submitted
CREATE OR REPLACE FUNCTION notify_new_request()
RETURNS trigger AS $$
DECLARE
  v_admin record;
  v_requester_name text;
BEGIN
  -- Get requester name
  SELECT first_name || ' ' || last_name INTO v_requester_name
  FROM profiles WHERE id = NEW.user_id;

  -- Notify all admins
  FOR v_admin IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_admin.id,
      'new_request',
      'New Equipment Request',
      v_requester_name || ' submitted a request for "' || NEW.project_name || '".',
      '/admin/requests/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_request ON loan_requests;
CREATE TRIGGER trg_notify_new_request
  AFTER INSERT ON loan_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_new_request();

-- ═══════════════════════════════════════════════════════════
-- 004_fulltext_search.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 004: Full-text search for products

-- Add tsvector column
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update on insert/update
DROP TRIGGER IF EXISTS trg_product_search_vector ON products;
CREATE TRIGGER trg_product_search_vector
  BEFORE INSERT OR UPDATE OF name, description ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_search_vector();

-- Backfill existing products
UPDATE products SET
  search_vector =
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- ═══════════════════════════════════════════════════════════
-- 005_user_management.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 005: User Management enhancements
-- Adds manager role and is_active flag for user management

-- Expand role check to include 'manager'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'manager'));

-- Add is_active column for soft-disabling users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Indexes for admin user listing
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);

-- ═══════════════════════════════════════════════════════════
-- 006_app_settings.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 006: App Settings (Design / Branding)

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    logo_url TEXT,
    app_name VARCHAR(100) DEFAULT 'EquipLend',
    primary_color VARCHAR(7) DEFAULT '#f97316',
    accent_color VARCHAR(7) DEFAULT '#06b6d4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed with defaults
INSERT INTO app_settings (app_name, primary_color, accent_color)
VALUES ('EquipLend', '#f97316', '#06b6d4');

-- Trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App settings are viewable by everyone" ON app_settings
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify app settings" ON app_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- NOTE: Storage bucket 'logos' must be created in Supabase Dashboard > Storage
-- with public access enabled, plus these policies:
--
-- CREATE POLICY "Admins can upload logos" ON storage.objects
--     FOR INSERT WITH CHECK (
--         bucket_id = 'logos'
--         AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--     );
--
-- CREATE POLICY "Public logos access" ON storage.objects
--     FOR SELECT USING (bucket_id = 'logos');

-- ═══════════════════════════════════════════════════════════
-- 007_email_templates.sql
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- 008_custom_form_fields.sql
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- 009_extension_requests.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 009: Extension Requests
-- Allows users to request extra days for picked_up loans

CREATE TABLE IF NOT EXISTS extension_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    requested_days INTEGER NOT NULL CHECK (requested_days > 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    granted_days INTEGER,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_extension_requests_request_id ON extension_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_extension_requests_user_id ON extension_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_requests_status ON extension_requests(status);

-- Trigger for updated_at
CREATE TRIGGER update_extension_requests_updated_at
    BEFORE UPDATE ON extension_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- View with joined details
CREATE OR REPLACE VIEW extension_requests_with_details AS
SELECT
    er.*,
    p.first_name AS user_first_name,
    p.last_name AS user_last_name,
    p.email AS user_email,
    lr.project_name,
    lr.pickup_date,
    lr.return_date,
    lr.status AS request_status,
    lr.request_number,
    reviewer.first_name AS reviewer_first_name,
    reviewer.last_name AS reviewer_last_name
FROM extension_requests er
LEFT JOIN profiles p ON er.user_id = p.id
LEFT JOIN loan_requests lr ON er.request_id = lr.id
LEFT JOIN profiles reviewer ON er.reviewed_by = reviewer.id;

-- RLS
ALTER TABLE extension_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own extension requests
CREATE POLICY "Users can view own extension requests" ON extension_requests
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all extension requests
CREATE POLICY "Admins can view all extension requests" ON extension_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can create extension requests for their own loans
CREATE POLICY "Users can create own extension requests" ON extension_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Only admins can update extension requests (approve/reject)
CREATE POLICY "Only admins can update extension requests" ON extension_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ═══════════════════════════════════════════════════════════
-- 010_return_enhancements.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 010: Return Process Enhancements
-- Adds is_returned flag per item and updates view to include product.includes

ALTER TABLE loan_request_items ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT TRUE;

-- Recreate view to include product includes (accessories)
CREATE OR REPLACE VIEW loan_request_items_with_details AS
SELECT
    lri.*,
    p.name AS product_name,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    p.includes AS product_includes,
    c.name AS category_name,
    c.color AS category_color
FROM loan_request_items lri
LEFT JOIN products p ON lri.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- ═══════════════════════════════════════════════════════════
-- 011_html_templates.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 011: HTML Email Templates
-- Adds format column and items_html variable support

ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS format VARCHAR(10) DEFAULT 'text'
    CHECK (format IN ('text', 'html'));

-- Add items_html to variables arrays for templates that use item_list
UPDATE email_templates
SET variables = array_append(variables, 'items_html')
WHERE NOT ('items_html' = ANY(variables))
  AND 'item_list' = ANY(variables);

-- ═══════════════════════════════════════════════════════════
-- 012_template_checkout_vars.sql
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- 013_new_email_templates.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 013: New email templates for status changes + extension decisions

-- Allow all authenticated users to read active email templates (needed for user-facing emails)
CREATE POLICY "Email templates readable by authenticated users" ON email_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to read notification recipients (needed for user-triggered admin emails)
CREATE POLICY "Notification recipients readable by authenticated users" ON notification_recipients
    FOR SELECT USING (auth.role() = 'authenticated');

-- Fix: allow users to cancel their own pending requests (WITH CHECK must include 'cancelled')
DROP POLICY "Users can update own draft/pending requests" ON loan_requests;
CREATE POLICY "Users can update own draft/pending requests" ON loan_requests
    FOR UPDATE
    USING (user_id = auth.uid() AND status IN ('draft', 'pending'))
    WITH CHECK (user_id = auth.uid() AND status IN ('draft', 'pending', 'cancelled'));

-- Deactivate old templates that are no longer needed

-- Deactivate order_ready (step 2 — admin approves, no longer needed)
UPDATE email_templates SET is_active = false WHERE template_key = 'order_ready';

-- Deactivate return_reminder (step 4 — no longer needed)
UPDATE email_templates SET is_active = false WHERE template_key = 'return_reminder';

-- Update order_confirmation to HTML format matching equipment_picked_up design
UPDATE email_templates SET
  subject = 'Your equipment request for "{{project_name}}" has been received',
  body = E'Dear {{user_name}},\n\nYour equipment request for project {{project_name}} has been successfully submitted.\n\n{{details_card}}\n\n{{items_html}}\n\nYou will receive a notification once your request has been reviewed.\n\nBest regards,\nThe VO Gear Hub Team',
  format = 'html',
  variables = ARRAY['user_name', 'project_name', 'pickup_date', 'return_date', 'item_list', 'details_card', 'items_html']
WHERE template_key = 'order_confirmation';

-- Update return_confirmation to HTML format matching equipment_picked_up design
UPDATE email_templates SET
  subject = 'Equipment return confirmed — "{{project_name}}"',
  body = E'Dear {{user_name}},\n\nThe equipment for project {{project_name}} has been returned and processed.\n\n{{details_card}}\n\n{{items_html}}\n\nCondition: {{condition}}\n\nThank you for returning the equipment.\n\nBest regards,\nThe VO Gear Hub Team',
  format = 'html',
  variables = ARRAY['user_name', 'project_name', 'pickup_date', 'return_date', 'item_list', 'details_card', 'items_html', 'condition']
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
    ARRAY['user_name', 'project_name', 'pickup_date', 'return_date', 'item_list', 'details_card', 'items_html'],
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
    ARRAY['user_name', 'project_name', 'details_card'],
    'html',
    true
);

-- Extension approved (with details_card showing strikethrough old date + new date)
INSERT INTO email_templates (template_key, name, subject, body, description, variables, format, is_active) VALUES
(
    'extension_approved',
    'Extension Approved',
    'Extension approved — "{{project_name}}" (+{{granted_days}} days)',
    E'Dear {{user_name}},\n\nYour extension request for project {{project_name}} has been approved.\n\n{{details_card}}\n\nGranted: {{granted_days}} extra days\nNew return date: {{new_return_date}}\n\nAdmin comment:\n{{admin_comment}}\n\nBest regards,\nThe VO Gear Hub Team',
    'Sent when admin approves a loan extension request',
    ARRAY['user_name', 'project_name', 'pickup_date', 'return_date', 'requested_days', 'granted_days', 'new_return_date', 'admin_comment', 'details_card', 'return_date_new'],
    'html',
    true
);

-- Extension rejected (with details_card matching reference design)
INSERT INTO email_templates (template_key, name, subject, body, description, variables, format, is_active) VALUES
(
    'extension_rejected',
    'Extension Declined',
    'Extension declined — "{{project_name}}"',
    E'Dear {{user_name}},\n\nYour extension request of {{requested_days}} days for project {{project_name}} has been declined.\n\n{{details_card}}\n\nAdmin comment:\n{{admin_comment}}\n\nIf you have questions, please contact the equipment team.\n\nBest regards,\nThe VO Gear Hub Team',
    'Sent when admin rejects a loan extension request',
    ARRAY['user_name', 'project_name', 'pickup_date', 'return_date', 'requested_days', 'admin_comment', 'details_card'],
    'html',
    true
);

-- ═══════════════════════════════════════════════════════════
-- 014_email_branding.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 014: Email branding settings (tagline + logo height)

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS email_tagline VARCHAR(120) DEFAULT 'Equipment Lending Platform',
  ADD COLUMN IF NOT EXISTS email_logo_height INTEGER DEFAULT 17;

-- ═══════════════════════════════════════════════════════════
-- 015_product_options.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- Product Options table
-- Replaces hardcoded accessories/software in ProductConfigModal
-- ============================================

CREATE TABLE product_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    option_type VARCHAR(50) NOT NULL CHECK (option_type IN ('accessory', 'software')),
    label VARCHAR(150) NOT NULL,
    value VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed current hardcoded values
INSERT INTO product_options (option_type, label, value, sort_order) VALUES
  ('accessory', 'Keyboard', 'keyboard', 0),
  ('accessory', 'Mouse', 'mouse', 1),
  ('software', 'Microsoft Office Suite', 'office', 0),
  ('software', 'Other software', 'other', 1);

-- RLS
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active product options"
    ON product_options FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can read all product options"
    ON product_options FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert product options"
    ON product_options FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update product options"
    ON product_options FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can delete product options"
    ON product_options FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ═══════════════════════════════════════════════════════════
-- 016_avatar_storage.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- 016: Avatar Storage Bucket + RLS
-- ============================================

-- Create the avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read avatars (public bucket)
DO $$ BEGIN
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can upload to their own folder
DO $$ BEGIN
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update (replace) their own avatar
DO $$ BEGIN
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete their own avatar
DO $$ BEGIN
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Update loan_requests_with_details view to include avatar
-- Must DROP + CREATE because adding a column changes positions
-- ============================================

DROP VIEW IF EXISTS loan_requests_with_details;

CREATE VIEW loan_requests_with_details AS
SELECT
    lr.*,
    p.first_name AS user_first_name,
    p.last_name AS user_last_name,
    p.email AS user_email,
    p.avatar_url AS user_avatar_url,
    loc.name AS location_name,
    loc.address AS location_address,
    (SELECT COUNT(*) FROM loan_request_items WHERE request_id = lr.id) AS item_count
FROM loan_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
LEFT JOIN locations loc ON lr.location_id = loc.id;

-- ═══════════════════════════════════════════════════════════
-- 017_admin_create_on_behalf.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- 017: Allow admin to create requests on behalf of users
-- ============================================

-- Add created_by column for audit tracking
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- ============================================
-- Update RLS policies on loan_requests
-- ============================================

-- Drop old INSERT policy that restricts to user_id = auth.uid()
DROP POLICY IF EXISTS "Users can create requests" ON loan_requests;

-- New policy: users can create their own, admins can create for anyone
CREATE POLICY "Users and admins can create requests" ON loan_requests
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- Update RLS policies on loan_request_items
-- ============================================

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Users can create request items" ON loan_request_items;

-- New policy: users can insert for own requests, admins can insert for any request
CREATE POLICY "Users and admins can create request items" ON loan_request_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM loan_requests WHERE id = request_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- Update view to include created_by info
-- ============================================

DROP VIEW IF EXISTS loan_requests_with_details;

CREATE VIEW loan_requests_with_details AS
SELECT
    lr.*,
    p.first_name AS user_first_name,
    p.last_name AS user_last_name,
    p.email AS user_email,
    p.avatar_url AS user_avatar_url,
    loc.name AS location_name,
    loc.address AS location_address,
    (SELECT COUNT(*) FROM loan_request_items WHERE request_id = lr.id) AS item_count,
    creator.first_name AS created_by_first_name,
    creator.last_name AS created_by_last_name
FROM loan_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
LEFT JOIN locations loc ON lr.location_id = loc.id
LEFT JOIN profiles creator ON lr.created_by = creator.id;

-- ═══════════════════════════════════════════════════════════
-- 018_theme_mode.sql
-- ═══════════════════════════════════════════════════════════
-- Add theme_mode column to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10) DEFAULT 'dark';

-- ═══════════════════════════════════════════════════════════
-- 019_extended_design.sql
-- ═══════════════════════════════════════════════════════════
-- 019: Extended design customization — per-mode palettes + shared tokens
-- Dark mode palette (nullable = use CSS defaults)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_background VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_foreground VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_card VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_popover VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_secondary VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_muted VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_muted_fg VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_border VARCHAR(10);

-- Light mode palette
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_background VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_foreground VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_card VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_popover VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_secondary VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_muted VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_muted_fg VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_border VARCHAR(10);

-- Shared accent colors
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS success_color VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS warning_color VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS destructive_color VARCHAR(10);

-- Border radius preset ('sm' | 'md' | 'lg' | 'xl' | 'full')
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS border_radius VARCHAR(10) DEFAULT 'md';

-- Header tagline
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS header_tagline VARCHAR(100) DEFAULT 'Book. Borrow. Return.';

-- ═══════════════════════════════════════════════════════════
-- 020_onboarding_tables.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 020: Onboarding email hub tables

-- 1. Recipients table
CREATE TABLE IF NOT EXISTS onboarding_recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    team VARCHAR(255) DEFAULT '',
    department VARCHAR(255) DEFAULT '',
    start_date DATE,
    language VARCHAR(2) NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
    custom_links JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_onboarding_recipients_updated_at
    BEFORE UPDATE ON onboarding_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Block templates (12 types, seeded below)
CREATE TABLE IF NOT EXISTS onboarding_block_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    block_key VARCHAR(100) UNIQUE NOT NULL,
    label_fr VARCHAR(255) NOT NULL,
    label_en VARCHAR(255) NOT NULL,
    default_content_fr TEXT NOT NULL DEFAULT '',
    default_content_en TEXT NOT NULL DEFAULT '',
    default_options JSONB DEFAULT '{}',
    icon VARCHAR(50) DEFAULT 'FileText',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Onboarding emails
CREATE TABLE IF NOT EXISTS onboarding_emails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_id UUID REFERENCES onboarding_recipients(id) ON DELETE SET NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    language VARCHAR(2) NOT NULL DEFAULT 'fr',
    subject VARCHAR(500) NOT NULL DEFAULT '',
    blocks_config JSONB NOT NULL DEFAULT '[]',
    rendered_html TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_onboarding_emails_updated_at
    BEFORE UPDATE ON onboarding_emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: admin-only for all 3 tables
ALTER TABLE onboarding_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_block_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage onboarding recipients" ON onboarding_recipients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can view block templates" ON onboarding_block_templates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage block templates" ON onboarding_block_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage onboarding emails" ON onboarding_emails
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed the 12 block types
INSERT INTO onboarding_block_templates (block_key, label_fr, label_en, default_content_fr, default_content_en, default_options, icon, sort_order) VALUES
(
    'salutation',
    'Salutation',
    'Greeting',
    'Bonjour {{first_name}},

Bienvenue chez VO Group ! Nous sommes ravis de vous accueillir dans notre equipe. Votre premier jour est prevu le {{start_date}}.

Voici les informations essentielles pour bien demarrer.',
    'Hello {{first_name}},

Welcome to VO Group! We are delighted to welcome you to our team. Your first day is scheduled for {{start_date}}.

Here is the essential information to get you started.',
    '{}',
    'Hand',
    1
),
(
    'email_info',
    'Informations email',
    'Email Information',
    'Votre adresse email professionnelle est : {{email}}

Vous pouvez acceder a votre boite mail via Outlook ou sur https://outlook.office.com. Votre mot de passe temporaire vous sera communique separement par le service IT.',
    'Your professional email address is: {{email}}

You can access your mailbox via Outlook or at https://outlook.office.com. Your temporary password will be communicated separately by the IT department.',
    '{}',
    'Mail',
    2
),
(
    'building_info',
    'Informations batiment',
    'Building Information',
    'Notre bureau est situe au VO Group. A votre arrivee, presentez-vous a la reception. Votre badge d''acces sera pret et vous sera remis le premier jour.

Horaires d''ouverture du batiment : 7h30 - 19h00.',
    'Our office is located at VO Group. Upon arrival, please check in at the reception desk. Your access badge will be ready and handed to you on your first day.

Building opening hours: 7:30 AM - 7:00 PM.',
    '{"building_address": "", "reception_phone": ""}',
    'Building2',
    3
),
(
    'it_security',
    'Securite IT',
    'IT Security',
    'Quelques regles importantes de securite informatique :

- Ne partagez jamais vos identifiants de connexion
- Verrouillez votre poste lorsque vous vous absentez (Windows + L)
- Signalez tout email suspect au service IT
- Utilisez uniquement les logiciels approuves par l''entreprise
- Activez l''authentification multi-facteurs (MFA) sur tous vos comptes',
    'A few important IT security rules:

- Never share your login credentials
- Lock your workstation when you step away (Windows + L)
- Report any suspicious emails to the IT department
- Only use company-approved software
- Enable multi-factor authentication (MFA) on all your accounts',
    '{}',
    'Shield',
    4
),
(
    'email_signature',
    'Signature email',
    'Email Signature',
    'Votre signature email a ete configuree automatiquement. Verifiez qu''elle contient les informations correctes :

Nom : {{first_name}} {{last_name}}
Equipe : {{team}}
Departement : {{department}}

Si des modifications sont necessaires, contactez le service IT.',
    'Your email signature has been automatically configured. Please verify that it contains the correct information:

Name: {{first_name}} {{last_name}}
Team: {{team}}
Department: {{department}}

If any changes are needed, contact the IT department.',
    '{}',
    'PenTool',
    5
),
(
    'sharepoint',
    'SharePoint',
    'SharePoint',
    'Vous avez acces a notre espace SharePoint ou vous trouverez :

- Les documents partages de votre equipe
- Les procedures internes
- Les templates de documents officiels

Accedez a SharePoint via le lien ci-dessous.',
    'You have access to our SharePoint space where you will find:

- Shared documents for your team
- Internal procedures
- Official document templates

Access SharePoint via the link below.',
    '{"url": "https://vogroup.sharepoint.com", "label_fr": "Ouvrir SharePoint", "label_en": "Open SharePoint"}',
    'FolderOpen',
    6
),
(
    'teams',
    'Microsoft Teams',
    'Microsoft Teams',
    'Microsoft Teams est notre outil principal de communication. Vous avez ete ajoute aux canaux de votre equipe ({{team}}).

Telechargez l''application Teams sur votre poste et votre telephone pour rester connecte.',
    'Microsoft Teams is our main communication tool. You have been added to your team channels ({{team}}).

Download the Teams application on your computer and phone to stay connected.',
    '{"url": "https://teams.microsoft.com", "label_fr": "Ouvrir Teams", "label_en": "Open Teams"}',
    'MessageSquare',
    7
),
(
    'wifi',
    'WiFi',
    'WiFi',
    'Pour vous connecter au reseau WiFi de l''entreprise :

Reseau : VO-Corporate
Le mot de passe vous sera communique par le service IT a votre arrivee.

Pour les visiteurs, utilisez le reseau VO-Guest.',
    'To connect to the company WiFi network:

Network: VO-Corporate
The password will be provided by the IT department upon your arrival.

For visitors, use the VO-Guest network.',
    '{"network_name": "VO-Corporate", "guest_network": "VO-Guest"}',
    'Wifi',
    8
),
(
    'image_rights',
    'Droit a l''image',
    'Image Rights',
    'Dans le cadre de la communication interne et externe, nous pourrions etre amenes a utiliser votre image (photos, videos). Un formulaire de consentement vous sera present le premier jour.

Vous etes libre d''accepter ou de refuser, cela n''affectera en rien votre travail.',
    'For internal and external communications, we may use your image (photos, videos). A consent form will be presented to you on your first day.

You are free to accept or decline — this will not affect your work in any way.',
    '{}',
    'Camera',
    9
),
(
    'faq_it',
    'FAQ IT',
    'IT FAQ',
    'Questions frequentes :

Q: Comment reinitialiser mon mot de passe ?
R: Rendez-vous sur https://passwordreset.microsoftonline.com

Q: Mon ecran ne s''allume pas, que faire ?
R: Verifiez les branchements et contactez le support IT.

Q: Comment installer une imprimante ?
R: Suivez le guide disponible sur SharePoint > IT > Imprimantes.

Pour toute autre question, contactez le support IT.',
    'Frequently asked questions:

Q: How do I reset my password?
A: Go to https://passwordreset.microsoftonline.com

Q: My screen won''t turn on, what should I do?
A: Check the connections and contact IT support.

Q: How do I install a printer?
A: Follow the guide available on SharePoint > IT > Printers.

For any other questions, contact IT support.',
    '{"support_email": "it-support@vo-group.be"}',
    'HelpCircle',
    10
),
(
    'cta_link',
    'Lien CTA',
    'CTA Link',
    'Cliquez sur le bouton ci-dessous pour acceder a la ressource.',
    'Click the button below to access the resource.',
    '{"url": "https://", "label_fr": "Acceder", "label_en": "Access"}',
    'ExternalLink',
    11
),
(
    'closing',
    'Conclusion',
    'Closing',
    'Nous avons hate de travailler avec vous ! Si vous avez des questions avant votre premier jour, n''hesitez pas a nous contacter.

A tres bientot,
L''equipe VO Group',
    'We look forward to working with you! If you have any questions before your first day, please don''t hesitate to reach out.

See you soon,
The VO Group Team',
    '{}',
    'CheckCircle',
    12
);

-- ═══════════════════════════════════════════════════════════
-- 021_it_requests_and_module_access.sql
-- ═══════════════════════════════════════════════════════════
-- Migration 021: IT Request Form + Module Access Control

-- ============================================================
-- 1. IT Request submissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS it_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    -- Person info
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    status VARCHAR(100) DEFAULT '',
    business_unit VARCHAR(255) DEFAULT '',
    signature_title VARCHAR(255) DEFAULT '',
    start_date DATE,
    leaving_date DATE,
    -- IT needs
    needs_computer BOOLEAN DEFAULT FALSE,
    access_needs TEXT[] DEFAULT '{}',
    sharepoint_url TEXT DEFAULT '',
    listing VARCHAR(255) DEFAULT '',
    listing_date DATE,
    -- Meta
    requested_by UUID REFERENCES profiles(id),
    requested_by_name VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_it_requests_updated_at
    BEFORE UPDATE ON it_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: authenticated users can create; admins can manage all
ALTER TABLE it_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create IT requests" ON it_requests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own IT requests" ON it_requests
    FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Admins can manage all IT requests" ON it_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 2. Module access control table
-- ============================================================
CREATE TABLE IF NOT EXISTS module_access (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    module_key VARCHAR(50) NOT NULL CHECK (module_key IN ('catalog', 'onboarding', 'it_form', 'functional_mailbox')),
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_key)
);

CREATE TRIGGER update_module_access_updated_at
    BEFORE UPDATE ON module_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own module access" ON module_access
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage module access" ON module_access
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_module_access_user ON module_access(user_id);
CREATE INDEX IF NOT EXISTS idx_module_access_module ON module_access(module_key);
CREATE INDEX IF NOT EXISTS idx_it_requests_requested_by ON it_requests(requested_by);

-- ═══════════════════════════════════════════════════════════
-- 022_it_request_email_fields.sql
-- ═══════════════════════════════════════════════════════════
-- 022: Add generated_email and personal_email to IT requests + onboarding recipients

-- IT requests: auto-generated corporate email based on business unit
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS generated_email VARCHAR(255) DEFAULT '';

-- IT requests: personal email of the new hire (for sending welcome info)
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255) DEFAULT '';

-- Onboarding recipients: personal email (carried from IT request)
ALTER TABLE onboarding_recipients ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255) DEFAULT '';

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 023_it_form_config.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================================
-- 023 — IT Form Builder: dynamic form field configuration
-- ============================================================

-- Table: it_form_fields
-- Stores the schema/config for each field in the IT request form.
-- System fields (is_system = true) map to real it_requests columns.
-- Custom fields store values in it_requests.custom_fields JSONB.
CREATE TABLE IF NOT EXISTS it_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(30) NOT NULL CHECK (field_type IN (
    'text', 'select', 'multi_select', 'date', 'checkbox', 'toggle', 'textarea'
  )),
  step VARCHAR(30) NOT NULL DEFAULT 'additional' CHECK (step IN (
    'identity', 'dates', 'it-needs', 'additional'
  )),
  placeholder VARCHAR(255) DEFAULT '',
  help_text VARCHAR(500) DEFAULT '',
  is_required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]',

  -- Conditional logic: show this field only when condition is met
  condition_field VARCHAR(100) DEFAULT NULL,
  condition_operator VARCHAR(20) DEFAULT NULL CHECK (condition_operator IS NULL OR condition_operator IN (
    'equals', 'not_equals', 'contains', 'is_true', 'is_false'
  )),
  condition_value TEXT DEFAULT NULL,

  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add custom_fields JSONB column to it_requests for custom field storage
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- ── RLS ──
ALTER TABLE it_form_fields ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (needed to render the form)
CREATE POLICY "it_form_fields_select" ON it_form_fields
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "it_form_fields_admin_insert" ON it_form_fields
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "it_form_fields_admin_update" ON it_form_fields
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "it_form_fields_admin_delete" ON it_form_fields
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ── Seed 13 system fields ──
INSERT INTO it_form_fields (field_key, label, field_type, step, placeholder, help_text, is_required, options, sort_order, is_system) VALUES
  ('first_name',      'First Name',         'text',         'identity',  'John',              '',                           true,  '[]', 10, true),
  ('last_name',       'Last Name',          'text',         'identity',  'Doe',               '',                           true,  '[]', 20, true),
  ('status',          'Status',             'select',       'identity',  '',                  '',                           true,  '["CDI","CDD","Freelance","Intern","Student"]', 30, true),
  ('business_unit',   'Business Unit',      'select',       'identity',  '',                  'Email will be auto-generated based on this', true, '["VO GROUP","THE LITTLE VOICE","VO EUROPE","VO EVENT","MAX","SIGN BRUSSELS","ART ON PAPER"]', 40, true),
  ('personal_email',  'Personal Email',     'text',         'identity',  'john@gmail.com',    'Used for sending welcome email before corporate account is created', false, '[]', 50, true),
  ('signature_title', 'Signature Title',    'text',         'identity',  'Project Manager',   'Job title for email signature', false, '[]', 60, true),
  ('start_date',      'Start Date',         'date',         'dates',     '',                  '',                           false, '[]', 70, true),
  ('leaving_date',    'Leaving Date',       'date',         'dates',     '',                  '',                           false, '[]', 80, true),
  ('needs_computer',  'Needs a Computer',   'toggle',       'it-needs',  '',                  '',                           false, '[]', 90, true),
  ('access_needs',    'Access Needed',      'multi_select', 'it-needs',  '',                  'Select all required access',  false, '["Email","Teams","SharePoint","VPN","ERP","CRM","Adobe CC","Other"]', 100, true),
  ('sharepoint_url',  'SharePoint URL',     'text',         'it-needs',  'https://...',       'Link to the team SharePoint site', false, '[]', 110, true),
  ('listing',         'Listing',            'text',         'additional','',                  '',                           false, '[]', 120, true),
  ('listing_date',    'Listing Date',       'date',         'additional','',                  '',                           false, '[]', 130, true)
ON CONFLICT (field_key) DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 024_dual_logos_and_hub_titles.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================================
-- 024 — Dual logos (dark/light) + Hub page editable titles
-- ============================================================

-- Dual logo URLs (keep existing logo_url as fallback)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url_dark TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url_light TEXT;

-- Hub page customizable titles and descriptions
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_main_title VARCHAR(100) DEFAULT 'VO Gear Hub';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_tagline VARCHAR(200) DEFAULT 'Welcome — choose your destination';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_catalog_title VARCHAR(100) DEFAULT 'Equipment Catalog';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_catalog_description TEXT DEFAULT 'Browse and reserve equipment for your projects. View availability and submit loan requests.';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_onboarding_title VARCHAR(100) DEFAULT 'Onboarding Hub';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_onboarding_description TEXT DEFAULT 'Compose and send welcome emails to new team members. Manage recipients and track delivery.';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_mailbox_title VARCHAR(100) DEFAULT 'Functional Mailbox';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_mailbox_description TEXT DEFAULT 'Request a new functional mailbox for your team or project. Approval workflow included.';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_it_request_title VARCHAR(100) DEFAULT 'IT Onboarding Request';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_it_request_description TEXT DEFAULT 'Submit an IT onboarding request for new hires. Provide equipment and access requirements.';

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 025_offboarding_and_updates.sql
-- ═══════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- Migration 025: Offboarding tables + profile updates + role cleanup
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Add business_unit to profiles ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_unit VARCHAR(255) DEFAULT '';

-- ── 2. Remove 'manager' role: convert existing managers → user, update constraint ──
UPDATE profiles SET role = 'user' WHERE role = 'manager';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- ── 3. Update module_access to include offboarding ──
ALTER TABLE module_access DROP CONSTRAINT IF EXISTS module_access_module_key_check;
ALTER TABLE module_access ADD CONSTRAINT module_access_module_key_check
  CHECK (module_key IN ('catalog', 'onboarding', 'it_form', 'functional_mailbox', 'offboarding'));

-- ── 4. Offboarding processes ──
CREATE TABLE IF NOT EXISTS offboarding_processes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    it_request_id UUID REFERENCES it_requests(id) ON DELETE SET NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    personal_email VARCHAR(255) DEFAULT '',
    business_unit VARCHAR(255) DEFAULT '',
    departure_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    checklist JSONB DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Offboarding form fields (configurable checklist) ──
CREATE TABLE IF NOT EXISTS offboarding_form_fields (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL DEFAULT 'checkbox'
      CHECK (field_type IN ('text', 'textarea', 'select', 'multi_select', 'date', 'toggle', 'checkbox')),
    step VARCHAR(50) DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    placeholder VARCHAR(255) DEFAULT '',
    help_text TEXT DEFAULT '',
    options JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. RLS for offboarding tables ──
ALTER TABLE offboarding_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_form_fields ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_manage_offboarding" ON offboarding_processes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_manage_offboarding_fields" ON offboarding_form_fields
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── 7. Seed default offboarding checklist ──
INSERT INTO offboarding_form_fields (field_key, label, field_type, step, sort_order, is_active, help_text) VALUES
  ('departure_date', 'Last working day', 'date', 'general', 0, true, 'Employee''s final date'),
  ('revoke_email', 'Revoke email access', 'checkbox', 'access', 1, true, 'Disable corporate email account'),
  ('revoke_vpn', 'Revoke VPN access', 'checkbox', 'access', 2, true, 'Remove VPN credentials'),
  ('revoke_building', 'Revoke building access', 'checkbox', 'access', 3, true, 'Deactivate badge/access card'),
  ('collect_laptop', 'Collect laptop', 'checkbox', 'equipment', 4, true, 'Retrieve company laptop'),
  ('collect_phone', 'Collect mobile phone', 'checkbox', 'equipment', 5, true, 'Retrieve company phone'),
  ('collect_badge', 'Collect employee badge', 'checkbox', 'equipment', 6, true, 'Retrieve physical ID badge'),
  ('archive_files', 'Archive personal files', 'checkbox', 'data', 7, true, 'Backup and archive employee files'),
  ('transfer_projects', 'Transfer ongoing projects', 'checkbox', 'data', 8, true, 'Handover active projects'),
  ('remove_licenses', 'Remove software licenses', 'checkbox', 'data', 9, true, 'Revoke software subscriptions'),
  ('exit_interview', 'Schedule exit interview', 'checkbox', 'hr', 10, true, 'Coordinate with HR'),
  ('final_paycheck', 'Process final paycheck', 'checkbox', 'hr', 11, true, 'Ensure all payments settled')
ON CONFLICT DO NOTHING;

-- ── 8. Updated_at trigger for new tables ──
CREATE OR REPLACE FUNCTION update_offboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_offboarding_updated_at BEFORE UPDATE ON offboarding_processes
FOR EACH ROW EXECUTE FUNCTION update_offboarding_updated_at();

CREATE TRIGGER set_offboarding_fields_updated_at BEFORE UPDATE ON offboarding_form_fields
FOR EACH ROW EXECUTE FUNCTION update_offboarding_updated_at();

-- ═══════════════════════════════════════════════════════════
-- 026_profiles_delete_policy.sql
-- ═══════════════════════════════════════════════════════════
-- Add missing DELETE policy on profiles table so admins can delete users
CREATE POLICY "Admins can delete any profile" ON profiles
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Fix: loan_requests.user_id is ON DELETE SET NULL but NOT NULL — contradictory.
-- Allow NULL so deleted users' requests are preserved with user_id = NULL.
ALTER TABLE loan_requests ALTER COLUMN user_id DROP NOT NULL;

-- Fix: extension_requests.user_id has no ON DELETE action (defaults to RESTRICT).
-- Change to SET NULL so deleting a user doesn't block on extension_requests.
ALTER TABLE extension_requests DROP CONSTRAINT IF EXISTS extension_requests_user_id_fkey;
ALTER TABLE extension_requests
    ADD CONSTRAINT extension_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE extension_requests ALTER COLUMN user_id DROP NOT NULL;

-- Fix: it_requests.requested_by has no ON DELETE action (defaults to RESTRICT).
-- Change to SET NULL so deleting a user doesn't block on it_requests.
ALTER TABLE it_requests DROP CONSTRAINT IF EXISTS it_requests_requested_by_fkey;
ALTER TABLE it_requests
    ADD CONSTRAINT it_requests_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Fix: loan_requests.created_by has no ON DELETE action.
ALTER TABLE loan_requests DROP CONSTRAINT IF EXISTS loan_requests_created_by_fkey;
ALTER TABLE loan_requests
    ADD CONSTRAINT loan_requests_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Fix: loan_requests.approved_by has no ON DELETE action.
ALTER TABLE loan_requests DROP CONSTRAINT IF EXISTS loan_requests_approved_by_fkey;
ALTER TABLE loan_requests
    ADD CONSTRAINT loan_requests_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 027_functional_mailbox.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================================
-- 027 — Functional Mailbox Request: tables + form builder
-- ============================================================

-- ── Table: mailbox_requests ──
CREATE TABLE IF NOT EXISTS mailbox_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section 1: Functional Mailbox (general)
  project_name VARCHAR(255) NOT NULL,
  project_leader VARCHAR(255),
  agency VARCHAR(100),
  email_to_create VARCHAR(100),
  who_needs_access TEXT,
  creation_date DATE,

  -- Section 2: Signature
  display_name VARCHAR(255),
  signature_title VARCHAR(255),
  banner_url TEXT,
  links TEXT,
  more_info TEXT,

  -- Section 3: Email Management
  deleted_archived VARCHAR(50),

  -- Section 4: Requester (auto-filled from profile)
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requested_by_name VARCHAR(255),
  requested_on DATE DEFAULT CURRENT_DATE,
  requester_email VARCHAR(255),

  -- Admin management
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','completed','cancelled')),
  admin_notes TEXT,
  custom_fields JSONB DEFAULT '{}',

  -- Email tracking
  confirmation_email_sent BOOLEAN DEFAULT false,
  onepassword_link TEXT,
  archive_date DATE,
  deletion_date DATE,
  archive_reminder_sent BOOLEAN DEFAULT false,
  deletion_reminder_sent BOOLEAN DEFAULT false,
  archive_confirmed BOOLEAN DEFAULT false,
  deletion_confirmed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS for mailbox_requests ──
ALTER TABLE mailbox_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mailbox_requests_insert" ON mailbox_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "mailbox_requests_select" ON mailbox_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "mailbox_requests_admin_update" ON mailbox_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "mailbox_requests_admin_delete" ON mailbox_requests
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_mailbox_requests_updated_at
  BEFORE UPDATE ON mailbox_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Table: mailbox_form_fields ──
CREATE TABLE IF NOT EXISTS mailbox_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(30) NOT NULL CHECK (field_type IN (
    'text', 'select', 'multi_select', 'date', 'checkbox', 'toggle', 'textarea', 'file'
  )),
  step VARCHAR(30) NOT NULL DEFAULT 'additional' CHECK (step IN (
    'general', 'signature', 'management', 'requester', 'additional'
  )),
  placeholder VARCHAR(255) DEFAULT '',
  help_text VARCHAR(500) DEFAULT '',
  is_required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]',

  -- Conditional logic
  condition_field VARCHAR(100) DEFAULT NULL,
  condition_operator VARCHAR(20) DEFAULT NULL CHECK (condition_operator IS NULL OR condition_operator IN (
    'equals', 'not_equals', 'contains', 'is_true', 'is_false'
  )),
  condition_value TEXT DEFAULT NULL,

  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS for mailbox_form_fields ──
ALTER TABLE mailbox_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mailbox_form_fields_select" ON mailbox_form_fields
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mailbox_form_fields_admin_insert" ON mailbox_form_fields
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "mailbox_form_fields_admin_update" ON mailbox_form_fields
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "mailbox_form_fields_admin_delete" ON mailbox_form_fields
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ── Seed 14 system fields ──
INSERT INTO mailbox_form_fields (field_key, label, field_type, step, placeholder, help_text, is_required, options, sort_order, is_system) VALUES
  -- Section 1: Functional Mailbox (general)
  ('project_name',       'Project Name',           'text',     'general',    '',                  '',                                      true,  '[]', 10, true),
  ('project_leader',     'Project Leader',         'text',     'general',    '',                  '',                                      true,  '[]', 20, true),
  ('agency',             'Agency',                 'select',   'general',    '',                  '',                                      true,  '["MAX","SIGN","THE LITTLE VOICE","VO EUROPE"]', 30, true),
  ('email_to_create',    'Email to be Created',    'text',     'general',    '',                  '20 character max before the @',         true,  '[]', 40, true),
  ('who_needs_access',   'Who Needs Access?',      'textarea', 'general',    '',                  'List people who need access to this mailbox', true, '[]', 50, true),
  ('creation_date',      'To be Created On',       'date',     'general',    '',                  '',                                      true,  '[]', 60, true),

  -- Section 2: Signature
  ('display_name',       'Display Name',           'text',     'signature',  '',                  'Will appear as the sender',             true,  '[]', 70, true),
  ('signature_title',    'Title',                  'text',     'signature',  '',                  'e.g. secretariat team',                 true,  '[]', 80, true),
  ('banner_social_icons','Banner or Social Icons', 'file',     'signature',  '',                  'Max 10MB',                              false, '[]', 90, true),
  ('links',              'Links',                  'text',     'signature',  '',                  '',                                      false, '[]', 100, true),
  ('more_info',          'More Info, Disclaimer, etc', 'textarea', 'signature', '', '',           false, '[]', 110, true),

  -- Section 3: Email Management
  ('deleted_archived',   'Deleted / Archived',     'select',   'management', '',                  '',                                      true,  '["ARCHIVE & DELETE","DELETED only"]', 120, true),

  -- Section 4: Requested By (auto-filled)
  ('first_name',         'First Name',             'text',     'requester',  '',                  '',                                      true,  '[]', 130, true),
  ('last_name',          'Last Name',              'text',     'requester',  '',                  '',                                      true,  '[]', 140, true),
  ('mail',               'Mail',                   'text',     'requester',  '',                  '',                                      true,  '[]', 150, true)
ON CONFLICT (field_key) DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 028_mailbox_email_improvements.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================================
-- 028 — Functional Mailbox: email draft, template persistence,
--       archive/deletion date form fields
-- ============================================================

-- ── 1. Add archive_date & deletion_date as system form fields ──
INSERT INTO mailbox_form_fields
  (field_key, label, field_type, step, placeholder, help_text, is_required, options, sort_order, is_system, condition_field, condition_operator, condition_value)
VALUES
  ('archive_date',  'Archive Date',  'date', 'management', '', 'When should the mailbox be archived?',  true, '[]', 122, true, 'deleted_archived', 'equals',   'ARCHIVE & DELETE'),
  ('deletion_date', 'Deletion Date', 'date', 'management', '', 'When should the mailbox be deleted?', true, '[]', 124, true, 'deleted_archived', 'contains', 'DELETE')
ON CONFLICT (field_key) DO NOTHING;

-- ── 2. Email draft columns on mailbox_requests ──
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_subject TEXT;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_body    TEXT;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_to      TEXT;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_cc      TEXT;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS email_draft_onepassword TEXT;

-- ── 3. Global email template on app_settings ──
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS mailbox_email_template TEXT;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 029_email_tags_field.sql
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- 030_auto_cleanup_old_requests.sql
-- ═══════════════════════════════════════════════════════════
-- 030: Auto-cleanup old completed/rejected requests
-- Completed requests → deleted after 6 months
-- Rejected requests  → deleted after 3 months
-- Runs daily via pg_cron

-- 1. Enable pg_cron (Supabase has it available but it must be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required by Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- 2. Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_loans     INT := 0;
  deleted_it        INT := 0;
  deleted_mailbox   INT := 0;
BEGIN
  -- ── Loan / Catalog requests ──
  WITH d AS (
    DELETE FROM loan_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_loans FROM d;

  -- ── IT requests ──
  WITH d AS (
    DELETE FROM it_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_it FROM d;

  -- ── Mailbox requests ──
  WITH d AS (
    DELETE FROM mailbox_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_mailbox FROM d;

  -- Log the result
  RAISE LOG 'cleanup_old_requests: deleted % loans, % IT, % mailbox requests',
    deleted_loans, deleted_it, deleted_mailbox;
END;
$$;

-- 3. Schedule the cleanup to run every day at 03:00 UTC
SELECT cron.schedule(
  'cleanup-old-requests',     -- job name
  '0 3 * * *',                -- cron expression: daily at 03:00 UTC
  $$SELECT cleanup_old_requests()$$
);

-- ═══════════════════════════════════════════════════════════
-- 031_security_fixes.sql
-- ═══════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- Migration 031: Security Fixes
-- Addresses Supabase Security Advisor warnings:
--   1. SECURITY DEFINER functions without search_path (Auth Leak)
--   2. Overly permissive INSERT policies (RLS Bypass)
--   3. Views without security_invoker (Insecure Views)
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. FIX: SECURITY DEFINER functions — add SET search_path = ''
--    Without a fixed search_path, a malicious actor could
--    hijack function behavior via search_path manipulation.
--    All table references must be fully qualified (public.xxx).
-- ═══════════════════════════════════════════════════════════════

-- 1a. handle_new_user() — Creates profile on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, azure_oid, department, job_title, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name', ''),
    new.raw_user_meta_data->>'oid',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'jobTitle',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.profiles.last_name),
    azure_oid = COALESCE(EXCLUDED.azure_oid, public.profiles.azure_oid),
    department = COALESCE(EXCLUDED.department, public.profiles.department),
    job_title = COALESCE(EXCLUDED.job_title, public.profiles.job_title),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1b. notify_request_status_change() — Notifies user on status change
CREATE OR REPLACE FUNCTION public.notify_request_status_change()
RETURNS trigger AS $$
DECLARE
  v_title text;
  v_message text;
  v_link text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_link := '/requests/' || NEW.id;

  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'Request Approved';
      v_message := 'Your request "' || NEW.project_name || '" has been approved. You can pick up your equipment.';
    WHEN 'rejected' THEN
      v_title := 'Request Rejected';
      v_message := 'Your request "' || NEW.project_name || '" has been rejected.';
      IF NEW.rejection_reason IS NOT NULL THEN
        v_message := v_message || ' Reason: ' || NEW.rejection_reason;
      END IF;
    WHEN 'picked_up' THEN
      v_title := 'Equipment Picked Up';
      v_message := 'Equipment for "' || NEW.project_name || '" has been marked as picked up.';
    WHEN 'returned' THEN
      v_title := 'Equipment Returned';
      v_message := 'Equipment for "' || NEW.project_name || '" has been marked as returned.';
    WHEN 'closed' THEN
      v_title := 'Request Closed';
      v_message := 'Your request "' || NEW.project_name || '" has been closed.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (NEW.user_id, 'request_status', v_title, v_message, v_link);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1c. notify_new_request() — Notifies admins on new request
CREATE OR REPLACE FUNCTION public.notify_new_request()
RETURNS trigger AS $$
DECLARE
  v_admin record;
  v_requester_name text;
BEGIN
  SELECT first_name || ' ' || last_name INTO v_requester_name
  FROM public.profiles WHERE id = NEW.user_id;

  FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      v_admin.id,
      'new_request',
      'New Equipment Request',
      v_requester_name || ' submitted a request for "' || NEW.project_name || '".',
      '/admin/requests/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1d. cleanup_old_requests() — Scheduled daily cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_loans     INT := 0;
  deleted_it        INT := 0;
  deleted_mailbox   INT := 0;
BEGIN
  WITH d AS (
    DELETE FROM public.loan_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_loans FROM d;

  WITH d AS (
    DELETE FROM public.it_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_it FROM d;

  WITH d AS (
    DELETE FROM public.mailbox_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_mailbox FROM d;

  RAISE LOG 'cleanup_old_requests: deleted % loans, % IT, % mailbox requests',
    deleted_loans, deleted_it, deleted_mailbox;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 2. FIX: Overly permissive INSERT policies
--    WITH CHECK (true) on INSERT allows any authenticated user
--    to create rows for OTHER users (e.g., fake notifications,
--    fake audit logs). Triggers use SECURITY DEFINER and bypass
--    RLS, so restricting these policies does not affect triggers.
-- ═══════════════════════════════════════════════════════════════

-- 2a. Notifications: restrict INSERT to own user_id only
--     Trigger-based inserts bypass RLS (SECURITY DEFINER).
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2b. Audit logs: restrict INSERT to admins only via API
--     Trigger-based inserts bypass RLS (SECURITY DEFINER).
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;
CREATE POLICY "Admins can create audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2c. Mailbox requests: verify requester identity
DROP POLICY IF EXISTS "mailbox_requests_insert" ON public.mailbox_requests;
CREATE POLICY "mailbox_requests_insert" ON public.mailbox_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2d. IT requests: verify requester identity
DROP POLICY IF EXISTS "Users can create IT requests" ON public.it_requests;
CREATE POLICY "Users can create IT requests" ON public.it_requests
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ═══════════════════════════════════════════════════════════════
-- 3. FIX: Views without security_invoker = true
--    By default, views execute with the view owner's permissions
--    (SECURITY DEFINER), bypassing RLS on underlying tables.
--    Setting security_invoker = true ensures the calling user's
--    RLS policies are enforced.
--    Requires PostgreSQL 15+ (Supabase uses PG 15+).
-- ═══════════════════════════════════════════════════════════════

ALTER VIEW public.products_with_category SET (security_invoker = true);
ALTER VIEW public.loans_with_details SET (security_invoker = true);
ALTER VIEW public.loan_requests_with_details SET (security_invoker = true);
ALTER VIEW public.loan_request_items_with_details SET (security_invoker = true);
ALTER VIEW public.extension_requests_with_details SET (security_invoker = true);


-- ═══════════════════════════════════════════════════════════════
-- 4. FIX: Require authentication for locations SELECT
--    Locations contain internal office addresses and should not
--    be accessible without authentication.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Locations are viewable by everyone" ON public.locations;
CREATE POLICY "Locations are viewable by authenticated users" ON public.locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ═══════════════════════════════════════════════════════════════
-- 5. FIX: Revoke public execute on functions
--    By default, PostgreSQL grants EXECUTE to PUBLIC on all
--    functions. Restrict sensitive functions to authenticated.
-- ═══════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_request_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_request() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_requests() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_available_stock(UUID, DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_available_stock_v2(UUID, DATE, DATE, UUID) FROM PUBLIC;

-- Grant back to postgres (superuser) and authenticated role
GRANT EXECUTE ON FUNCTION public.get_available_stock(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_stock_v2(UUID, DATE, DATE, UUID) TO authenticated;


-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 032_user_invitations.sql
-- ═══════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- Migration 032: User Invitations
-- Allows admins to invite new users by email.
-- On first Microsoft SSO login, the post-login logic checks
-- for pending invitations and auto-grants all module access.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) DEFAULT '',
    last_name VARCHAR(255) DEFAULT '',
    business_unit VARCHAR(255) DEFAULT '',
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one pending invitation per email
CREATE UNIQUE INDEX idx_user_invitations_email_pending
  ON user_invitations(email) WHERE status = 'pending';

-- Lookup by token (for future use)
CREATE INDEX idx_user_invitations_token ON user_invitations(token);

-- Updated_at trigger
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage invitations" ON user_invitations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Authenticated users can read their own invitation (matched by email)
CREATE POLICY "Users can view own invitations" ON user_invitations
    FOR SELECT USING (
        lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
    );

-- Authenticated users can accept their own invitation
CREATE POLICY "Users can accept own invitations" ON user_invitations
    FOR UPDATE USING (
        lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        status = 'accepted'
    );

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 033_onboarding_template_save_and_invitation_editor.sql
-- ═══════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════
-- Migration 033: Onboarding Template Save + Invitation Email Editor
-- 1. Add default_enabled to onboarding_block_templates
-- 2. Add email columns to user_invitations for draft/preview support
-- 3. Seed a default user_invitation email template
-- ═══════════════════════════════════════════════════════════════

-- 1. Allow blocks to be disabled by default in the template
ALTER TABLE onboarding_block_templates
  ADD COLUMN IF NOT EXISTS default_enabled BOOLEAN DEFAULT true;

-- 2. Add email draft columns to user_invitations
ALTER TABLE user_invitations
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_body TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- 3. Seed the invitation email template
INSERT INTO email_templates (template_key, name, subject, body, description, variables, format, is_active)
VALUES (
    'user_invitation',
    'User Invitation',
    'You''re invited to join {{app_name}}',
    E'Dear {{first_name}},\n\nYou''ve been invited to join {{app_name}}! Click the button below to sign in with your Microsoft account and get started.\n\n<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0;"><a href="{{login_url}}" style="display:inline-block;padding:14px 32px;border-radius:8px;background:linear-gradient(135deg,#f97316,#06b6d4);color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">Get Started</a></td></tr></table>\n\nYou''ll have access to all platform features once you sign in.\n\nBest regards,\nThe {{app_name}} Team',
    'Sent when an admin invites a new user to the platform',
    ARRAY['first_name', 'last_name', 'app_name', 'login_url'],
    'html',
    true
)
ON CONFLICT (template_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 034_qr_inventory_system.sql
-- ═══════════════════════════════════════════════════════════
-- ================================================================
-- QR CODE INVENTORY SYSTEM
-- Migration: 034_qr_inventory_system.sql
-- Description: Adds QR code scanning for automated stock management
-- ================================================================

-- ============================================
-- TABLES
-- ============================================

-- Kits table: groups of items that share a single QR code
CREATE TABLE IF NOT EXISTS qr_kits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reference VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR codes table: each QR code is linked to a product (or a kit)
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,          -- The unique QR code value
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    kit_id UUID REFERENCES qr_kits(id) ON DELETE SET NULL,
    label VARCHAR(255),                          -- Human-readable label
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kit items table: products that belong to a kit
CREATE TABLE IF NOT EXISTS qr_kit_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kit_id UUID REFERENCES qr_kits(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(kit_id, product_id)
);

-- Scan logs table: full audit trail of every scan action
CREATE TABLE IF NOT EXISTS qr_scan_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
    qr_code VARCHAR(100) NOT NULL,              -- Denormalized for history
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    kit_id UUID REFERENCES qr_kits(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_email VARCHAR(255),                     -- Denormalized for history
    user_name VARCHAR(255),                      -- Denormalized for history
    action VARCHAR(10) NOT NULL CHECK (action IN ('take', 'deposit')),
    quantity_changed INTEGER NOT NULL DEFAULT 1,
    stock_before INTEGER,
    stock_after INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_qr_codes_product ON qr_codes(product_id);
CREATE INDEX idx_qr_codes_kit ON qr_codes(kit_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_qr_kit_items_kit ON qr_kit_items(kit_id);
CREATE INDEX idx_qr_kit_items_product ON qr_kit_items(product_id);
CREATE INDEX idx_qr_scan_logs_qr_code ON qr_scan_logs(qr_code_id);
CREATE INDEX idx_qr_scan_logs_product ON qr_scan_logs(product_id);
CREATE INDEX idx_qr_scan_logs_user ON qr_scan_logs(user_id);
CREATE INDEX idx_qr_scan_logs_action ON qr_scan_logs(action);
CREATE INDEX idx_qr_scan_logs_created ON qr_scan_logs(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_qr_kits_updated_at
    BEFORE UPDATE ON qr_kits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_qr_codes_updated_at
    BEFORE UPDATE ON qr_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW qr_codes_with_details AS
SELECT
    qc.id,
    qc.code,
    qc.label,
    qc.is_active,
    qc.product_id,
    qc.kit_id,
    qc.created_at,
    qc.updated_at,
    p.name AS product_name,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    c.name AS category_name,
    c.color AS category_color,
    k.name AS kit_name,
    k.reference AS kit_reference
FROM qr_codes qc
JOIN products p ON qc.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN qr_kits k ON qc.kit_id = k.id
ORDER BY qc.created_at DESC;

CREATE OR REPLACE VIEW qr_scan_logs_with_details AS
SELECT
    sl.id,
    sl.qr_code,
    sl.action,
    sl.quantity_changed,
    sl.stock_before,
    sl.stock_after,
    sl.notes,
    sl.created_at,
    sl.user_email,
    sl.user_name,
    sl.product_id,
    sl.kit_id,
    sl.qr_code_id,
    sl.user_id,
    p.name AS product_name,
    p.image_url AS product_image,
    c.name AS category_name,
    c.color AS category_color,
    k.name AS kit_name
FROM qr_scan_logs sl
LEFT JOIN products p ON sl.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN qr_kits k ON sl.kit_id = k.id
ORDER BY sl.created_at DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: process a QR scan (take or deposit)
-- Atomically updates stock and creates a log entry
CREATE OR REPLACE FUNCTION process_qr_scan(
    p_qr_code VARCHAR,
    p_action VARCHAR,
    p_user_id UUID,
    p_user_email VARCHAR DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_qr_record RECORD;
    v_product RECORD;
    v_stock_before INTEGER;
    v_stock_after INTEGER;
    v_kit_items RECORD;
    v_log_id UUID;
BEGIN
    -- Find the QR code
    SELECT qc.*, p.name AS product_name, p.total_stock, p.image_url,
           k.name AS kit_name, k.reference AS kit_reference
    INTO v_qr_record
    FROM qr_codes qc
    JOIN products p ON qc.product_id = p.id
    LEFT JOIN qr_kits k ON qc.kit_id = k.id
    WHERE qc.code = p_qr_code AND qc.is_active = TRUE;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR code not found or inactive'
        );
    END IF;

    -- Get current stock
    v_stock_before := v_qr_record.total_stock;

    -- Validate action
    IF p_action = 'take' AND v_stock_before <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Out of stock',
            'product_name', v_qr_record.product_name,
            'current_stock', v_stock_before
        );
    END IF;

    -- Calculate new stock
    IF p_action = 'take' THEN
        v_stock_after := v_stock_before - 1;
    ELSIF p_action = 'deposit' THEN
        v_stock_after := v_stock_before + 1;
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid action. Must be "take" or "deposit".'
        );
    END IF;

    -- Update product stock
    UPDATE products SET total_stock = v_stock_after WHERE id = v_qr_record.product_id;

    -- If this is a kit, also update stock for all kit items
    IF v_qr_record.kit_id IS NOT NULL THEN
        FOR v_kit_items IN
            SELECT product_id, quantity FROM qr_kit_items
            WHERE kit_id = v_qr_record.kit_id AND product_id != v_qr_record.product_id
        LOOP
            IF p_action = 'take' THEN
                UPDATE products SET total_stock = GREATEST(total_stock - v_kit_items.quantity, 0)
                WHERE id = v_kit_items.product_id;
            ELSE
                UPDATE products SET total_stock = total_stock + v_kit_items.quantity
                WHERE id = v_kit_items.product_id;
            END IF;
        END LOOP;
    END IF;

    -- Create scan log
    INSERT INTO qr_scan_logs (
        qr_code_id, qr_code, product_id, kit_id,
        user_id, user_email, user_name,
        action, quantity_changed, stock_before, stock_after, notes
    ) VALUES (
        v_qr_record.id, p_qr_code, v_qr_record.product_id, v_qr_record.kit_id,
        p_user_id, p_user_email, p_user_name,
        p_action, 1, v_stock_before, v_stock_after, p_notes
    ) RETURNING id INTO v_log_id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'log_id', v_log_id,
        'product_name', v_qr_record.product_name,
        'product_image', v_qr_record.image_url,
        'kit_name', v_qr_record.kit_name,
        'action', p_action,
        'stock_before', v_stock_before,
        'stock_after', v_stock_after
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE qr_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_kit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;

-- QR Kits: readable by authenticated, modifiable by admins
CREATE POLICY "QR kits are viewable by authenticated users" ON qr_kits
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify QR kits" ON qr_kits
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- QR Codes: readable by authenticated, modifiable by admins
CREATE POLICY "QR codes are viewable by authenticated users" ON qr_codes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify QR codes" ON qr_codes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- QR Kit Items: readable by authenticated, modifiable by admins
CREATE POLICY "QR kit items are viewable by authenticated users" ON qr_kit_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify QR kit items" ON qr_kit_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Scan Logs: readable by authenticated, insertable by authenticated (via function)
CREATE POLICY "Scan logs are viewable by authenticated users" ON qr_scan_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create scan logs" ON qr_scan_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════
-- 035_qr_test_seed_data.sql
-- ═══════════════════════════════════════════════════════════
-- ================================================================
-- QR CODE TEST DATA SEED
-- Run this in Supabase SQL Editor to create test products,
-- QR codes, and kits for testing the QR inventory system.
-- ================================================================

-- ============================================
-- 1. TEST PRODUCT: iPhone 20 Pro Max
-- ============================================

INSERT INTO products (name, description, category_id, image_url, total_stock, includes, has_accessories, has_subscription, has_apps)
VALUES (
  'iPhone 20 Pro Max',
  'Apple A20 Bionic chip, 512GB, Titanium — QR Test Product',
  (SELECT id FROM categories WHERE name = 'iPhone'),
  'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=300&fit=crop',
  10,
  ARRAY['USB-C Charger', 'SIM Eject Tool'],
  true,
  true,
  true
);

-- ============================================
-- 2. KITS — Logical groups (product + accessories)
-- ============================================

-- Kit: iPhone (phone + charger)
INSERT INTO qr_kits (reference, name, description) VALUES
  ('KIT-IPHONE', 'iPhone Kit', 'iPhone + USB-C Charger — do not separate'),
  ('KIT-ROUTER', 'Router Kit', '5G Router + Power adapter + Ethernet cable'),
  ('KIT-MAC', 'MacBook Kit', 'MacBook + Charger + USB-C dongle'),
  ('KIT-PC', 'PC Kit', 'Laptop + Charger + Docking station'),
  ('KIT-SCREEN', 'Screen Kit', 'Monitor + HDMI cable + Power cable'),
  ('KIT-TABLET', 'Tablet Kit', 'Tablet + Charger + Stylus');

-- Link kit items: each kit → its products
-- iPhone Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-IPHONE' AND p.name = 'iPhone 20 Pro Max';

-- Router Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-ROUTER' AND p.name = '5G Mobile Router';

-- Mac Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-MAC' AND p.name = 'MacBook Pro 14"';

-- PC Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-PC' AND p.name = 'Dell Latitude 5540';

-- Screen Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-SCREEN' AND p.name = 'Dell 27" Monitor';

-- Tablet Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-TABLET' AND p.name = 'iPad Pro 11"';

-- ============================================
-- 3. QR CODES — One per product (with kit link where applicable)
-- ============================================

-- iPhone 20 Pro Max (test product) — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-IPHONE20-001', p.id, k.id, 'iPhone 20 Pro Max #1', true
FROM products p, qr_kits k
WHERE p.name = 'iPhone 20 Pro Max' AND k.reference = 'KIT-IPHONE';

-- iPhone 15 Pro — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-IPHONE15-001', p.id, k.id, 'iPhone 15 Pro #1', true
FROM products p, qr_kits k
WHERE p.name = 'iPhone 15 Pro' AND k.reference = 'KIT-IPHONE';

-- 5G Mobile Router — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-ROUTER5G-001', p.id, k.id, '5G Router #1', true
FROM products p, qr_kits k
WHERE p.name = '5G Mobile Router' AND k.reference = 'KIT-ROUTER';

-- MacBook Pro — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-MACPRO14-001', p.id, k.id, 'MacBook Pro 14" #1', true
FROM products p, qr_kits k
WHERE p.name = 'MacBook Pro 14"' AND k.reference = 'KIT-MAC';

-- Dell Latitude — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-DELL5540-001', p.id, k.id, 'Dell Latitude 5540 #1', true
FROM products p, qr_kits k
WHERE p.name = 'Dell Latitude 5540' AND k.reference = 'KIT-PC';

-- Dell Monitor — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-SCREEN27-001', p.id, k.id, 'Dell 27" Monitor #1', true
FROM products p, qr_kits k
WHERE p.name = 'Dell 27" Monitor' AND k.reference = 'KIT-SCREEN';

-- iPad Pro — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-IPADPRO-001', p.id, k.id, 'iPad Pro 11" #1', true
FROM products p, qr_kits k
WHERE p.name = 'iPad Pro 11"' AND k.reference = 'KIT-TABLET';

-- HP Printer — NO kit (standalone, boîte simple)
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-PRINTER-001', p.id, NULL, 'HP LaserJet Pro #1', true
FROM products p
WHERE p.name = 'HP LaserJet Pro';

-- Accessories — NO kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-CLICKER-001', p.id, NULL, 'Presentation Clicker #1', true
FROM products p
WHERE p.name = 'Presentation Clicker';

-- ═══════════════════════════════════════════════════════════
-- 036_qr_vo_convention_and_iphone20.sql
-- ═══════════════════════════════════════════════════════════
-- ================================================================
-- QR CODE CONVENTION UPDATE + iPhone 20 Test Product
-- Migration: 036_qr_vo_convention_and_iphone20.sql
-- Convention: All QR codes start with "VO-" followed by product name
-- ================================================================

-- ============================================
-- 1. NEW TEST PRODUCT: iPhone 20
-- ============================================

INSERT INTO products (name, description, category_id, image_url, total_stock, includes, has_accessories, has_subscription, has_apps)
VALUES (
  'iPhone 20',
  'Apple A20 chip, 256GB, Dynamic Island, USB-C, Ceramic Shield',
  (SELECT id FROM categories WHERE name = 'iPhone'),
  'https://images.unsplash.com/photo-1710023038911-454587904706?w=400&h=300&fit=crop',
  5,
  ARRAY['USB-C Charger', 'USB-C Cable', 'SIM Eject Tool'],
  true,
  true,
  true
);

-- Add iPhone 20 to the iPhone Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-IPHONE' AND p.name = 'iPhone 20';

-- ============================================
-- 2. MIGRATE QR CODES TO VO- CONVENTION
-- ============================================

-- Update existing QR codes to VO- prefix
UPDATE qr_codes SET code = 'VO-IPHONE20PROMAX-001' WHERE code = 'EQ-IPHONE20-001';
UPDATE qr_codes SET code = 'VO-IPHONE15PRO-001'    WHERE code = 'EQ-IPHONE15-001';
UPDATE qr_codes SET code = 'VO-ROUTER5G-001'       WHERE code = 'EQ-ROUTER5G-001';
UPDATE qr_codes SET code = 'VO-MACBOOKPRO14-001'   WHERE code = 'EQ-MACPRO14-001';
UPDATE qr_codes SET code = 'VO-DELLLATITUDE-001'   WHERE code = 'EQ-DELL5540-001';
UPDATE qr_codes SET code = 'VO-DELLMONITOR27-001'  WHERE code = 'EQ-SCREEN27-001';
UPDATE qr_codes SET code = 'VO-IPADPRO11-001'      WHERE code = 'EQ-IPADPRO-001';
UPDATE qr_codes SET code = 'VO-HPLASERJET-001'     WHERE code = 'EQ-PRINTER-001';
UPDATE qr_codes SET code = 'VO-CLICKER-001'        WHERE code = 'EQ-CLICKER-001';

-- Also update any scan logs that reference old codes
UPDATE qr_scan_logs SET qr_code = 'VO-IPHONE20PROMAX-001' WHERE qr_code = 'EQ-IPHONE20-001';
UPDATE qr_scan_logs SET qr_code = 'VO-IPHONE15PRO-001'    WHERE qr_code = 'EQ-IPHONE15-001';
UPDATE qr_scan_logs SET qr_code = 'VO-ROUTER5G-001'       WHERE qr_code = 'EQ-ROUTER5G-001';
UPDATE qr_scan_logs SET qr_code = 'VO-MACBOOKPRO14-001'   WHERE qr_code = 'EQ-MACPRO14-001';
UPDATE qr_scan_logs SET qr_code = 'VO-DELLLATITUDE-001'   WHERE qr_code = 'EQ-DELL5540-001';
UPDATE qr_scan_logs SET qr_code = 'VO-DELLMONITOR27-001'  WHERE qr_code = 'EQ-SCREEN27-001';
UPDATE qr_scan_logs SET qr_code = 'VO-IPADPRO11-001'      WHERE qr_code = 'EQ-IPADPRO-001';
UPDATE qr_scan_logs SET qr_code = 'VO-HPLASERJET-001'     WHERE qr_code = 'EQ-PRINTER-001';
UPDATE qr_scan_logs SET qr_code = 'VO-CLICKER-001'        WHERE qr_code = 'EQ-CLICKER-001';

-- ============================================
-- 3. NEW QR CODE: iPhone 20 (VO- convention)
-- ============================================

INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'VO-IPHONE20-001', p.id, k.id, 'iPhone 20 #1', true
FROM products p, qr_kits k
WHERE p.name = 'iPhone 20' AND k.reference = 'KIT-IPHONE';

-- ═══════════════════════════════════════════════════════════
-- 037_qr_scan_dates.sql
-- ═══════════════════════════════════════════════════════════
-- ================================================================
-- QR SCAN: Add pickup/return date tracking
-- Migration: 037_qr_scan_dates.sql
-- ================================================================

-- Add date columns to scan logs
ALTER TABLE qr_scan_logs ADD COLUMN IF NOT EXISTS pickup_date DATE;
ALTER TABLE qr_scan_logs ADD COLUMN IF NOT EXISTS expected_return_date DATE;
ALTER TABLE qr_scan_logs ADD COLUMN IF NOT EXISTS actual_return_date DATE;

-- Update the process_qr_scan function to accept dates
CREATE OR REPLACE FUNCTION process_qr_scan(
    p_qr_code VARCHAR,
    p_action VARCHAR,
    p_user_id UUID,
    p_user_email VARCHAR DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_pickup_date DATE DEFAULT NULL,
    p_expected_return_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_qr_record RECORD;
    v_stock_before INTEGER;
    v_stock_after INTEGER;
    v_kit_items RECORD;
    v_log_id UUID;
BEGIN
    -- Find the QR code
    SELECT qc.*, p.name AS product_name, p.total_stock, p.image_url,
           k.name AS kit_name, k.reference AS kit_reference
    INTO v_qr_record
    FROM qr_codes qc
    JOIN products p ON qc.product_id = p.id
    LEFT JOIN qr_kits k ON qc.kit_id = k.id
    WHERE qc.code = p_qr_code AND qc.is_active = TRUE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'QR code not found or inactive');
    END IF;

    v_stock_before := v_qr_record.total_stock;

    IF p_action = 'take' AND v_stock_before <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Out of stock',
            'product_name', v_qr_record.product_name, 'current_stock', v_stock_before);
    END IF;

    IF p_action = 'take' THEN
        v_stock_after := v_stock_before - 1;
    ELSIF p_action = 'deposit' THEN
        v_stock_after := v_stock_before + 1;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid action');
    END IF;

    -- Update product stock
    UPDATE products SET total_stock = v_stock_after WHERE id = v_qr_record.product_id;

    -- Kit stock sync
    IF v_qr_record.kit_id IS NOT NULL THEN
        FOR v_kit_items IN
            SELECT product_id, quantity FROM qr_kit_items
            WHERE kit_id = v_qr_record.kit_id AND product_id != v_qr_record.product_id
        LOOP
            IF p_action = 'take' THEN
                UPDATE products SET total_stock = GREATEST(total_stock - v_kit_items.quantity, 0)
                WHERE id = v_kit_items.product_id;
            ELSE
                UPDATE products SET total_stock = total_stock + v_kit_items.quantity
                WHERE id = v_kit_items.product_id;
            END IF;
        END LOOP;
    END IF;

    -- Create scan log with dates
    INSERT INTO qr_scan_logs (
        qr_code_id, qr_code, product_id, kit_id,
        user_id, user_email, user_name,
        action, quantity_changed, stock_before, stock_after, notes,
        pickup_date, expected_return_date,
        actual_return_date
    ) VALUES (
        v_qr_record.id, p_qr_code, v_qr_record.product_id, v_qr_record.kit_id,
        p_user_id, p_user_email, p_user_name,
        p_action, 1, v_stock_before, v_stock_after, p_notes,
        CASE WHEN p_action = 'take' THEN COALESCE(p_pickup_date, CURRENT_DATE) ELSE NULL END,
        CASE WHEN p_action = 'take' THEN p_expected_return_date ELSE NULL END,
        CASE WHEN p_action = 'deposit' THEN CURRENT_DATE ELSE NULL END
    ) RETURNING id INTO v_log_id;

    RETURN json_build_object(
        'success', true,
        'log_id', v_log_id,
        'product_name', v_qr_record.product_name,
        'product_image', v_qr_record.image_url,
        'kit_name', v_qr_record.kit_name,
        'action', p_action,
        'stock_before', v_stock_before,
        'stock_after', v_stock_after
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update view to include dates
CREATE OR REPLACE VIEW qr_scan_logs_with_details AS
SELECT
    sl.id, sl.qr_code, sl.action, sl.quantity_changed,
    sl.stock_before, sl.stock_after, sl.notes, sl.created_at,
    sl.user_email, sl.user_name, sl.product_id, sl.kit_id,
    sl.qr_code_id, sl.user_id,
    sl.pickup_date, sl.expected_return_date, sl.actual_return_date,
    p.name AS product_name, p.image_url AS product_image,
    c.name AS category_name, c.color AS category_color,
    k.name AS kit_name
FROM qr_scan_logs sl
LEFT JOIN products p ON sl.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN qr_kits k ON sl.kit_id = k.id
ORDER BY sl.created_at DESC;

-- ═══════════════════════════════════════════════════════════
-- 038_reminder_notification.sql
-- ═══════════════════════════════════════════════════════════
-- ================================================================
-- REMINDER NOTIFICATIONS
-- Migration: 038_reminder_notification.sql
-- Adds a table to track sent reminders (avoid duplicates)
-- ================================================================

CREATE TABLE IF NOT EXISTS qr_reminders_sent (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scan_log_id UUID REFERENCES qr_scan_logs(id) ON DELETE CASCADE NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- 'day_before', 'overdue_1d', 'overdue_3d'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_to VARCHAR(255),
    UNIQUE(scan_log_id, reminder_type)
);

ALTER TABLE qr_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reminders" ON qr_reminders_sent
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert reminders" ON qr_reminders_sent
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- View: items due for return tomorrow that haven't been reminded yet
CREATE OR REPLACE VIEW qr_upcoming_returns_unremnded AS
SELECT sl.*,
    p.name AS product_name,
    p.image_url AS product_image
FROM qr_scan_logs sl
JOIN products p ON sl.product_id = p.id
WHERE sl.action = 'take'
  AND sl.expected_return_date = CURRENT_DATE + 1
  AND NOT EXISTS (
    SELECT 1 FROM qr_reminders_sent r
    WHERE r.scan_log_id = sl.id AND r.reminder_type = 'day_before'
  );

-- ═══════════════════════════════════════════════════════════
-- 039_lost_mode_reservations_alerts.sql
-- ═══════════════════════════════════════════════════════════
-- ================================================================
-- LOST MODE + RESERVATIONS + STOCK ALERTS
-- Migration: 039_lost_mode_reservations_alerts.sql
-- ================================================================

-- ============================================
-- 1. LOST MODE
-- ============================================

-- Add lost status to scan logs
ALTER TABLE qr_scan_logs
  ADD COLUMN IF NOT EXISTS is_lost BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lost_reported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lost_resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lost_notes TEXT;

-- ============================================
-- 2. EQUIPMENT RESERVATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS qr_reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    reserved_date DATE NOT NULL,
    pickup_by DATE NOT NULL,  -- must scan pickup by this date or reservation expires
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'picked_up', 'expired', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_reservations_product ON qr_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_qr_reservations_user ON qr_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_reservations_date ON qr_reservations(reserved_date);
CREATE INDEX IF NOT EXISTS idx_qr_reservations_status ON qr_reservations(status);

ALTER TABLE qr_reservations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_reservations' AND policyname='Reservations viewable by authenticated') THEN
    CREATE POLICY "Reservations viewable by authenticated" ON qr_reservations FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_reservations' AND policyname='Users can create reservations') THEN
    CREATE POLICY "Users can create reservations" ON qr_reservations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_reservations' AND policyname='Users can update own reservations') THEN
    CREATE POLICY "Users can update own reservations" ON qr_reservations FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_reservations' AND policyname='Admins can manage all reservations') THEN
    CREATE POLICY "Admins can manage all reservations" ON qr_reservations FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- Auto-expire reservations past pickup_by date
CREATE OR REPLACE FUNCTION expire_old_reservations() RETURNS void AS $$
BEGIN
  UPDATE qr_reservations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND pickup_by < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. STOCK ALERTS / WAITLIST
-- ============================================

CREATE TABLE IF NOT EXISTS qr_waitlist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, user_id)
);

ALTER TABLE qr_waitlist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_waitlist' AND policyname='Waitlist viewable by authenticated') THEN
    CREATE POLICY "Waitlist viewable by authenticated" ON qr_waitlist FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_waitlist' AND policyname='Users can join waitlist') THEN
    CREATE POLICY "Users can join waitlist" ON qr_waitlist FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_waitlist' AND policyname='Users can leave waitlist') THEN
    CREATE POLICY "Users can leave waitlist" ON qr_waitlist FOR DELETE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_waitlist' AND policyname='Admins manage waitlist') THEN
    CREATE POLICY "Admins manage waitlist" ON qr_waitlist FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- View for reservations with product details
CREATE OR REPLACE VIEW qr_reservations_with_details AS
SELECT r.*, p.name AS product_name, p.image_url AS product_image,
       p.total_stock AS product_stock,
       c.name AS category_name, c.color AS category_color
FROM qr_reservations r
JOIN products p ON r.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY r.reserved_date ASC;

-- ═══════════════════════════════════════════════════════════
-- 040_request_email_templates.sql
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- 041_it_requests_generic_columns.sql
-- ═══════════════════════════════════════════════════════════
-- ================================================================
-- FIX: Add missing columns to it_requests for new request forms
-- Migration: 041_it_requests_generic_columns.sql
-- ================================================================

-- Add generic columns needed by Onboarding/Offboarding/Equipment request forms
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'it';
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES profiles(id);
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS requester_email VARCHAR(255);
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255);

-- Ensure status column exists (it might already exist from old schema as empty string default)
-- Change default to 'pending' for new requests
ALTER TABLE it_requests ALTER COLUMN status SET DEFAULT 'pending';

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_it_requests_type ON it_requests(type);
CREATE INDEX IF NOT EXISTS idx_it_requests_requester ON it_requests(requester_id);

-- ═══════════════════════════════════════════════════════════
-- 042_user_equipment.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 042: User Equipment (Assigned Equipment Tracking)
-- Creates a dedicated table for tracking equipment assigned to users.
-- This is the single source of truth for "who has what".
-- ============================================

-- User equipment assignments
CREATE TABLE IF NOT EXISTS user_equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Who
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),

    -- What
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT,
    category_name VARCHAR(100),

    -- When
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    actual_return_date DATE,

    -- How (origin of assignment)
    source_type VARCHAR(30) NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('request', 'qr_scan', 'manual', 'onboarding')),
    source_id UUID, -- loan_request ID, qr_scan_log ID, etc.

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'returned', 'lost', 'damaged')),

    -- Subscription plan (for phones/routers)
    subscription_plan_name VARCHAR(100),
    subscription_plan_price VARCHAR(50),

    -- Included items (copied from product at assignment time)
    includes TEXT[],

    -- Admin fields
    notes TEXT,
    assigned_by UUID REFERENCES profiles(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_equipment_user ON user_equipment(user_id);
CREATE INDEX idx_user_equipment_status ON user_equipment(status);
CREATE INDEX idx_user_equipment_product ON user_equipment(product_id);
CREATE INDEX idx_user_equipment_source ON user_equipment(source_type, source_id);

-- Updated_at trigger
CREATE TRIGGER update_user_equipment_updated_at
    BEFORE UPDATE ON user_equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;

-- Users can view their own equipment
CREATE POLICY "Users can view own equipment"
    ON user_equipment FOR SELECT
    USING (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all equipment"
    ON user_equipment FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admins can manage all
CREATE POLICY "Admins can manage equipment"
    ON user_equipment FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can insert (for self-service flows)
CREATE POLICY "Users can insert own equipment"
    ON user_equipment FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- View for easier querying
CREATE OR REPLACE VIEW user_equipment_with_product AS
SELECT
    ue.*,
    p.name AS current_product_name,
    p.image_url AS current_product_image,
    p.description AS product_description,
    c.name AS current_category_name,
    c.color AS category_color,
    pr.first_name AS user_first_name,
    pr.last_name AS user_last_name,
    pr.avatar_url AS user_avatar_url
FROM user_equipment ue
LEFT JOIN products p ON ue.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN profiles pr ON ue.user_id = pr.id;

-- ═══════════════════════════════════════════════════════════
-- 043_request_notification_types.sql
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- 044_self_service_cart.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 044: Self-Service Cart System
-- Adds cart_items table, global_comment to loan_requests,
-- and a checkout function to convert cart → loan_request
-- ============================================

-- ─── Cart Items Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    options JSONB DEFAULT '{}',
    -- options format:
    -- {
    --   "specifications": { "color": "Space Gray", "storage": "256GB" },
    --   "services": { "subscription_plan": "Data 20GB", "insurance": true },
    --   "accessories": ["USB-C Hub", "Screen Protector"]
    -- }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)  -- one row per product per user, quantity stacks
);

-- Indexes
CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- Updated_at trigger
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart"
    ON cart_items FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all carts"
    ON cart_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── Add global_comment to loan_requests ─────────────────────
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS global_comment TEXT;

-- ─── View: cart with product details ─────────────────────────
CREATE OR REPLACE VIEW cart_items_with_product AS
SELECT
    ci.*,
    p.name AS product_name,
    p.description AS product_description,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    p.includes AS product_includes,
    p.has_subscription,
    p.has_apps,
    c.name AS category_name,
    c.color AS category_color
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- ─── Checkout function: cart → loan_request ──────────────────
-- Converts all cart_items for a user into a loan_request + items,
-- then clears the cart.
CREATE OR REPLACE FUNCTION checkout_cart(
    p_user_id UUID,
    p_project_name VARCHAR DEFAULT 'Equipment Request',
    p_project_description TEXT DEFAULT NULL,
    p_global_comment TEXT DEFAULT NULL,
    p_pickup_date DATE DEFAULT CURRENT_DATE,
    p_return_date DATE DEFAULT NULL,
    p_location_id UUID DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_cart_count INTEGER;
BEGIN
    -- Check cart is not empty
    SELECT COUNT(*) INTO v_cart_count FROM cart_items WHERE user_id = p_user_id;
    IF v_cart_count = 0 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    -- Create loan_request
    INSERT INTO loan_requests (
        user_id, project_name, project_description, global_comment,
        pickup_date, return_date, location_id, priority,
        status, terms_accepted, responsibility_accepted
    ) VALUES (
        p_user_id, p_project_name, p_project_description, p_global_comment,
        p_pickup_date, p_return_date, p_location_id, p_priority,
        'pending', true, true
    ) RETURNING id INTO v_request_id;

    -- Copy cart items to loan_request_items
    INSERT INTO loan_request_items (request_id, product_id, quantity, options)
    SELECT v_request_id, product_id, quantity, options
    FROM cart_items
    WHERE user_id = p_user_id;

    -- Clear the cart
    DELETE FROM cart_items WHERE user_id = p_user_id;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- 045_stock_management.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 045: Stock Management & Restock Date
-- Adds restock_date to products, and functions for
-- stock decrement on approval / increment on return.
-- ============================================

-- Add restock_date to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS restock_date DATE;

-- ─── Function: decrement stock for approved request items ─────
CREATE OR REPLACE FUNCTION decrement_stock_for_request(p_request_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products p
    SET total_stock = GREATEST(p.total_stock - lri.quantity, 0)
    FROM loan_request_items lri
    WHERE lri.request_id = p_request_id
      AND lri.product_id = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Function: increment stock for returned request items ─────
CREATE OR REPLACE FUNCTION increment_stock_for_request(p_request_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products p
    SET total_stock = p.total_stock + lri.quantity
    FROM loan_request_items lri
    WHERE lri.request_id = p_request_id
      AND lri.product_id = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the products_with_category view to include restock_date
-- Must DROP first because column order changed since original creation
DROP VIEW IF EXISTS products_with_category CASCADE;
CREATE VIEW products_with_category AS
SELECT
    p.*,
    c.name as category_name,
    c.color as category_color
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- ═══════════════════════════════════════════════════════════
-- 046_simplified_status_system.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 046: Simplified Status System
-- 3 statuses only: pending, in_progress, ready
-- 6 email templates, tracking token, cleanup
-- ============================================

-- ─── 1. Add tracking_token to loan_requests ──────────────────
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT uuid_generate_v4();
CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_requests_tracking_token ON loan_requests(tracking_token);

-- Backfill existing rows that don't have a tracking token
UPDATE loan_requests SET tracking_token = uuid_generate_v4() WHERE tracking_token IS NULL;

-- ─── 2. Migrate loan_requests statuses ───────────────────────
UPDATE loan_requests SET status = 'pending' WHERE status IN ('draft', 'cancelled', 'rejected', 'expired');
UPDATE loan_requests SET status = 'in_progress' WHERE status IN ('approved', 'reserved', 'picked_up', 'overdue');
UPDATE loan_requests SET status = 'ready' WHERE status IN ('returned', 'closed');

-- Drop old constraint and add new one
ALTER TABLE loan_requests DROP CONSTRAINT IF EXISTS loan_requests_status_check;
ALTER TABLE loan_requests ADD CONSTRAINT loan_requests_status_check
    CHECK (status IN ('pending', 'in_progress', 'ready'));

-- ─── 3. Migrate mailbox_requests statuses ────────────────────
UPDATE mailbox_requests SET status = 'pending' WHERE status IN ('pending', 'rejected', 'cancelled');
UPDATE mailbox_requests SET status = 'in_progress' WHERE status = 'approved';
UPDATE mailbox_requests SET status = 'ready' WHERE status = 'completed';

ALTER TABLE mailbox_requests DROP CONSTRAINT IF EXISTS mailbox_requests_status_check;
ALTER TABLE mailbox_requests ADD CONSTRAINT mailbox_requests_status_check
    CHECK (status IN ('pending', 'in_progress', 'ready'));

-- ─── 4. Deactivate ALL old email templates ───────────────────
UPDATE email_templates SET is_active = false;

-- Re-enable user_invitation (not request-related)
UPDATE email_templates SET is_active = true WHERE template_key = 'user_invitation';

-- ─── 5. Insert 6 new email templates ─────────────────────────

-- Email 1: Confirmation (on submit)
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_confirmed',
    'Request Confirmed',
    'Your {{request_type}} request has been received',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">Request received</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Your <strong>{{request_type}}</strong> request has been received and will be processed by the IT team.</p>
<div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#94a3b8;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#f59e0b;">Pending</p>
</div>
<p style="color:#64748b;font-size:14px;">Track your request anytime:</p>
<p><a href="{{tracking_url}}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#3b82f6;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">Track My Request</a></p>
</div>',
    'Sent immediately when a request is submitted',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 2: In Progress
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_in_progress',
    'Request In Progress',
    'Your {{request_type}} request is being prepared',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">We''re on it</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Your <strong>{{request_type}}</strong> request is now being prepared by the IT team.</p>
<div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#94a3b8;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#3b82f6;">In Progress</p>
</div>
<p><a href="{{tracking_url}}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#3b82f6;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">Track My Request</a></p>
</div>',
    'Sent when an admin starts processing the request',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 3: Ready
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_ready',
    'Request Ready',
    'Your {{request_type}} request is ready',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">Your request is ready!</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Your <strong>{{request_type}}</strong> request has been completed. Your equipment is ready for pickup at the IT desk.</p>
<div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#86efac;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#22c55e;">Ready</p>
</div>
<p><a href="{{tracking_url}}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#22c55e;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">View Details</a></p>
</div>',
    'Sent when the request is completed and equipment is ready',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 4: Return Reminder (3 days before)
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_return_reminder',
    'Return Reminder',
    'Reminder: {{product_name}} due back on {{return_date}}',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">Return reminder</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;">This is a friendly reminder that <strong>{{product_name}}</strong> is due for return on <strong>{{return_date}}</strong>.</p>
<div style="background:#fffbeb;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#fbbf24;">RETURN DATE</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#f59e0b;">{{return_date}}</p>
</div>
<p style="color:#64748b;font-size:14px;">Please bring the equipment to the IT desk.</p>
</div>',
    'Sent 3 days before the expected return date (automated cron)',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 5: Overdue (1 day after)
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_overdue',
    'Equipment Overdue',
    'Action required: {{product_name}} is overdue',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#ef4444;margin-bottom:8px;">Equipment overdue</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;"><strong>{{product_name}}</strong> was due for return on <strong>{{return_date}}</strong> and has not been returned.</p>
<div style="background:#fef2f2;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#fca5a5;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ef4444;">Overdue</p>
</div>
<p style="color:#64748b;font-size:14px;">Please return the equipment to the IT desk as soon as possible.</p>
</div>',
    'Sent 1 day after the expected return date if not returned (automated cron)',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 6: Return Confirmed
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_return_confirmed',
    'Return Confirmed',
    '{{product_name}} has been returned — thank you',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">Return confirmed</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;"><strong>{{product_name}}</strong> has been returned and checked in by the IT team.</p>
<div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#86efac;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#22c55e;">Returned</p>
</div>
<p style="color:#64748b;font-size:14px;">Thank you for returning the equipment on time.</p>
</div>',
    'Sent when equipment is returned via QR scan',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- ─── 6. Update loan_requests RLS for public tracking ─────────
CREATE POLICY "Public tracking by token" ON loan_requests
    FOR SELECT USING (tracking_token IS NOT NULL);

-- ═══════════════════════════════════════════════════════════
-- 047_recreate_views.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 047: Recreate views + cleanup
-- Views may have been dropped by CASCADE in migration 045
-- ============================================

-- Recreate loan_requests_with_details
CREATE OR REPLACE VIEW loan_requests_with_details AS
SELECT
    lr.*,
    p.first_name AS user_first_name,
    p.last_name AS user_last_name,
    p.email AS user_email,
    p.avatar_url AS user_avatar_url,
    loc.name AS location_name,
    loc.address AS location_address,
    (SELECT COUNT(*) FROM loan_request_items WHERE request_id = lr.id) AS item_count
FROM loan_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
LEFT JOIN locations loc ON lr.location_id = loc.id;

-- Recreate loan_request_items_with_details
CREATE OR REPLACE VIEW loan_request_items_with_details AS
SELECT
    lri.*,
    p.name AS product_name,
    p.image_url AS product_image,
    p.includes AS product_includes,
    p.total_stock AS product_stock,
    c.name AS category_name,
    c.color AS category_color
FROM loan_request_items lri
LEFT JOIN products p ON lri.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- Recreate products_with_category (in case it was dropped)
CREATE OR REPLACE VIEW products_with_category AS
SELECT
    p.*,
    c.name AS category_name,
    c.color AS category_color
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- Recreate cart_items_with_product (in case it was dropped)
CREATE OR REPLACE VIEW cart_items_with_product AS
SELECT
    ci.*,
    p.name AS product_name,
    p.description AS product_description,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    p.includes AS product_includes,
    p.has_subscription,
    p.has_apps,
    c.name AS category_name,
    c.color AS category_color
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- Recreate user_equipment_with_product (in case it was dropped)
CREATE OR REPLACE VIEW user_equipment_with_product AS
SELECT
    ue.*,
    p.name AS current_product_name,
    p.image_url AS current_product_image,
    p.description AS product_description,
    c.name AS current_category_name,
    c.color AS category_color,
    pr.first_name AS user_first_name,
    pr.last_name AS user_last_name,
    pr.avatar_url AS user_avatar_url
FROM user_equipment ue
LEFT JOIN products p ON ue.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN profiles pr ON ue.user_id = pr.id;

-- ═══════════════════════════════════════════════════════════
-- 048_system_reset.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 048: System Reset & Cleanup
-- Clears all request data, removes kit system,
-- keeps only 3 email templates
-- ============================================

-- ─── 1. Clear all request data ───────────────────────────────
TRUNCATE TABLE loan_request_items CASCADE;
TRUNCATE TABLE loan_requests CASCADE;
TRUNCATE TABLE it_requests CASCADE;
TRUNCATE TABLE mailbox_requests CASCADE;
TRUNCATE TABLE cart_items CASCADE;
TRUNCATE TABLE user_equipment CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE extension_requests CASCADE;
TRUNCATE TABLE qr_scan_logs CASCADE;

-- ─── 2. Remove kit system ────────────────────────────────────
-- Remove kit references from qr_codes
ALTER TABLE qr_codes DROP COLUMN IF EXISTS kit_id;

-- Drop kit tables
DROP TABLE IF EXISTS qr_kit_items CASCADE;
DROP TABLE IF EXISTS qr_kits CASCADE;

-- ─── 3. Clean email templates — keep only 3 active ──────────
UPDATE email_templates SET is_active = false;

-- Ensure the 3 templates exist and are active
INSERT INTO email_templates (template_key, name, subject, body, format, is_active) VALUES
('request_confirmed', 'Request Confirmed',
 'Your request has been received',
 '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;">Request received</h2>
<p style="color:#64748b;font-size:15px;">Hi {{name}},</p>
<p style="color:#64748b;font-size:15px;">Your <strong>{{type}}</strong> request has been received and will be processed by the IT team.</p>
<div style="background:#fffbeb;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
<p style="margin:0;font-size:13px;color:#fbbf24;">STATUS</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#f59e0b;">Pending</p>
</div>
<p style="color:#94a3b8;font-size:13px;">You can track the status of your request on the IT Hub.</p>
</div>', 'html', true),

('request_in_progress', 'Request In Progress',
 'Your request is being prepared',
 '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;">We''re on it</h2>
<p style="color:#64748b;font-size:15px;">Hi {{name}},</p>
<p style="color:#64748b;font-size:15px;">Your <strong>{{type}}</strong> request is now being prepared by the IT team.</p>
<div style="background:#eff6ff;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
<p style="margin:0;font-size:13px;color:#93c5fd;">STATUS</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#3b82f6;">In Progress</p>
</div>
<p style="color:#94a3b8;font-size:13px;">You can track the status of your request on the IT Hub.</p>
</div>', 'html', true),

('request_ready', 'Request Ready',
 'Your request is ready',
 '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;">Your request is ready!</h2>
<p style="color:#64748b;font-size:15px;">Hi {{name}},</p>
<p style="color:#64748b;font-size:15px;">Your <strong>{{type}}</strong> request has been completed.</p>
<div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
<p style="margin:0;font-size:13px;color:#86efac;">STATUS</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#22c55e;">Ready</p>
</div>
<p style="color:#94a3b8;font-size:13px;">Please come to the IT desk to collect your equipment.</p>
</div>', 'html', true)

ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject,
  body = EXCLUDED.body, format = EXCLUDED.format, is_active = true;

-- Keep user_invitation active
UPDATE email_templates SET is_active = true WHERE template_key = 'user_invitation';

-- ═══════════════════════════════════════════════════════════
-- 049_fix_it_requests_rls.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 049: Fix RLS for it_requests
-- Users need to see requests where requester_id = their ID
-- (old policy only checked requested_by)
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can view own IT requests" ON it_requests;

-- New policy: check both old and new columns
CREATE POLICY "Users can view own IT requests" ON it_requests
    FOR SELECT USING (
        requested_by = auth.uid() OR requester_id = auth.uid()
    );

-- ═══════════════════════════════════════════════════════════
-- 050_qr_individual_tracking.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 050: Individual QR Code Tracking
-- Each QR code has its own status and can be
-- assigned to a specific user
-- ============================================

-- Add individual tracking fields to qr_codes
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'maintenance'));
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS assigned_to_email VARCHAR(255);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_assigned ON qr_codes(assigned_to);

-- Recreate the view to include new fields
DROP VIEW IF EXISTS qr_codes_with_details CASCADE;
CREATE VIEW qr_codes_with_details AS
SELECT
    qr.*,
    p.name AS product_name,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    c.name AS category_name,
    c.color AS category_color
FROM qr_codes qr
LEFT JOIN products p ON qr.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- ═══════════════════════════════════════════════════════════
-- 051_reset_requests.sql
-- ═══════════════════════════════════════════════════════════
-- Reset all request data for fresh start
TRUNCATE TABLE loan_request_items CASCADE;
TRUNCATE TABLE loan_requests CASCADE;
TRUNCATE TABLE it_requests CASCADE;
TRUNCATE TABLE mailbox_requests CASCADE;
TRUNCATE TABLE cart_items CASCADE;
TRUNCATE TABLE user_equipment CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE qr_scan_logs CASCADE;

-- Reset all QR codes to available
UPDATE qr_codes SET status = 'available', assigned_to = NULL, assigned_to_name = NULL, assigned_to_email = NULL, assigned_at = NULL;

-- ═══════════════════════════════════════════════════════════
-- 052_fix_process_qr_scan.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 052: Fix process_qr_scan — remove kit references
-- The qr_kits table was dropped but the function still references it
-- ============================================

-- Drop and recreate the function without kit logic
CREATE OR REPLACE FUNCTION process_qr_scan(
    p_qr_code VARCHAR,
    p_action VARCHAR,
    p_user_id UUID DEFAULT NULL,
    p_user_email VARCHAR DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_pickup_date DATE DEFAULT NULL,
    p_expected_return_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_qr_record RECORD;
    v_stock_before INTEGER;
    v_stock_after INTEGER;
BEGIN
    -- Find QR code with product info
    SELECT
        qc.id, qc.code, qc.product_id, qc.is_active, qc.status,
        qc.assigned_to, qc.assigned_to_name,
        p.name AS product_name, p.total_stock, p.image_url AS product_image,
        c.name AS category_name, c.color AS category_color
    INTO v_qr_record
    FROM qr_codes qc
    LEFT JOIN products p ON qc.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE qc.code = p_qr_code;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'QR code not found: ' || p_qr_code);
    END IF;

    IF NOT v_qr_record.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'QR code is deactivated');
    END IF;

    v_stock_before := v_qr_record.total_stock;

    -- TAKE: assign to user, stock -1
    IF p_action = 'take' THEN
        IF v_stock_before <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'No stock available for ' || v_qr_record.product_name);
        END IF;

        IF v_qr_record.status = 'assigned' THEN
            RETURN jsonb_build_object('success', false, 'error', 'This device is already assigned to ' || COALESCE(v_qr_record.assigned_to_name, 'someone'));
        END IF;

        v_stock_after := v_stock_before - 1;
        UPDATE products SET total_stock = v_stock_after WHERE id = v_qr_record.product_id;

        -- Mark QR as assigned
        UPDATE qr_codes SET
            status = 'assigned',
            assigned_to = p_user_id,
            assigned_to_name = p_user_name,
            assigned_to_email = p_user_email,
            assigned_at = NOW()
        WHERE id = v_qr_record.id;

    -- DEPOSIT: return device, stock +1
    ELSIF p_action = 'deposit' THEN
        IF v_qr_record.status != 'assigned' THEN
            RETURN jsonb_build_object('success', false, 'error', 'This device is not currently assigned — cannot deposit');
        END IF;

        v_stock_after := v_stock_before + 1;
        UPDATE products SET total_stock = v_stock_after WHERE id = v_qr_record.product_id;

        -- Mark QR as available
        UPDATE qr_codes SET
            status = 'available',
            assigned_to = NULL,
            assigned_to_name = NULL,
            assigned_to_email = NULL,
            assigned_at = NULL
        WHERE id = v_qr_record.id;

        -- Close user_equipment record if exists
        UPDATE user_equipment SET
            status = 'returned',
            actual_return_date = CURRENT_DATE
        WHERE product_id = v_qr_record.product_id
          AND user_id = v_qr_record.assigned_to
          AND status = 'active';

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action: ' || p_action);
    END IF;

    -- Log the scan
    INSERT INTO qr_scan_logs (
        qr_code_id, qr_code, product_id,
        user_id, user_email, user_name,
        action, quantity_changed, stock_before, stock_after,
        notes, pickup_date, expected_return_date
    ) VALUES (
        v_qr_record.id, p_qr_code, v_qr_record.product_id,
        p_user_id, p_user_email, p_user_name,
        p_action, 1, v_stock_before, v_stock_after,
        p_notes, p_pickup_date, p_expected_return_date
    );

    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'product_name', v_qr_record.product_name,
        'product_image', v_qr_record.product_image,
        'category_name', v_qr_record.category_name,
        'stock_before', v_stock_before,
        'stock_after', v_stock_after,
        'qr_code', p_qr_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also recreate scan logs view without kit references
DROP VIEW IF EXISTS qr_scan_logs_with_details CASCADE;
CREATE VIEW qr_scan_logs_with_details AS
SELECT
    sl.*,
    p.name AS product_name,
    p.image_url AS product_image,
    c.name AS category_name,
    c.color AS category_color
FROM qr_scan_logs sl
LEFT JOIN products p ON sl.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- ═══════════════════════════════════════════════════════════
-- 053_local_it_statuses.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 053: Extend QR code statuses for Local IT
-- Adds: in_repair, lost, reserved
-- ============================================

-- Drop old constraint and add extended one
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_status_check;
ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_status_check
    CHECK (status IN ('available', 'assigned', 'maintenance', 'in_repair', 'lost', 'reserved'));

-- Recreate view
DROP VIEW IF EXISTS qr_codes_with_details CASCADE;
CREATE VIEW qr_codes_with_details AS
SELECT
    qr.*,
    p.name AS product_name,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    p.description AS product_description,
    p.sub_type AS product_sub_type,
    c.name AS category_name,
    c.color AS category_color
FROM qr_codes qr
LEFT JOIN products p ON qr.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- ═══════════════════════════════════════════════════════════
-- 054_product_maintenance.sql
-- ═══════════════════════════════════════════════════════════
-- MIGRATION 054: Add maintenance mode to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- Recreate view
DROP VIEW IF EXISTS products_with_category CASCADE;
CREATE VIEW products_with_category AS
SELECT p.*, c.name AS category_name, c.color AS category_color
FROM products p LEFT JOIN categories c ON p.category_id = c.id;

-- ═══════════════════════════════════════════════════════════
-- 055_redesign_email_templates.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 055: Redesign email templates
-- New Stripe-like style, black CTA buttons,
-- bodies are now INNER content only (wrapped at runtime by wrapEmailHtml)
-- ============================================

-- ─── user_invitation ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'You''re invited to join {{app_name}}',
    body = E'Hi {{first_name}},\n\nWelcome aboard! You''ve been invited to join **{{app_name}}**.\n\nSign in with your Microsoft account to access the platform — your access is configured and ready to go.\n\n{{cta:Get started|{{login_url}}}}\n\nOnce you''re in, you''ll find everything you need: equipment catalog, your requests, and your team''s resources.\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe {{app_name}} Team',
    format = 'html',
    is_active = true
WHERE template_key = 'user_invitation';

-- ─── request_confirmed ─────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request has been received',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Request received</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">Your <strong style="color:#0a2540;">{{request_type}}</strong> request has been received and will be processed by the IT team.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 8px 0;font-size:14px;color:#425466;">Track your request anytime:</p>\n{{cta:Track my request|{{tracking_url}}}}',
    format = 'html',
    is_active = true
WHERE template_key = 'request_confirmed';

-- ─── request_in_progress ───────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is being prepared',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">We''re on it</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">Your <strong style="color:#0a2540;">{{request_type}}</strong> request is now being prepared by the IT team.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#eef4ff;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#3955cf;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#3955cf;letter-spacing:-0.3px;">In Progress</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 8px 0;font-size:14px;color:#425466;">Track your request anytime:</p>\n{{cta:Track my request|{{tracking_url}}}}',
    format = 'html',
    is_active = true
WHERE template_key = 'request_in_progress';

-- ─── request_ready ─────────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is ready',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Your request is ready</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">Your <strong style="color:#0a2540;">{{request_type}}</strong> request has been completed. Your equipment is ready for pickup at the IT desk.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Ready</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 8px 0;font-size:14px;color:#425466;">See the details:</p>\n{{cta:View details|{{tracking_url}}}}',
    format = 'html',
    is_active = true
WHERE template_key = 'request_ready';

-- ─── request_return_reminder ───────────────────────────────────
UPDATE email_templates SET
    subject = 'Reminder: {{product_name}} due back on {{return_date}}',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Return reminder</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">This is a friendly reminder that <strong style="color:#0a2540;">{{product_name}}</strong> is due for return on <strong style="color:#0a2540;">{{return_date}}</strong>.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Return date</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">{{return_date}}</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 0;font-size:13px;color:#8898aa;">Please bring the equipment to the IT desk.</p>',
    format = 'html',
    is_active = true
WHERE template_key = 'request_return_reminder';

-- ─── request_overdue ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Action required: {{product_name}} is overdue',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#b91c1c;letter-spacing:-0.3px;">Equipment overdue</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;"><strong style="color:#0a2540;">{{product_name}}</strong> was due for return on <strong style="color:#0a2540;">{{return_date}}</strong> and has not been returned.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fde8e8;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#b91c1c;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#b91c1c;letter-spacing:-0.3px;">Overdue</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 0;font-size:13px;color:#8898aa;">Please return the equipment to the IT desk as soon as possible.</p>',
    format = 'html',
    is_active = true
WHERE template_key = 'request_overdue';

-- ─── request_return_confirmed ──────────────────────────────────
UPDATE email_templates SET
    subject = '{{product_name}} has been returned — thank you',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Return confirmed</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;"><strong style="color:#0a2540;">{{product_name}}</strong> has been returned and checked in by the IT team.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Returned</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 0;font-size:13px;color:#8898aa;">Thank you for returning the equipment on time.</p>',
    format = 'html',
    is_active = true
WHERE template_key = 'request_return_confirmed';

-- ═══════════════════════════════════════════════════════════
-- 056_centralize_email_templates.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 056: Centralize email templates
-- Add category, surface mailbox/onboarding/reminders
-- in the unified Communications editor.
-- ============================================

-- ─── 1. Add category column ─────────────────────────────────
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill categories on existing templates
UPDATE email_templates SET category = 'invitations'   WHERE template_key = 'user_invitation';
UPDATE email_templates SET category = 'requests'      WHERE template_key IN ('request_confirmed','request_in_progress','request_ready');
UPDATE email_templates SET category = 'reminders'     WHERE template_key IN ('request_return_reminder','request_overdue','request_return_confirmed');

-- ─── 2. New: mailbox_confirmation ───────────────────────────
INSERT INTO email_templates (template_key, name, subject, body, description, format, category, is_active) VALUES
(
  'mailbox_confirmation',
  'Mailbox Confirmation',
  '{{app_name}} — Your functional mailbox has been created',
  E'Hi {{requester_name}},\n\nYour functional mailbox has been created and is ready to use.\n\n**Mailbox** {{mailbox_email}}\n**Project** {{project_name}}\n**Display name** {{display_name}}\n\n{{onepassword_section}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe {{app_name}} Team',
  'Sent to the requester when a functional mailbox has been provisioned',
  'html',
  'mailbox',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
  description = EXCLUDED.description, format = EXCLUDED.format,
  category = EXCLUDED.category, is_active = true;

-- ─── 3. New: onboarding_welcome ─────────────────────────────
INSERT INTO email_templates (template_key, name, subject, body, description, format, category, is_active) VALUES
(
  'onboarding_welcome',
  'Onboarding Welcome',
  'Welcome to {{app_name}}, {{first_name}} 👋',
  E'Hi {{first_name}},\n\nWelcome to **{{company}}**! We''re thrilled to have you on board as {{job_title}}.\n\nYour account and IT access are configured and ready to go. Here are the key details for your first day:\n\n**Start date** {{start_date}}\n**Office** {{office}}\n**Manager** {{manager_name}}\n\n{{cta:Access the hub|{{login_url}}}}\n\nIf you have any questions before getting started, just reach out to your manager or the IT team — we''re here to help.\n\nSee you soon,\nThe {{app_name}} Team',
  'Sent to a new hire on or before their first day (single welcome email — for the block-based onboarding flow, see Onboarding Composer)',
  'html',
  'onboarding',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
  description = EXCLUDED.description, format = EXCLUDED.format,
  category = EXCLUDED.category, is_active = true;

-- ─── 4. New: dashboard_reminder ─────────────────────────────
INSERT INTO email_templates (template_key, name, subject, body, description, format, category, is_active) VALUES
(
  'dashboard_reminder',
  'Quick Return Reminder',
  'Reminder: {{product_name}} due tomorrow',
  E'Hi {{first_name}},\n\nThis is a friendly reminder that **{{product_name}}** is due for return tomorrow ({{return_date}}).\n\nPlease bring it to the IT desk.\n\nThanks!\nThe {{app_name}} Team',
  'Sent from the admin dashboard "Send reminders" quick action',
  'html',
  'reminders',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
  description = EXCLUDED.description, format = EXCLUDED.format,
  category = EXCLUDED.category, is_active = true;

-- ═══════════════════════════════════════════════════════════
-- 057_onboarding_real_content.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 057: Onboarding email — real VO Group content
-- Replace generic block defaults with the authentic
-- Tim Leskens onboarding email content; add `password`
-- and `signature_admin` blocks.
-- ============================================

-- Wipe existing block defaults so reseed is clean
DELETE FROM onboarding_block_templates;

INSERT INTO onboarding_block_templates (block_key, label_fr, label_en, default_content_fr, default_content_en, default_options, icon, sort_order) VALUES

-- 1. Salutation
(
  'salutation', 'Salutation', 'Greeting',
  E'Hey {{first_name}} 👋\n\nBienvenue dans l''équipe ! Voici tout ce qu''il te faut pour démarrer chez VO Group.',
  E'Hey {{first_name}} 👋\n\nWelcome to the team! Here''s everything you need to get started at VO Group.',
  '{}'::jsonb,
  'Hand', 1
),

-- 2. Email Info
(
  'email_info', 'Ton adresse e-mail', 'Your email address',
  E'**{{email}}**\n\nMicrosoft 365 · Business Premium (Outlook, Teams, Word, Excel… la totale !)',
  E'**{{email}}**\n\nMicrosoft 365 · Business Premium (Outlook, Teams, Word, Excel… the full pack!)',
  '{}'::jsonb,
  'Mail', 2
),

-- 3. Password (NEW)
(
  'password', 'Ton mot de passe', 'Your password',
  E'Il t''attend sur un lien sécurisé ! Clique ci-dessous et utilise ton adresse **{{personal_email}}** pour le déverrouiller.',
  E'It''s waiting for you on a secure link! Click below and use your address **{{personal_email}}** to unlock it.',
  '{"url":"","label_fr":"Récupérer mon mot de passe","label_en":"Retrieve my password"}'::jsonb,
  'KeyRound', 3
),

-- 4. Building Info
(
  'building_info', 'Jacqmotte Rules 🏢', 'Jacqmotte Rules 🏢',
  E'Le petit guide de survie au bureau !\n\nNotre bureau est situé **Rue Haute 139/16 — 1000 Brussels**. À ton arrivée, présente-toi à la réception : ton badge d''accès sera prêt et te sera remis le premier jour.\n\nHoraires d''ouverture du bâtiment : **7h30 – 19h00**.',
  E'Your little office survival guide!\n\nOur office is at **Rue Haute 139/16 — 1000 Brussels**. On arrival, check in at the reception desk: your access badge will be ready and handed to you on day one.\n\nBuilding hours: **7:30 AM – 7:00 PM**.',
  '{}'::jsonb,
  'Building2', 4
),

-- 5. IT Security
(
  'it_security', 'Sécurité IT', 'IT Security',
  E'Petit check-up avant de commencer : lance un scan antivirus complet sur ton ordi et envoie-moi une capture d''écran du résultat. Rien de compliqué, juste histoire de s''assurer que tout est clean !\n\n⚠️ Fais ça chez toi sur ton WiFi perso, pas sur le réseau du bureau 😊',
  E'Quick check-up before we get started: run a full antivirus scan on your computer and send me a screenshot of the result. Nothing complicated — just to make sure everything is clean!\n\n⚠️ Do this from home on your personal WiFi, not on the office network 😊',
  '{}'::jsonb,
  'Shield', 5
),

-- 6. Email Signature
(
  'email_signature', 'Signature mail', 'Email signature',
  E'Bonne nouvelle : ta signature Outlook est déjà configurée automatiquement. Une chose de moins à faire !',
  E'Good news: your Outlook signature is already set up automatically. One less thing to worry about!',
  '{}'::jsonb,
  'PenTool', 6
),

-- 7. SharePoint
(
  'sharepoint', 'SharePoint', 'SharePoint',
  E'Les dossiers et fichiers dont tu auras besoin te seront partagés par mail. Keep an eye on your inbox !',
  E'The folders and files you need will be shared with you by email. Keep an eye on your inbox!',
  '{"url":"https://vogroup.sharepoint.com","label_fr":"Ouvrir SharePoint","label_en":"Open SharePoint"}'::jsonb,
  'FolderOpen', 7
),

-- 8. Teams
(
  'teams', 'Microsoft Teams', 'Microsoft Teams',
  E'Teams est notre outil principal pour discuter au quotidien. Tu as été ajouté aux canaux de ton équipe ({{team}}).\n\nTélécharge l''app sur ton ordi et ton tel — comme ça tu rates rien !',
  E'Teams is our main day-to-day chat tool. You''ve been added to your team''s channels ({{team}}).\n\nDownload the app on your computer and phone — that way you won''t miss a thing!',
  '{"url":"https://teams.microsoft.com","label_fr":"Ouvrir Teams","label_en":"Open Teams"}'::jsonb,
  'MessageSquare', 8
),

-- 9. WiFi (two-column hardcoded codes)
(
  'wifi', 'WiFi — Les codes magiques', 'WiFi — The magic codes',
  E'', E'',
  '{"computer_network":"VO – Jacqmotte","computer_password":"Stalle2Jacq#2024","phone_network":"VO Smart","phone_password":"Jacq#139"}'::jsonb,
  'Wifi', 9
),

-- 10. Image Rights
(
  'image_rights', 'Droit à l''image', 'Image rights',
  E'Chez VO, on respecte ta vie privée. Ce petit formulaire nous permet de savoir si tu es OK (ou pas) pour apparaître sur nos photos et communications. C''est obligatoire, mais ça prend 30 secondes !\n\nTu changes d''avis plus tard ? Envoie un mail à {{it_contact_email}}.',
  E'At VO we respect your privacy. This short form lets us know whether you''re OK (or not) with appearing in our photos and communications. It''s required, but it only takes 30 seconds!\n\nChange your mind later? Just email {{it_contact_email}}.',
  '{"url":"","label_fr":"Remplir le formulaire","label_en":"Fill in the form"}'::jsonb,
  'Camera', 10
),

-- 11. FAQ IT
(
  'faq_it', 'FAQ IT', 'IT FAQ',
  E'💡 Pro tip : j''ai compilé une FAQ qui répond à 90% des soucis IT du quotidien (imprimantes capricieuses, VPN qui fait des siennes…).',
  E'💡 Pro tip: I''ve put together a FAQ that solves 90% of daily IT issues (moody printers, VPN drama…).',
  '{"url":"","label_fr":"Voir la FAQ IT","label_en":"See the IT FAQ"}'::jsonb,
  'HelpCircle', 11
),

-- 12. CTA Link (generic, disabled by default)
(
  'cta_link', 'Lien CTA', 'CTA Link',
  E'Clique sur le bouton ci-dessous pour accéder à la ressource.',
  E'Click the button below to access the resource.',
  '{"url":"https://","label_fr":"Accéder","label_en":"Access"}'::jsonb,
  'ExternalLink', 12
),

-- 13. Closing
(
  'closing', 'Conclusion', 'Closing',
  E'Voilà, tu as toutes les clés en main ! 🔑\n\nJe suis au bureau quasi tous les jours, donc si tu as la moindre question ou un truc qui coince, passe me voir ou envoie-moi un message. Pas de question bête, promis !\n\nÀ demain,',
  E'That''s it, you''ve got everything you need! 🔑\n\nI''m at the office almost every day, so if you have any questions or run into anything, come by or drop me a message. No question is a silly question — promise!\n\nSee you soon,',
  '{}'::jsonb,
  'CheckCircle', 13
),

-- 14. Signature admin (NEW — pulled from sender profile at render time)
(
  'signature_admin', 'Signature expéditeur', 'Sender signature',
  E'', E'',
  '{}'::jsonb,
  'Signature', 14
);

-- ═══════════════════════════════════════════════════════════
-- 058_onboarding_welcome_real_content.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 058: Rewrite onboarding_welcome template
-- Authentic VO Group voice (Tim Leskens style).
-- ============================================

UPDATE email_templates SET
    subject = 'Bienvenue chez VO Group, {{first_name}} 👋',
    body = E'Hey {{first_name}} 👋\n\nBienvenue dans l''équipe ! Voici tout ce qu''il te faut pour démarrer chez VO Group.\n\n**TON ADRESSE E-MAIL**\n{{email}}\nMicrosoft 365 · Business Premium (Outlook, Teams, Word, Excel… la totale !)\n\n**TON MOT DE PASSE**\nIl t''attend sur un lien sécurisé ! Clique ci-dessous et utilise ton adresse **{{personal_email}}** pour le déverrouiller.\n\n{{cta:Récupérer mon mot de passe|{{password_url}}}}\n\n**JACQMOTTE RULES 🏢**\nNotre bureau : **Rue Haute 139/16 — 1000 Brussels**. À ton arrivée, présente-toi à la réception : ton badge sera prêt et te sera remis le premier jour. Horaires : **7h30 – 19h00**.\n\n**SÉCURITÉ IT 🔒**\nPetit check-up avant de commencer : lance un scan antivirus complet sur ton ordi et envoie-moi une capture du résultat. ⚠️ Fais ça chez toi sur ton WiFi perso, pas sur le réseau du bureau 😊\n\n**WIFI — LES CODES MAGIQUES 📶**\n💻 Sur ton ordi : Réseau **VO – Jacqmotte** / MDP `Stalle2Jacq#2024`\n📱 Sur ton smartphone : Réseau **VO Smart** / MDP `Jacq#139`\n\n**DROIT À L''IMAGE 📸**\nChez VO, on respecte ta vie privée. Ce petit formulaire nous permet de savoir si tu es OK pour apparaître sur nos photos. C''est obligatoire, mais ça prend 30 secondes !\n\n{{cta:Remplir le formulaire|{{image_rights_url}}}}\n\n💡 **Pro tip** : j''ai compilé une FAQ qui répond à 90% des soucis IT du quotidien (imprimantes capricieuses, VPN qui fait des siennes…).\n\nVoilà, tu as toutes les clés en main ! 🔑\n\nJe suis au bureau quasi tous les jours, donc si tu as la moindre question ou un truc qui coince, passe me voir ou envoie-moi un message. Pas de question bête, promis !\n\nÀ demain,\nL''équipe {{app_name}}',
    description = 'Single-email welcome (condensed version of the block-based composer)',
    category = 'onboarding',
    is_active = true
WHERE template_key = 'onboarding_welcome';

-- ═══════════════════════════════════════════════════════════
-- 059_onboarding_emails_link_to_requests.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 059: Link onboarding_emails to it_requests
-- so the admin UI can show "welcome email sent" on a request
-- and auto-mark the request as ready after sending.
-- ============================================

ALTER TABLE onboarding_emails
  ADD COLUMN IF NOT EXISTS it_request_id UUID REFERENCES it_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_emails_it_request_id
  ON onboarding_emails(it_request_id);

-- ═══════════════════════════════════════════════════════════
-- 060_email_templates_cleanup.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 060: Email templates final cleanup
-- - Hardcode "VO Hub" everywhere (no more {{app_name}})
-- - Align every template on a single, clean structure:
--     greeting + intro + bold field list + closing + signature
-- - Drop redundant templates
-- ============================================

-- ─── Drop deprecated/legacy templates ──────────────────────────
DELETE FROM email_templates
WHERE template_key IN (
  'order_confirmation', 'order_ready',
  'return_reminder', 'return_confirmation',
  'equipment_picked_up', 'request_closed',
  'extension_approved', 'extension_rejected',
  'dashboard_reminder'   -- redundant with request_return_reminder
);

-- ─── user_invitation ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'You''re invited to join VO Hub',
    body = E'Hi {{first_name}},\n\nWelcome aboard! You''ve been invited to join **VO Hub**.\n\nSign in with your Microsoft account to access the platform — your access is configured and ready to go.\n\n{{cta:Get started|{{login_url}}}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'invitations',
    is_active = true
WHERE template_key = 'user_invitation';

-- ─── mailbox_confirmation ──────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your functional mailbox has been created',
    body = E'Hi {{requester_name}},\n\nYour functional mailbox has been created and is ready to use.\n\n**Mailbox** {{mailbox_email}}\n**Project** {{project_name}}\n**Display name** {{display_name}}\n\n{{onepassword_section}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    description = 'Sent to the requester when a functional mailbox has been provisioned',
    format = 'html',
    category = 'mailbox',
    is_active = true
WHERE template_key = 'mailbox_confirmation';

-- ─── onboarding_welcome (condensed single-email version) ───────
UPDATE email_templates SET
    subject = 'Welcome to VO Group, {{first_name}}',
    body = E'Hi {{first_name}},\n\nWelcome to the team! Your account is configured and you''re ready to start.\n\n**Corporate email** {{email}}\n**Personal email** {{personal_email}}\n**Company** {{company}}\n**Job title** {{job_title}}\n**Start date** {{start_date}}\n\nYour 1Password link is on its way to your personal address — use it to retrieve your initial credentials.\n\nIf you have any questions before your first day, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    description = 'Single-email welcome (condensed). For the rich block-based version, use the inline composer on a request.',
    format = 'html',
    category = 'onboarding',
    is_active = true
WHERE template_key = 'onboarding_welcome';

-- ─── request_confirmed ─────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request has been received',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n\nTrack your request anytime in the hub.\n\n{{cta:Track my request|{{tracking_url}}}}\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'requests',
    is_active = true
WHERE template_key = 'request_confirmed';

-- ─── request_in_progress ───────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is being prepared',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#eef4ff;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#3955cf;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#3955cf;letter-spacing:-0.3px;">In Progress</p>\n  </div>\n</td></tr></table>\n\nWe''ll let you know as soon as it''s ready.\n\n{{cta:Track my request|{{tracking_url}}}}\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'requests',
    is_active = true
WHERE template_key = 'request_in_progress';

-- ─── request_ready ─────────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is ready',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed. Your equipment is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Ready</p>\n  </div>\n</td></tr></table>\n\n{{cta:View details|{{tracking_url}}}}\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'requests',
    is_active = true
WHERE template_key = 'request_ready';

-- ─── request_return_reminder ───────────────────────────────────
UPDATE email_templates SET
    subject = 'Reminder: {{product_name}} due back on {{return_date}}',
    body = E'Hi {{requester_name}},\n\nFriendly reminder that **{{product_name}}** is due for return on **{{return_date}}**.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Return date</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">{{return_date}}</p>\n  </div>\n</td></tr></table>\n\nPlease bring the equipment to the IT desk.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'reminders',
    is_active = true
WHERE template_key = 'request_return_reminder';

-- ─── request_overdue ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Action required: {{product_name}} is overdue',
    body = E'Hi {{requester_name}},\n\n**{{product_name}}** was due for return on **{{return_date}}** and has not been returned.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fde8e8;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#b91c1c;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#b91c1c;letter-spacing:-0.3px;">Overdue</p>\n  </div>\n</td></tr></table>\n\nPlease return the equipment to the IT desk as soon as possible.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'reminders',
    is_active = true
WHERE template_key = 'request_overdue';

-- ─── request_return_confirmed ──────────────────────────────────
UPDATE email_templates SET
    subject = '{{product_name}} has been returned — thank you',
    body = E'Hi {{requester_name}},\n\n**{{product_name}}** has been returned and checked in by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Returned</p>\n  </div>\n</td></tr></table>\n\nThank you for returning the equipment on time.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'reminders',
    is_active = true
WHERE template_key = 'request_return_confirmed';

-- ═══════════════════════════════════════════════════════════
-- 061_drop_onboarding_welcome_duplicate.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 061: Drop the redundant onboarding_welcome template
-- The block-based composer (onboarding_block_templates +
-- src/lib/onboarding-mjml.js) is the single source of truth for
-- welcome emails. The flat email_templates row was a leftover.
-- ============================================

DELETE FROM email_templates WHERE template_key = 'onboarding_welcome';

-- ═══════════════════════════════════════════════════════════
-- 062_drop_unused_cta_in_status_templates.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 062: Strip unused tracking CTAs from status templates
-- The status emails are sent by src/services/request-status-service.js
-- which doesn't pass a {{tracking_url}} (IT / onboarding / mailbox
-- requests don't have tracking tokens). Remove the orphan CTAs so the
-- admin preview matches what subscribers actually receive.
-- ============================================

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n\nYou can track your request anytime in the hub.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_confirmed';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#eef4ff;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#3955cf;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#3955cf;letter-spacing:-0.3px;">In Progress</p>\n  </div>\n</td></tr></table>\n\nWe''ll let you know as soon as it''s ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_in_progress';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed. Your equipment is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Ready</p>\n  </div>\n</td></tr></table>\n\nCome by the IT desk whenever you''re ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_ready';

-- ═══════════════════════════════════════════════════════════
-- 063_personal_info_collection.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 063: Public personal-info collection for onboarding
-- The new hire fills in their personal email through a public link
-- shared by the admin requester. The submission auto-links back to
-- the it_request via a unique token.
-- ============================================

-- Token on each onboarding it_request
ALTER TABLE it_requests
  ADD COLUMN IF NOT EXISTS personal_info_token UUID DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_it_requests_personal_info_token
  ON it_requests(personal_info_token);

-- Backfill any existing onboarding rows missing a token
UPDATE it_requests
SET personal_info_token = uuid_generate_v4()
WHERE personal_info_token IS NULL;

-- Submissions table
CREATE TABLE IF NOT EXISTS personal_info_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  it_request_id UUID NOT NULL REFERENCES it_requests(id) ON DELETE CASCADE,
  personal_email VARCHAR(255) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT personal_info_submissions_request_unique UNIQUE (it_request_id)
);

CREATE INDEX IF NOT EXISTS idx_personal_info_submissions_request
  ON personal_info_submissions(it_request_id);

-- RLS: admin reads everything; public can insert via the token (handled
-- in the API layer using the token as a filter)
ALTER TABLE personal_info_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage personal info submissions"
  ON personal_info_submissions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow anonymous inserts (the public form posts here without auth);
-- we rely on the it_request_id being resolved server-side from the
-- public token, so the public can't forge submissions for arbitrary
-- requests.
CREATE POLICY "Public can submit personal info"
  ON personal_info_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow public read of (token → first_name/last_name) so the form
-- can greet the new hire by name. Restrict columns via a view.
CREATE OR REPLACE VIEW public_onboarding_token AS
  SELECT
    personal_info_token AS token,
    data->>'first_name' AS first_name,
    data->>'last_name'  AS last_name,
    data->>'company'    AS company,
    EXISTS (SELECT 1 FROM personal_info_submissions s WHERE s.it_request_id = it_requests.id) AS already_submitted
  FROM it_requests
  WHERE type = 'onboarding';

GRANT SELECT ON public_onboarding_token TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════
-- 064_profiles_fk_set_null.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 064: User-deletion safety — ON DELETE SET NULL
-- Switching every profiles FK that should preserve history away from
-- the default (RESTRICT) so admins can delete a profile without
-- hitting onboarding_emails_created_by_fkey / similar violations.
-- ============================================

-- Helper: rebuild a FK with ON DELETE SET NULL
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT conname, conrelid::regclass AS tbl, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'profiles'::regclass
      AND a.attname IN (
        'created_by', 'requested_by', 'approved_by', 'reviewed_by',
        'requester_id', 'assigned_by', 'invited_by'
      )
      AND pg_get_constraintdef(c.oid) NOT LIKE '%ON DELETE SET NULL%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%ON DELETE CASCADE%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', rec.tbl, rec.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I %s ON DELETE SET NULL',
      rec.tbl, rec.conname, rec.def
    );
    RAISE NOTICE 'Patched FK % on %', rec.conname, rec.tbl;
  END LOOP;
END $$;

-- Belt-and-braces: also handle the specific constraint that triggered
-- the user-reported violation, in case the loop above missed it.
ALTER TABLE onboarding_emails
  DROP CONSTRAINT IF EXISTS onboarding_emails_created_by_fkey;
ALTER TABLE onboarding_emails
  ADD CONSTRAINT onboarding_emails_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════
-- 065_drop_personal_info_add_onboarding_confirmation.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 065: Remove in-app personal info form, add onboarding
-- confirmation template that reminds the requester to send the
-- PERSONAL INFORMATION form via HR (out-of-band).
-- ============================================

-- ─── Drop the in-app personal info collection ──────────────────
DROP VIEW IF EXISTS public_onboarding_token;
DROP TABLE IF EXISTS personal_info_submissions CASCADE;
ALTER TABLE it_requests DROP COLUMN IF EXISTS personal_info_token;

-- ─── Onboarding confirmation template ──────────────────────────
INSERT INTO email_templates (template_key, name, subject, body, description, format, category, is_active) VALUES
(
  'onboarding_confirmation',
  'Onboarding Request Confirmed',
  'Onboarding request received for {{new_hire_name}}',
  E'Hi {{requester_name}},\n\nYour onboarding request for **{{new_hire_name}}** has been received and the IT team will start processing it.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0;"><tr><td>\n  <div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;">\n    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">⚠️ Don''t forget</p>\n    <p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Send the <strong>PERSONAL INFORMATION form</strong> to {{new_hire_name}} via HR so we can deliver the welcome materials to their personal email.</p>\n  </div>\n</td></tr></table>\n\nWe''ll let you know as soon as the corporate account is ready.\n\nBest,\nThe VO Hub Team',
  'Sent to the requester (IT admin) when an onboarding request is submitted. Includes the HR reminder to send the PERSONAL INFORMATION form.',
  'html',
  'onboarding',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
  description = EXCLUDED.description, format = EXCLUDED.format,
  category = EXCLUDED.category, is_active = true;

-- ═══════════════════════════════════════════════════════════
-- 066_it_inventory.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 066: IT inventory — editable spreadsheet
-- One row per asset (laptop / desktop / etc.) with the financial
-- columns needed to compute residual value, amortisation, deductible.
-- ============================================

CREATE TABLE IF NOT EXISTS it_inventory_items (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            VARCHAR(255) NOT NULL DEFAULT '',
  company         VARCHAR(255) DEFAULT '',
  device_type     VARCHAR(50)  DEFAULT '',    -- 'Mac' | 'PC' | other
  owner           VARCHAR(255) DEFAULT '',    -- "PROPRI" column
  ram             VARCHAR(50)  DEFAULT '',
  serial_number   VARCHAR(255) DEFAULT '',
  labo_care       VARCHAR(255) DEFAULT '',
  leasing_start   DATE,
  leasing_end     DATE,
  warranty_end    DATE,
  access_notes    TEXT          DEFAULT '',
  purchase_price  NUMERIC(12,2) DEFAULT 0,
  residual_value  NUMERIC(12,2) DEFAULT 0,
  deductible_pct  NUMERIC(5,2)  DEFAULT 15,    -- "% de franchise"
  notes           TEXT          DEFAULT '',
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_it_inventory_company ON it_inventory_items(company);
CREATE INDEX IF NOT EXISTS idx_it_inventory_device_type ON it_inventory_items(device_type);

CREATE TRIGGER update_it_inventory_items_updated_at
  BEFORE UPDATE ON it_inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE it_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage IT inventory" ON it_inventory_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════
-- 067_soft_delete.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 067: Soft-delete on profiles / requests / products
-- Add deleted_at column + RLS filter so admins can keep history
-- without violating FKs that don't ON DELETE SET NULL (rare).
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loan_requests_deleted_at ON loan_requests(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_it_requests_deleted_at ON it_requests(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mailbox_requests_deleted_at ON mailbox_requests(deleted_at) WHERE deleted_at IS NULL;

-- Helper RPC: soft-delete a row by id from a known table
CREATE OR REPLACE FUNCTION soft_delete(table_name TEXT, row_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF table_name NOT IN ('profiles','products','loan_requests','it_requests','mailbox_requests') THEN
    RAISE EXCEPTION 'soft_delete: table % not allowed', table_name;
  END IF;
  EXECUTE format('UPDATE %I SET deleted_at = NOW() WHERE id = $1', table_name) USING row_id;
END;
$$;

REVOKE ALL ON FUNCTION soft_delete FROM PUBLIC;
GRANT EXECUTE ON FUNCTION soft_delete TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 068_qr_serial_number.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 068: Serial number on QR codes
-- Tie a physical asset (laptop / camera / etc.) to a QR via its
-- serial number so scanning the QR shows which specific unit it is.
-- ============================================

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255) DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_qr_codes_serial
  ON qr_codes(serial_number)
  WHERE serial_number IS NOT NULL AND serial_number <> '';

-- Refresh the convenience view so the scanner gets the serial number too.
-- Note: qr_kits + qr_kit_items were dropped in migration 048; we don't
-- reference them here anymore.
DROP VIEW IF EXISTS qr_codes_with_details;
CREATE OR REPLACE VIEW qr_codes_with_details AS
SELECT
    qc.id,
    qc.code,
    qc.label,
    qc.serial_number,
    qc.is_active,
    qc.product_id,
    qc.created_at,
    qc.updated_at,
    p.name AS product_name,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    p.description AS product_description,
    c.name AS category_name,
    c.color AS category_color
FROM qr_codes qc
JOIN products p ON qc.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

GRANT SELECT ON qr_codes_with_details TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 069_drop_unused_email_templates.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 069: Drop email templates with no runtime sender
-- Audit confirmed nobody calls them; keep the table clean so the
-- admin Communications page doesn't list dangling rows.
-- ============================================

DELETE FROM email_templates
WHERE template_key IN (
  'request_overdue',           -- no scheduled cron in this codebase
  'request_return_confirmed'   -- no QR-return hook wired up either
);

-- ═══════════════════════════════════════════════════════════
-- 070_user_cancel_own_requests.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 070: Let users cancel their own pending requests
-- Until now only admins could DELETE rows from loan/it/mailbox_requests,
-- which silently broke the "Cancel request" button on /my-requests.
-- ============================================

-- ─── loan_requests ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own pending requests" ON loan_requests;
CREATE POLICY "Users can delete own pending requests" ON loan_requests
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Users can delete own pending request items" ON loan_request_items;
CREATE POLICY "Users can delete own pending request items" ON loan_request_items
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM loan_requests r
    WHERE r.id = loan_request_items.request_id
      AND r.user_id = auth.uid()
      AND r.status = 'pending'
  ));

-- ─── it_requests ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own pending it_requests" ON it_requests;
CREATE POLICY "Users can delete own pending it_requests" ON it_requests
  FOR DELETE
  USING (requester_id = auth.uid() AND status = 'pending');

-- ─── mailbox_requests ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own pending mailbox_requests" ON mailbox_requests;
CREATE POLICY "Users can delete own pending mailbox_requests" ON mailbox_requests
  FOR DELETE
  USING (requester_id = auth.uid() AND status = 'pending');

-- ═══════════════════════════════════════════════════════════
-- 071_user_notes_no_cancel.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 071: Replace user-side cancel with a "note to admin"
-- - Drop the DELETE policies from 070 (users can no longer cancel)
-- - Add a user_notes TEXT column on loan_requests + mailbox_requests
--   (it_requests already stores everything inside data jsonb)
-- - Make sure users can UPDATE their own pending rows so they can
--   write / edit that note. The UI only exposes the notes field.
-- ============================================

DROP POLICY IF EXISTS "Users can delete own pending requests"         ON loan_requests;
DROP POLICY IF EXISTS "Users can delete own pending request items"    ON loan_request_items;
DROP POLICY IF EXISTS "Users can delete own pending it_requests"      ON it_requests;
DROP POLICY IF EXISTS "Users can delete own pending mailbox_requests" ON mailbox_requests;

-- ─── user_notes column on tables that don't already have data{} ───
ALTER TABLE loan_requests    ADD COLUMN IF NOT EXISTS user_notes TEXT DEFAULT '';
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS user_notes TEXT DEFAULT '';

-- ─── UPDATE policies on it_requests / mailbox_requests ───────────
-- loan_requests already has "Users can update own draft/pending requests"
DROP POLICY IF EXISTS "Users can update own pending it_requests" ON it_requests;
CREATE POLICY "Users can update own pending it_requests" ON it_requests
  FOR UPDATE
  USING      (requester_id = auth.uid() AND status = 'pending')
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Users can update own pending mailbox_requests" ON mailbox_requests;
CREATE POLICY "Users can update own pending mailbox_requests" ON mailbox_requests
  FOR UPDATE
  USING      (requested_by = auth.uid() AND status = 'pending')
  WITH CHECK (requested_by = auth.uid() AND status = 'pending');

-- ═══════════════════════════════════════════════════════════
-- 072_mailbox_confirmation_structured.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 072: Restructure mailbox_confirmation
-- Replace markdown "**label** value" lines with a proper HTML
-- details card matching the canonical email design used by every
-- other template (request_confirmed, request_ready, etc.).
-- ============================================

UPDATE email_templates SET
    subject = 'Your functional mailbox has been created',
    body = E'Hi {{requester_name}},\n\nYour functional mailbox has been created and is ready to use.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Mailbox</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">{{mailbox_email}}</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Project</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{project_name}}</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Display name</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{display_name}}</div>\n  </td></tr>\n</table>\n\n{{onepassword_section}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'mailbox_confirmation';

-- ═══════════════════════════════════════════════════════════
-- 073_import_it_inventory.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 073: Import IT inventory from Excel
-- Adds 'model' column + imports 72 assets from INVENTAIRE_IT_clean.xlsx
-- ============================================

ALTER TABLE it_inventory_items ADD COLUMN IF NOT EXISTS model VARCHAR(255) DEFAULT '';

-- Wipe any test rows so the spreadsheet matches the source-of-truth Excel
TRUNCATE TABLE it_inventory_items;

-- 72 rows
INSERT INTO it_inventory_items (name, company, device_type, model, owner, ram, serial_number, labo_care, leasing_start, leasing_end, warranty_end, access_notes, purchase_price, residual_value, deductible_pct, notes) VALUES
('Clarisse Kanama', 'VO EUR', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD1292GN7', '', NULL, NULL, '2024-10-24', 'Clarisse Kanama (https://app.notion.com/p/Clarisse-Kanama-552bbecf85ca4ff59fc5f353ebb3a706?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Michel Culot', 'VO GROUP', 'Other', '', 'VO', '', '5CD83252WB', '', NULL, '2021-10-08', NULL, 'Michel Culot (https://app.notion.com/p/Michel-Culot-fff4e1fdff848195948fe4fcd57f55b3?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Elisa Germeau', 'VO EUR', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD1292GLG', '', NULL, '2024-12-02', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Olivier Gelleroy', 'SERIAL', 'PC', 'Elite Book 650 G9', 'OLINN', '16 Go', '5CD3104TKM', '', '2023-06-01', '2026-06-01', NULL, 'Olivier Gelleroy (https://app.notion.com/p/Olivier-Gelleroy-46df5eb7a80b4406a9edbb9a4a8c98d8?pvs=21)', 1099.69, 109.97, 15, 'iCloud: No | Warranty checked: Yes'),
('Robin Verlant', 'VO EUR', 'PC', 'Elite Book 650 G9', 'OLINN', '16 Go', '5CD3104TL3', '', '2023-06-01', '2026-06-01', NULL, 'Robin Verlant (https://app.notion.com/p/Robin-Verlant-ea9dfe0861da42648a131785e42ef5af?pvs=21)', 1099.69, 109.97, 15, 'iCloud: No | Warranty checked: Yes'),
('Patrick Parmentier', 'VO GROUP', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD130G4W8C', '', NULL, '2023-11-17', NULL, 'Patrick Parmentier (https://app.notion.com/p/Patrick-Parmentier-fff4e1fdff84811c894dd6cbd370555d?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Pietro Gioia', 'VO EUR', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD0517HSL', '', NULL, '2024-05-06', NULL, 'Pietro Gioia (https://app.notion.com/p/Pietro-Gioia-b528717534d2441aa03fcb1f95339f49?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Mònica Estebanez', 'VO EVENT', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5C01292GNK', '', NULL, '2024-04-08', NULL, 'Mònica Estebanez (https://app.notion.com/p/M-nica-Estebanez-132856d69b984f3099102536f1628207?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Zineb Alouafi', 'VO GROUP', 'PC', 'PROBOOK 450 G6', 'SYREMAT', '8 Go', '5CD1292GN7', '', NULL, '2023-02-16', NULL, 'Zineb Alouafi (https://app.notion.com/p/Zineb-Alouafi-21e4e1fdff84808e88e6d171d7693cae?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Pierre Danger', 'VO GROUP', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD20234K5', '', NULL, '2025-03-30', NULL, 'Pierre Danger (https://app.notion.com/p/Pierre-Danger-bee184111d53450b863f1383bbf5e56f?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Nicolas Vanderseypen', 'THE LITTLE VOICE', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD130G4N6', '', NULL, '2023-11-16', NULL, 'Nicolas Vanderseypen (https://app.notion.com/p/Nicolas-Vanderseypen-6caf9a7a2f1b42e1a1c972b837bbd864?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Alice Segers', 'VO EVENT', 'Mac', 'MacBook Air 13" - M1', 'OLINN', '8 Go', 'HXJK141E1WFV', '', '2023-12-01', '2026-11-30', NULL, 'Alice Segers (https://app.notion.com/p/Alice-Segers-6099f0da99874a2d995ee41dee893387?pvs=21)', 1007.44, 100.74, 15.0, 'iCloud: Yes | Warranty checked: Yes'),
('FREE', 'FREE', 'Mac', 'MacBook Air 13" - M1', 'OLINN', '8 Go', 'HXJK13WF1WFV - OK', '', '2023-12-01', '2026-11-30', NULL, '', 1007.44, 100.74, 15, 'iCloud: No | Warranty checked: Yes'),
('Romane Van der Vennet', 'VO GROUP', 'Mac', 'MacBook Air 13" - M1', 'OLINN', '8 Go', 'HXJK14151WFV', '', '2023-12-01', '2026-11-30', NULL, 'Romane Van der Vennet (https://app.notion.com/p/Romane-Van-der-Vennet-5af2425694e2476dbf85c584f808ad5d?pvs=21)', 1007.44, 100.74, 15, 'iCloud: No | Warranty checked: Yes'),
('Laura André', 'VO EUR', 'Mac', 'MacBook Air 13" - M1', 'OLINN', '8 Go', 'HXJK141C1WFV', '', '2023-12-01', '2026-11-30', NULL, 'Laura André (https://app.notion.com/p/Laura-Andr-a3cdf02414794fb48d0cecedf99b5292?pvs=21)', 1007.44, 100.74, 15, 'iCloud: No | Warranty checked: Yes'),
('Elena Zovi', 'VO EUR', 'PC', 'Elite Book 650 G9', 'OLINN', '16 Go', '5CD3104TL7', '', '2023-06-01', '2026-06-01', NULL, 'Elena Zovi (https://app.notion.com/p/Elena-Zovi-7bb81f4956d04a12903cae0c105fd07b?pvs=21)', 1099.69, 109.97, 15, 'iCloud: No | Warranty checked: Yes'),
('Carole Maton (LOST)', 'VO GROUP', 'PC', 'Elite Book 650 G9', 'OLINN', '16 Go', '5CD3104TL9', '', '2023-06-01', '2026-06-01', NULL, 'Carole Maton (https://app.notion.com/p/Carole-Maton-804796e4b2724e35b1d2f63766087043?pvs=21)', 1099.69, 109.97, 15, 'iCloud: No | Warranty checked: Yes'),
('Lucas Westendorp', 'VO EUR', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD1292GMQ', '', NULL, '2024-09-06', NULL, 'Lucas Westendorp (https://app.notion.com/p/Lucas-Westendorp-920ddd6462a5439e94a83497f4cb2bbc?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Dimitri Bertrand', 'VO EVENT', 'PC', 'Elite Book 650 G9', 'OLINN', '16 Go', '5CD3104TLS', '', '2023-06-01', '2026-06-01', NULL, 'Dimitri Bertrand (https://app.notion.com/p/Dimitri-Bertrand-dd9b6f2153ac4c9fb6905c87fb82de69?pvs=21)', 1099.69, 109.97, 15, 'iCloud: No | Warranty checked: Yes'),
('OLD - Héloïse Nolet', 'DEFECT', 'Mac', 'MacBook Air 13" - M1', 'OLINN', '8 Go', 'HXJK13121WFV', '', '2023-12-01', '2026-11-30', NULL, 'Héloïse Nolet (https://app.notion.com/p/H-lo-se-Nolet-195f5edfd66740c6aee7f934446d0052?pvs=21)', 1007.44, 100.74, 15, 'iCloud: No | Warranty checked: Yes'),
('Cécilia Rédei', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'FF63TF2PW4', '', '2023-10-30', '2026-10-30', NULL, 'Cécilia Rédei (https://app.notion.com/p/C-cilia-R-dei-2892270e3c2f41d4825dfdf4fabca4f7?pvs=21)', 1023.55, 102.36, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Giulia Rossi', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'HYR4LRFQMP', '', '2023-10-30', '2026-10-30', NULL, 'Giulia Rossi (https://app.notion.com/p/Giulia-Rossi-89d52e69a0c5426ea556462c792fc067?pvs=21)', 1023.55, 102.36, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Lindsay Poznanski', 'VO EVENT', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'LY56N473WR', '', '2023-10-30', '2026-10-30', NULL, 'Lindsay Poznanski (https://app.notion.com/p/Lindsay-Poznanski-d3e294521aa249dfa987757f7f930861?pvs=21)', 1023.55, 102.36, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Laurie Crayssac', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'JYD6QV14FL', '', '2023-10-30', '2026-10-30', NULL, 'Laurie Crayssac (https://app.notion.com/p/Laurie-Crayssac-b6cd860a13a74f06a209fa054ce9597a?pvs=21)', 1023.55, 102.36, 15.0, 'iCloud: Yes | Warranty checked: Yes'),
('Laura Anglaret', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'C9V4L7KT27', '', '2023-10-30', '2026-10-30', NULL, 'Laura Anglaret (https://app.notion.com/p/Laura-Anglaret-b513db5fc93046008c3de2370812bcdd?pvs=21)', 1023.55, 102.36, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Mariya Humenyuk', 'VO EUR', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD1292GMD', '', NULL, '2024-10-24', NULL, 'Mariya Humenyuk (https://app.notion.com/p/Mariya-Humenyuk-1a8438909386487c94eb9621c6f74615?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Laura Gualotuna', 'VO GROUP', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD201342M', '', NULL, '2025-06-08', NULL, 'Laura Gualotuna (https://app.notion.com/p/Laura-Gualotuna-c23dfdd432214d8eba8c90f18399ead5?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('FREE', 'FREE', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD118CYYT', '', NULL, '2024-07-11', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Nathalie Janssen', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'DCJYL92JF0', '', '2024-03-01', '2027-03-01', NULL, 'Nathalie Janssen (https://app.notion.com/p/Nathalie-Janssen-8ce84431afe64dc99c4bce93c69df7b5?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Jean-Camille Massot', 'VO GROUP', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'FR4KV95T63', '', '2024-03-01', '2027-03-01', NULL, 'Jean-Camille Massot (https://app.notion.com/p/Jean-Camille-Massot-1fc4e1fdff8480d0973fed544c6770ce?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: Yes | Warranty checked: Yes'),
('Alix de Montjoye', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'H41GL493QP', '', '2024-03-01', '2027-03-01', NULL, 'Alix de Montjoye (https://app.notion.com/p/Alix-de-Montjoye-d63c33e80f5a45d6bb8eca977d1d679c?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Laure Meunier', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'HJ5QYAKQ4V', '', '2024-03-01', '2027-03-01', NULL, 'Laure Meunier (https://app.notion.com/p/Laure-Meunier-07ab72e190d4414ca310fcad3a130adc?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Gabriella Bianchini', 'THE LITTLE VOICE', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'MY5YWC5WTQ', '', '2024-03-01', '2027-03-01', NULL, 'Gabriella Bianchini (https://app.notion.com/p/Gabriella-Bianchini-573cfe79da4b48ceb7e2e8d0fdff59de?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Laurence Leloup', 'THE LITTLE VOICE', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'HQVVR76WLH', '', '2024-03-01', '2027-03-01', NULL, 'Laurence Leloup (https://app.notion.com/p/Laurence-Leloup-28da403a1e8c4cb6b668ae03f7a483cb?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Manon Glauden', 'VO GROUP', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'LW4PKPY6DL', '', '2024-03-01', '2027-03-01', NULL, 'Manon Glauden (https://app.notion.com/p/Manon-Glauden-a26099f9f47246beb795c732633357d1?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Olivier Vernimmen', 'VO EVENT', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'H42WFXQY92 - OK', '', '2024-03-01', '2027-03-01', NULL, 'Olivier Vernimmen (https://app.notion.com/p/Olivier-Vernimmen-1814e1fdff8480549164fed5cec10e5f?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: Yes | Warranty checked: Yes'),
('Virginie de Munter', 'VO EVENT', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'X9R9950JLX', '', '2024-06-07', '2027-06-07', NULL, 'Virginie De Munter (https://app.notion.com/p/Virginie-De-Munter-5e63881c76884f6b881cdc88b9a6dfc2?pvs=21)', 990.91, 99.09, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Carole Maton', 'VO GROUP', 'PC', 'PROBOOK 450 G8', 'VO', '16 Go', '5CD20135C4', '', NULL, '2025-02-03', NULL, 'Carole Maton (https://app.notion.com/p/Carole-Maton-804796e4b2724e35b1d2f63766087043?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Héloïse Nolet', 'VO GROUP', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'LCL9FQJ2YC', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SLCL9FQJ2YC?csf=1&web=1&e=z6ph3w', '2024-09-26', '2027-09-25', NULL, 'Héloïse Nolet (https://app.notion.com/p/H-lo-se-Nolet-195f5edfd66740c6aee7f934446d0052?pvs=21)', 880.0, 88.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Clarisse Kanama', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'FD4YYJWWQT', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SFD4YYJWWQT?csf=1&web=1&e=trd2r6', '2024-09-26', '2027-09-25', NULL, 'Clarisse Kanama (https://app.notion.com/p/Clarisse-Kanama-552bbecf85ca4ff59fc5f353ebb3a706?pvs=21)', 880.0, 88.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Kaja Zalewska', 'VO EUR', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'DWJRPYX1K3', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SDWJRPYX1K3?csf=1&web=1&e=dIdOpF', '2024-09-26', '2027-09-25', NULL, 'Kaja Zalewska-Dufour (https://app.notion.com/p/Kaja-Zalewska-Dufour-484004d3e55c45cf84b685e85546d69c?pvs=21)', 880.0, 88.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Thomas Boydens (Temp)', 'THE LITTLE VOICE', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'H9FNK4VXX9', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SH9FNK4VXX9?csf=1&web=1&e=N9vCeD', '2024-09-26', '2027-09-25', NULL, '', 880.0, 88.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Elise Warrant', 'VO GROUP', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'H69H6GXCH9', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SH69H6GXCH9?csf=1&web=1&e=Qod7Pl', '2024-09-26', '2027-09-25', NULL, 'Elise Warrant (https://app.notion.com/p/Elise-Warrant-1a6af9753b1c4f8d87bb14f9c0a1723f?pvs=21)', 880.0, 88.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Thomas Boydens', 'DEFECT', 'Mac', 'MacBook Pro M3 - 14"', 'OLINN', '16 Go', 'HPKX1T22KD', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SHPKX1T22KD?csf=1&web=1&e=T4fzSx', '2024-09-26', '2027-09-25', NULL, 'Thomas Boydens (https://app.notion.com/p/Thomas-Boydens-22a4e1fdff8480ea868ac56b183a14b8?pvs=21)', 1809.0, 180.9, 30.0, 'iCloud: No | Warranty checked: Yes'),
('Michaël Desmet', 'THE LITTLE VOICE', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'D9MV6JWWY6', '', '2024-06-07', '2027-06-07', NULL, 'Michaël Desmet (https://app.notion.com/p/Micha-l-Desmet-98dd2364e52641749e6319bba62c590a?pvs=21)', 990.91, 99.09, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Vitor Ponciano', 'VO GROUP', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'M6Y3466L2Q', '', '2024-06-07', '2027-06-07', NULL, 'Vitor Ponciano (https://app.notion.com/p/Vitor-Ponciano-1b54e1fdff84804283fef5a5729b2138?pvs=21)', 990.91, 99.09, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Axelle Museur', 'VO EVENT', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'JV0436C7NM', '', '2024-03-01', '2027-03-01', NULL, 'Axelle Museur (https://app.notion.com/p/Axelle-Museur-2104e1fdff84800d9d08f6e63755a82f?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Gaëlle Van Wettere', 'VO GROUP', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'F7P633VD2L', '', '2024-06-07', '2027-06-07', NULL, 'Gaëlle Van Wettere (https://app.notion.com/p/Ga-lle-Van-Wettere-5a2a659c78154970a36c88fd921447ef?pvs=21)', 990.91, 99.09, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Marine Truyens', 'VO EVENT', 'Mac', 'MacBook Air 13" - M2', '', '8 Go', 'LDLQ904MF4', '', '2024-06-07', '2027-06-07', NULL, 'Marine Truyens (https://app.notion.com/p/Marine-Truyens-5d47963315ba4f08ac75e891dfb4d6e7?pvs=21)', 990.91, 99.09, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Elise Charrondière', 'VO EVENT', 'Mac', 'MacBook Air 13" - M2', 'OLINN', '8 Go', 'R20L2Y9GCH', '', '2024-03-01', '2027-03-01', NULL, 'Elise Charrondière (https://app.notion.com/p/Elise-Charrondi-re-1b43eab572e9463abf856777788975ff?pvs=21)', 1040.0, 104.0, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Zoi Stergioula', 'VO EUR', 'PC', 'PROBOOK 450 G8', 'VO', '16 Go', '5CD20133V7', '', NULL, '2025-06-02', NULL, 'Zoi Stergioula (https://app.notion.com/p/Zoi-Stergioula-1e54e1fdff848066acaef3ea74da1998?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: Yes'),
('Mihaela Petre', 'THE LITTLE VOICE', 'Mac', 'MacBook Pro M4 Pro - 14"', 'OLINN', '24 Go', 'HJH222PKQ2Y', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SHJH22PKQ2Y?csf=1&web=1&e=iGaqcX', '2025-07-17', '2028-07-17', NULL, 'Mihaela Petre (https://app.notion.com/p/Mihaela-Petre-f4a17e479c0a47caab37f1dd8c925e8b?pvs=21)', 1961.23, 196.12, 15.0, 'iCloud: No | Warranty checked: No'),
('Tim', 'THE LITTLE VOICE', 'Mac', 'MacBook Pro M4 Pro - 14"', 'OLINN', '24 Go', 'GW72PPFQRT', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SGW72PPFQRT?csf=1&web=1&e=bvrE29', '2025-07-17', '2028-07-17', NULL, 'Timothée Leskens (https://app.notion.com/p/Timoth-e-Leskens-e83128fdb8624093a47ac3119cb93ad7?pvs=21)', 1961.23, 196.12, 15.0, 'iCloud: No | Warranty checked: No'),
('Camille Vandenschrick', 'MAX', 'Mac', 'MacBook Air 13" - M3', 'OLINN', '16 Go', 'L9WVD9M2Y4', '', NULL, NULL, NULL, 'Camille Vandenschrick (https://app.notion.com/p/Camille-Vandenschrick-2104e1fdff84803ca7f7d4ebe75eabfd?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Emmanuelle Indekeu', 'AOP', 'Mac', 'MacBook Air 13" - M3', 'OLINN', '16 Go', 'LHH6YQW360', '', NULL, NULL, NULL, 'Emmanuelle Indekeu (https://app.notion.com/p/Emmanuelle-Indekeu-2b84e1fdff84800ca8b2ea2a5b4f6656?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('', '', 'Mac', 'MacBook Pro M1 PRO - 14"', '', '', '', '', NULL, NULL, NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Marine Larson', 'VO EUR', 'Mac', 'MacBook Air 13" - M3', 'OLINN', '16 Go', 'L64PYYC6TC', '', NULL, NULL, NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Nasrin Amin', 'VO EUR', 'Mac', 'MacBook Air 13" - M4', 'OLINN', '16 Go', 'FMXMR6WNPQ', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SFMXMR6WNPQ?csf=1&web=1&e=T2wNko', '2026-01-21', '2029-01-21', NULL, 'Nasrin Amin (https://app.notion.com/p/Nasrin-Amin-17c2073a798f43d5864f3562d62d2fdf?pvs=21)', 862.25, 86.23, 15.0, 'iCloud: No | Warranty checked: Yes'),
('Sven ven de Kerchove', 'THE LITTLE VOICE', 'Mac', 'MacBook Air 13" - M4', 'LAB9', '16 Go', 'D9Y207MXLR', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SD9Y207MXLR?csf=1&web=1&e=GteGoa', '2026-01-21', '2029-01-21', NULL, 'Sven van de Kerchove (https://app.notion.com/p/Sven-van-de-Kerchove-1f44e1fdff8480778744dd1c64ced985?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: Yes'),
('Thomas Boydens (Temp 2)', 'THE LITTLE VOICE', 'Mac', 'MacBook Air 13" - M4', 'LAB9', '16 Go', 'GDJX9PRFPD', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SGDJX9PRFPD?csf=1&web=1&e=DreF8h', '2026-01-21', '2029-01-21', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: Yes'),
('FREE', 'FREE', 'Mac', 'MacBook Air 13" - M4', 'LAB9', '16 Go', 'DRWNRL9RRV', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SDRWNRL9RRV?csf=1&web=1&e=RdtX3G', '2026-01-21', '2029-01-21', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: Yes'),
('Louise Vercheval', 'VO EUR', 'Mac', 'MacBook Air 13" - M4', 'LAB9', '16 Go', 'LPJ7THL63G', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SLPJ7THL63G?csf=1&web=1&e=OCC77Q', '2026-01-21', '2029-01-21', NULL, 'Louise Vercheval (https://app.notion.com/p/Louise-Vercheval-1364e1fdff84806e9535e94488a11e18?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: Yes'),
('???', 'SIGN', 'Mac', 'MacBook Pro M4 MAX', 'OLINN', '36 Go', 'DC0456MPM4', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SDC0456MPM4?csf=1&web=1&e=wnLWxd', '2025-11-24', '2031-11-24', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('???', 'SIGN', 'Mac', 'MacBook Pro M4 MAX', 'OLINN', '64 Go', 'FM2TP947M3', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SDC0456MPM4?csf=1&web=1&e=wnLWxd', '2025-06-25', '2031-06-25', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('???', 'SIGN', 'Mac', 'MacBook Pro M4 MAX', 'OLINN', '36 Go', 'KJ296Y39RP', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SKJ296Y39RP?csf=1&web=1&e=GLE5UJ', '2025-11-24', '2031-11-24', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Nijat Muradi', 'VO EUR', 'PC', 'PROBOOK 450 G8', 'SYREMAT', '8 Go', '5CD130G4PD', '', NULL, '2023-11-16', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('FREE', 'VO EUR', 'PC', 'HP ProBook 4 G1iR 16"', 'LAB9', '16 Go', '1H85492FKMC', '', '2026-04-23', '2029-04-22', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('FREE', 'FREE', 'PC', 'HP ProBook 4 G1iR 16"', 'LAB9', '16 Go', '1H85492FP7', '', '2026-04-23', '2029-04-22', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('FREE', 'FREE', 'PC', 'HP ProBook 4 G1iR 16"', 'LAB9', '16 Go', '1H85492FNY', '', '2026-04-23', '2029-04-22', NULL, '', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Thomas Boydens (New)', 'THE LITTLE VOICE', 'Mac', 'MacBook Pro M4 Pro - 14"', 'OLINN', '16 Go', 'KY42LTX219', 'https://vogroupbxl.sharepoint.com/:f:/r/sites/VOGROUPSUPPORT-BudgetIT/Documents%20partages/Budget%20IT/_LEASING/LAB9%20CARE%20-%20ALL/SGDJX9PRFPD?csf=1&web=1&e=DreF8h', '2026-04-23', NULL, NULL, 'Thomas Boydens (https://app.notion.com/p/Thomas-Boydens-22a4e1fdff8480ea868ac56b183a14b8?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: No'),
('Carole Maton (NEW)', 'VO GROUP', 'PC', 'HP ProBook 4 G1iR 16"', 'LAB9', '16 Go', '1H85492FN9', '', '2026-04-23', '2029-04-22', NULL, 'Carole Maton (https://app.notion.com/p/Carole-Maton-804796e4b2724e35b1d2f63766087043?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: Yes'),
('Zoi Stergioula (NEW)', 'VO EUR', 'PC', 'HP ProBook 4 G1iR 16"', 'LAB9', '16 Go', '1H85492DQ4', '', '2026-04-23', '2029-04-22', NULL, 'Zoi Stergioula (https://app.notion.com/p/Zoi-Stergioula-1e54e1fdff848066acaef3ea74da1998?pvs=21)', 0, 0.0, 15, 'iCloud: No | Warranty checked: Yes');

-- ═══════════════════════════════════════════════════════════
-- 074_unify_email_templates.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 074: Unify ALL email templates on the mailbox_confirmation
-- layout — single white bordered card with uppercase labels and
-- bold values, no more coloured "STATUS" pill blocks.
-- ============================================

-- ─── request_confirmed ─────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request has been received',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Pending</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Request</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;text-transform:capitalize;">{{request_type}}</div>\n  </td></tr>\n</table>\n\nYou can track your request anytime in the hub.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'request_confirmed';

-- ─── request_in_progress ───────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is being prepared',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">In Progress</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Request</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;text-transform:capitalize;">{{request_type}}</div>\n  </td></tr>\n</table>\n\nWe''ll let you know as soon as it''s ready.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'request_in_progress';

-- ─── request_ready ─────────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is ready',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed and is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Ready</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Request</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;text-transform:capitalize;">{{request_type}}</div>\n  </td></tr>\n</table>\n\nCome by the IT desk whenever you''re ready.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'request_ready';

-- ─── request_return_reminder ───────────────────────────────────
UPDATE email_templates SET
    subject = 'Reminder: {{product_name}} due back on {{return_date}}',
    body = E'Hi {{requester_name}},\n\nFriendly reminder that **{{product_name}}** is due for return on **{{return_date}}**. Please bring the equipment to the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Equipment</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">{{product_name}}</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Return date</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{return_date}}</div>\n  </td></tr>\n</table>\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'request_return_reminder';

-- ─── onboarding_confirmation ───────────────────────────────────
UPDATE email_templates SET
    subject = 'Onboarding request received for {{new_hire_name}}',
    body = E'Hi {{requester_name}},\n\nYour onboarding request for **{{new_hire_name}}** has been received and the IT team will start processing it.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Pending</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">New hire</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{new_hire_name}}</div>\n  </td></tr>\n</table>\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;"><tr><td>\n  <div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;">\n    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">Don''t forget</p>\n    <p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Send the <strong>PERSONAL INFORMATION form</strong> to {{new_hire_name}} via HR so we can deliver the welcome materials to their personal email.</p>\n  </div>\n</td></tr></table>\n\nWe''ll let you know as soon as the corporate account is ready.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'onboarding_confirmation';

-- ─── user_invitation ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'You''re invited to join VO Hub',
    body = E'Hi {{first_name}},\n\nWelcome aboard! You''ve been invited to join **VO Hub**.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Sign in with</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">Your Microsoft account</div>\n  </td></tr>\n</table>\n\nYour access is configured and ready to go.\n\n{{cta:Get started|{{login_url}}}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'user_invitation';

-- ═══════════════════════════════════════════════════════════
-- 075_dynamic_subject_row.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 075: Make the 2nd card row dynamic per request type
-- The "Request: equipment" row becomes "{{subject_label}}: {{subject_name}}"
-- where the code resolves it per type:
--   onboarding  → "New hire: <name>"
--   offboarding → "Person leaving: <name>"
--   mailbox     → "Mailbox: <email>"
--   equipment   → "Project: <name>" (or fallback "Request: Equipment")
-- ============================================

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Pending</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">{{subject_label}}</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{subject_name}}</div>\n  </td></tr>\n</table>\n\nYou can track your request anytime in the hub.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_confirmed';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">In Progress</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">{{subject_label}}</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{subject_name}}</div>\n  </td></tr>\n</table>\n\nWe''ll let you know as soon as it''s ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_in_progress';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed and is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Ready</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">{{subject_label}}</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{subject_name}}</div>\n  </td></tr>\n</table>\n\nCome by the IT desk whenever you''re ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_ready';

-- ═══════════════════════════════════════════════════════════
-- 076_status_emails_with_items.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 076: Add {{items_html}} to status templates so equipment
-- loan emails show the items requested (with images) below the card.
-- For non-equipment requests the variable resolves to '' and the row
-- collapses cleanly.
-- ============================================

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">In Progress</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">{{subject_label}}</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{subject_name}}</div>\n  </td></tr>\n</table>\n\n{{items_html}}\n\nWe''ll let you know as soon as it''s ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_in_progress';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed and is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Ready</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">{{subject_label}}</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{subject_name}}</div>\n  </td></tr>\n</table>\n\n{{items_html}}\n\nCome by the IT desk whenever you''re ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_ready';

-- ═══════════════════════════════════════════════════════════
-- 077_final_template_cleanup.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================
-- MIGRATION 077: Drop any leftover unused templates so the admin
-- communications page only shows what's actually wired up to code.
-- Idempotent — safe to re-run.
-- ============================================

DELETE FROM email_templates
WHERE template_key NOT IN (
  'user_invitation',
  'request_confirmed',
  'request_in_progress',
  'request_ready',
  'request_return_reminder',
  'onboarding_confirmation',
  'mailbox_confirmation'
);

-- ═══════════════════════════════════════════════════════════
-- 078_rename_vo_gear_hub_to_vo_hub.sql
-- ═══════════════════════════════════════════════════════════
-- Rename "VO Gear Hub" to "VO Hub" across stored data.

-- Update default for hub_main_title column (only affects new rows / restores).
ALTER TABLE app_settings ALTER COLUMN hub_main_title SET DEFAULT 'VO Hub';

-- Update existing app_settings rows still using the old name.
UPDATE app_settings
SET hub_main_title = 'VO Hub'
WHERE hub_main_title = 'VO Gear Hub';

-- Update any email templates that still reference the old brand name.
UPDATE email_templates
SET body = REPLACE(body, 'VO Gear Hub', 'VO Hub')
WHERE body LIKE '%VO Gear Hub%';

UPDATE email_templates
SET subject = REPLACE(subject, 'VO Gear Hub', 'VO Hub')
WHERE subject LIKE '%VO Gear Hub%';

-- ═══════════════════════════════════════════════════════════
-- 079_ensure_email_branding_columns.sql
-- ═══════════════════════════════════════════════════════════
-- Ensure email branding columns exist (migration 014 may not have run
-- on every environment). Safe to re-run thanks to IF NOT EXISTS.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS email_tagline VARCHAR(120) DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_logo_height INTEGER DEFAULT 0;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 080_request_reminder_tracking.sql
-- ═══════════════════════════════════════════════════════════
-- Reminder tracking columns for the daily-reminders edge function.
--   onboarding_reminder_sent_at: timestamp the 2-days-before reminder
--   was emailed to the IT admin (one-shot per request).
--   offboarding_reminder_last_sent_at: timestamp of the last daily
--   pre-departure nudge sent to the onboarding's original requester
--   (used to avoid sending more than once per UTC day).

ALTER TABLE it_requests
  ADD COLUMN IF NOT EXISTS onboarding_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offboarding_reminder_last_sent_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 081_loan_requests_pickup_return_contact.sql
-- ═══════════════════════════════════════════════════════════
-- Allow the cart flow to capture who physically picks up / returns the gear
-- when that's not the same person as the requester (often an assistant
-- submits on behalf of someone else).

ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS pickup_contact TEXT,
  ADD COLUMN IF NOT EXISTS return_contact TEXT;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 082_mailbox_form_field_tweaks.sql
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- 083_shared_mailboxes.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Shared mailboxes (FMB) inventory — the functional mailboxes set
-- up across the various entities. Mirrors the legacy Notion table
-- so an admin can see at a glance who owns what and when it
-- archives / deletes.
-- =============================================================

CREATE TABLE IF NOT EXISTS shared_mailboxes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mail VARCHAR(255),                    -- the actual email address
  company VARCHAR(100),                 -- VO GROUP, VO EUR, VO EVENT, MIT, …
  category VARCHAR(30),                 -- LEGER / MOYEN / LOURD
  created_in VARCHAR(30),               -- AD / Cloud / …
  created_time TIMESTAMPTZ,             -- creation timestamp from the source
  archive_from DATE,
  archive_to DATE,
  delete_on DATE,
  display_name VARCHAR(255),            -- the sender name people see
  have_access TEXT,                     -- comma-separated list of accessors
  job_title VARCHAR(255),
  licence VARCHAR(60),                  -- SHARED MAILBOX, Plan 1, O365 Premium, ARCHIVED
  licence_checked BOOLEAN DEFAULT FALSE,
  profile VARCHAR(60),                  -- WORK MAILBOX, ARCHIVED, EMPLOYEE
  project_leader VARCHAR(255),          -- free text — matched by name against profiles
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_mailboxes_company ON shared_mailboxes (company);
CREATE INDEX IF NOT EXISTS idx_shared_mailboxes_project_leader ON shared_mailboxes (project_leader);
CREATE INDEX IF NOT EXISTS idx_shared_mailboxes_mail ON shared_mailboxes (mail);

CREATE TRIGGER update_shared_mailboxes_updated_at
  BEFORE UPDATE ON shared_mailboxes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE shared_mailboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared mailboxes are viewable by authenticated users" ON shared_mailboxes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify shared mailboxes" ON shared_mailboxes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 084_mailbox_agency_to_company.sql
-- ═══════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════
-- 085_qr_codes_request_link.sql
-- ═══════════════════════════════════════════════════════════
-- Link each QR code to the request it was assigned through, so we can
-- hydrate the admin equipment request screen with the QR codes already
-- in flight on page load — instead of having to rely on a local React
-- state that vanishes the moment the admin reloads.
--
--   qr_codes.loan_request_id      → the loan_request the code currently
--                                   serves (NULL while available).
--   qr_codes.loan_request_item_id → the specific loan_request_items row
--                                   (= product slot) it occupies, so two
--                                   slots of the same product stay
--                                   independent.
-- Both are nullable and ON DELETE SET NULL — removing a request keeps
-- the QR codes around, just frees them.

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS loan_request_id UUID REFERENCES loan_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loan_request_item_id UUID REFERENCES loan_request_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_loan_request_id
  ON qr_codes(loan_request_id) WHERE loan_request_id IS NOT NULL;

-- Refresh the qr_codes_with_details view so the front-end gets the new
-- columns straight away.
DROP VIEW IF EXISTS qr_codes_with_details CASCADE;
CREATE VIEW qr_codes_with_details AS
SELECT
    qr.*,
    p.name AS product_name,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    c.name AS category_name,
    c.color AS category_color
FROM qr_codes qr
LEFT JOIN products p ON qr.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 086_welcome_blocks_vo_hub_and_lean_defaults.sql
-- ═══════════════════════════════════════════════════════════
-- Trim the default welcome email to what an IT admin actually wants every
-- new hire to see + add a 'VO Hub' block so the new joiner is pointed at
-- the internal portal from day one.
--
-- Adds a default_enabled flag (was previously implicit-true on the table)
-- so we can ship blocks that exist but stay off by default — the admin
-- can still toggle them on per composition.

ALTER TABLE onboarding_block_templates
  ADD COLUMN IF NOT EXISTS default_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Lean defaults: only the blocks that matter to almost every new hire.
UPDATE onboarding_block_templates SET default_enabled = TRUE
WHERE block_key IN (
  'salutation', 'email_info', 'password',
  'building_info', 'teams', 'wifi',
  'closing', 'signature_admin'
);

-- Optional/situational — kept in the bank but off by default.
UPDATE onboarding_block_templates SET default_enabled = FALSE
WHERE block_key IN (
  'it_security', 'email_signature', 'sharepoint',
  'image_rights', 'faq_it', 'cta_link'
);

-- Insert the new VO Hub invitation block (idempotent on block_key).
INSERT INTO onboarding_block_templates (
  block_key, label_fr, label_en,
  default_content_fr, default_content_en,
  default_options, default_enabled, icon, sort_order
) VALUES (
  'vo_hub',
  'Le VO Hub',
  'The VO Hub',
  E'Ta porte d''entrée pour toutes les demandes IT : équipement, accès, mailbox fonctionnelles, suivi de tes demandes — tout passe par le hub.\n\nConnecte-toi avec ton compte Microsoft VO (**{{email}}**) — pas besoin de créer un compte.',
  E'Your one-stop entry for every IT request: equipment, access, functional mailboxes, request tracking — it all goes through the hub.\n\nSign in with your VO Microsoft account (**{{email}}**) — no need to create one.',
  jsonb_build_object(
    'url', 'https://catalog-mu-sage.vercel.app/',
    'label_fr', 'Ouvrir le VO Hub',
    'label_en', 'Open the VO Hub'
  ),
  TRUE,
  'Sparkles',
  35  -- between Microsoft Teams (8 → 80 after we re-spread) and WiFi (9 → 90)
)
ON CONFLICT (block_key) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  label_en = EXCLUDED.label_en,
  default_content_fr = EXCLUDED.default_content_fr,
  default_content_en = EXCLUDED.default_content_en,
  default_options = EXCLUDED.default_options,
  default_enabled = EXCLUDED.default_enabled,
  icon = EXCLUDED.icon;

-- Re-spread sort_order so the new block sits between Teams and WiFi.
UPDATE onboarding_block_templates SET sort_order = CASE block_key
  WHEN 'salutation'       THEN 10
  WHEN 'email_info'       THEN 20
  WHEN 'password'         THEN 30
  WHEN 'building_info'    THEN 40
  WHEN 'it_security'      THEN 50
  WHEN 'email_signature'  THEN 60
  WHEN 'sharepoint'       THEN 70
  WHEN 'teams'            THEN 80
  WHEN 'vo_hub'           THEN 85
  WHEN 'wifi'             THEN 90
  WHEN 'image_rights'     THEN 100
  WHEN 'faq_it'           THEN 110
  WHEN 'cta_link'         THEN 120
  WHEN 'closing'          THEN 130
  WHEN 'signature_admin'  THEN 140
  ELSE sort_order
END;

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 087_product_stock_atomic_helpers.sql
-- ═══════════════════════════════════════════════════════════
-- Atomic stock decrement / increment helpers — so two parallel QR
-- assignments (or a quantity-2 single-admin assignment that reads a
-- stale cached product_stock both times) can't silently desync the
-- catalog count.
--
-- The previous JS path did `set total_stock = (cached_value - 1)`
-- which, when the cached_value was the same for both writes (e.g.
-- the user assigned 2 codes in a row from the same page load),
-- decremented by 1 once instead of by 1 twice.

CREATE OR REPLACE FUNCTION decrement_product_stock(p_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_new INTEGER;
BEGIN
  UPDATE products
  SET total_stock = GREATEST(0, COALESCE(total_stock, 0) - 1)
  WHERE id = p_id
  RETURNING total_stock INTO v_new;
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION increment_product_stock(p_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_new INTEGER;
BEGIN
  UPDATE products
  SET total_stock = COALESCE(total_stock, 0) + 1
  WHERE id = p_id
  RETURNING total_stock INTO v_new;
  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_product_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_product_stock(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 088_rls_privacy_patches.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 088 — RLS privacy patches (T1, T2, T3 from RLS audit)
--
-- Tightens three SELECT policies that were 'visible to any
-- authenticated user' — which on a multi-tenant-ish internal hub
-- like VO is a privacy leak (one employee can read every other
-- employee's QR assignments / scan history / shared mailbox list).
--
-- Each block DROPs the loose policy and recreates a tight pair
-- (user sees their own, admin sees all). No table touched outside
-- the policies themselves.
-- =============================================================


-- ─── T1: qr_codes — was visible to any authenticated user ─────
--
-- Allowed any logged-in user to enumerate every QR code in the
-- catalog together with assigned_to / assigned_to_name /
-- assigned_to_email. Now scoped: a regular user only sees codes
-- assigned to themselves; admins keep full visibility (needed by
-- /admin/qr-codes and /admin/requests/:id assignment flows).

DROP POLICY IF EXISTS "QR codes are viewable by authenticated users" ON public.qr_codes;

CREATE POLICY "Users can view own QR codes" ON public.qr_codes
    FOR SELECT
    USING (assigned_to = auth.uid());

CREATE POLICY "Admins can view all QR codes" ON public.qr_codes
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── T2: qr_scan_logs — was visible to any authenticated user ─
--
-- Same problem: any user could read every scan event (who scanned
-- which device, when). Scoped: user sees their own scans only;
-- admins keep full visibility for /admin/scan-logs.

DROP POLICY IF EXISTS "Scan logs are viewable by authenticated users" ON public.qr_scan_logs;

CREATE POLICY "Users can view own scan logs" ON public.qr_scan_logs
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all scan logs" ON public.qr_scan_logs
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── T3: shared_mailboxes — was visible to any authenticated user
--
-- Exposed the 130-row FMB inventory (functional mailboxes, project
-- leaders, who-has-access list, archive / delete schedules) to every
-- employee. /admin/shared-mailboxes is the only UI that consumes it
-- and it sits under RequireAdmin, so we lock SELECT to admins.
--
-- (If, later, regular users need to see the FMBs they personally
-- lead or have access to, add a second policy matching them by
-- name / email against project_leader / have_access — see commented
-- example at the bottom.)

DROP POLICY IF EXISTS "Shared mailboxes are viewable by authenticated users" ON public.shared_mailboxes;

CREATE POLICY "Admins can view all shared mailboxes" ON public.shared_mailboxes
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Optional future extension — uncomment if/when the user-side panel
-- needs to surface 'mailboxes I lead or have access to':
--
-- CREATE POLICY "Users can view mailboxes they lead or access" ON public.shared_mailboxes
--     FOR SELECT
--     USING (
--         project_leader ILIKE '%' || (
--             SELECT first_name || ' ' || last_name
--             FROM public.profiles WHERE id = auth.uid()
--         ) || '%'
--         OR have_access ILIKE '%' || (
--             SELECT email FROM public.profiles WHERE id = auth.uid()
--         ) || '%'
--     );


NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 089_version_baseline_policies.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 089 — Version the 'ghost' baseline policies that live
-- on profiles / products / categories / locations + close two
-- holes the export from production exposed.
--
-- Context: those four tables have policies in prod (migration 005
-- and earlier created the tables, plus manual Studio tweaks) but
-- the policies were never committed to git. That makes the
-- baseline opaque — nobody can tell from the repo what's actually
-- enforced. This migration re-declares each one explicitly with
-- DROP-then-CREATE so the state is unambiguous and auditable.
--
-- Two real fixes ride along:
--   * locations.SELECT was still 'true' (anyone, even
--     unauthenticated, could enumerate office addresses). The
--     supposed fix from 031 didn't take. Re-applied here.
--   * products.SELECT was 'true'. Catalog is behind login already
--     so the practical leak is small, but defense in depth says
--     require auth.
--
-- profiles.SELECT stays open to authenticated users — it's needed
-- by the offboarding autocomplete (ProfileAutocomplete fetches all
-- profiles to filter client-side). If/when we add a backend layer
-- we should expose a narrow /api/users/search endpoint and tighten
-- profiles.SELECT to admin-only. Documented inline.
-- =============================================================


-- ─── locations ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Locations are viewable by everyone"           ON public.locations;
DROP POLICY IF EXISTS "Locations are viewable by authenticated users" ON public.locations;
DROP POLICY IF EXISTS "Only admins can modify locations"             ON public.locations;

CREATE POLICY "Locations are viewable by authenticated users" ON public.locations
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify locations" ON public.locations
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── products ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Products are viewable by everyone"            ON public.products;
DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON public.products;
DROP POLICY IF EXISTS "Only admins can modify products"              ON public.products;

CREATE POLICY "Products are viewable by authenticated users" ON public.products
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify products" ON public.products
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── categories ───────────────────────────────────────────────
-- Taxonomy — kept readable without auth so the catalog can render
-- before the session resolves. Modifications stay admin-only.
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Only admins can modify categories"  ON public.categories;

CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can modify categories" ON public.categories
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── profiles ─────────────────────────────────────────────────
-- NOTE: SELECT intentionally stays open to authenticated users.
-- It's required by the offboarding form's ProfileAutocomplete and
-- by admin user listing. The data exposed (first_name, last_name,
-- email, business_unit, avatar_url, role, is_active, job_title,
-- department, phone, azure_oid) is the same set Outlook's Global
-- Address List exposes to every employee, so the privacy boundary
-- is acceptable for an internal hub.
--
-- Migration path when we add a backend layer:
--   1. Expose /api/users/search returning only safe columns.
--   2. Tighten profiles.SELECT to admin-only.
--   3. Replace ProfileAutocomplete's direct .from('profiles') call
--      with a call to /api/users/search.

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"                 ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile"                ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile"                ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.profiles profiles_1
                WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin')
    );

CREATE POLICY "Admins can delete any profile" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM public.profiles profiles_1
                WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin')
    );


NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 090_edge_function_rate_limits.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 090 — Rate limit ledger for Edge Functions.
--
-- Lightweight log of every Edge Function invocation. Each function
-- counts how many recent rows match (user, function) before doing
-- the real work and refuses to proceed past a configured threshold.
-- Used by:
--   * send-email      — caps per-user e-mail bursts so a buggy
--                       loop in the front-end can't drain the
--                       Resend quota or get the sender domain
--                       flagged as spam.
--   * daily-reminders — refuses to re-run within 23h so a misfired
--                       cron / curl can't blast every leaver with
--                       repeated nudges.
--
-- Rows older than 30 days are trimmed by a daily pg_cron job
-- (defined further down) to keep the table cheap.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.edge_function_calls (
    id            BIGSERIAL PRIMARY KEY,
    function_name TEXT NOT NULL,
    user_id       UUID,
    called_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_edge_function_calls_lookup
    ON public.edge_function_calls (function_name, user_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_function_calls_recent
    ON public.edge_function_calls (function_name, called_at DESC);

-- RLS: only writable from the service-role-key paths inside the
-- edge functions themselves. Admins can read the audit trail; no
-- end-user-facing access.
ALTER TABLE public.edge_function_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read edge function calls" ON public.edge_function_calls;
CREATE POLICY "Admins can read edge function calls" ON public.edge_function_calls
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Daily cleanup so the table doesn't grow forever. Uses pg_cron
-- which is already enabled for the daily-reminders schedule.
SELECT cron.unschedule('edge_function_calls_cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'edge_function_calls_cleanup');

SELECT cron.schedule(
  'edge_function_calls_cleanup',
  '15 3 * * *',
  $$DELETE FROM public.edge_function_calls WHERE called_at < NOW() - INTERVAL '30 days';$$
);

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
-- 091_real_inventory_catalog.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 091 — Replace the catalog with the real VO inventory.
--
-- Wipes the existing demo products / QR codes / cart items and
-- rebuilds the catalog from the Excel inventory provided on
-- 2026-06-11. Categories are reset to what the inventory actually
-- contains; obsolete demo categories disappear via CASCADE.
--
-- Stock figures and QR codes are sized 1:1 with the physical
-- inventory so the cart's max-per-product check, the offboarding
-- auto-detect and the assignment flow can all reason about real
-- units instead of demo seed data.
--
-- Sensitive per-device data (IMEI, SIM, PIN, WiFi passwords) lives
-- in migration 092 (it_device_credentials, admin-only). Don't put
-- any of that in this file.
-- =============================================================

BEGIN;

-- ─── 1. Wipe ──────────────────────────────────────────────────
-- products → qr_codes → cart_items via CASCADE on the FK chain.
-- user_equipment.product_id is ON DELETE SET NULL so existing
-- assignments stay around but lose their catalog pointer (intent:
-- "the laptop the person currently holds was a demo product that
-- doesn't exist anymore — keep the row, drop the link").

TRUNCATE TABLE
  products,
  categories,
  qr_codes,
  cart_items,
  qr_scan_logs,
  qr_reservations,
  qr_waitlist,
  qr_reminders_sent
RESTART IDENTITY CASCADE;


-- ─── 2. Categories from the real inventory ────────────────────

INSERT INTO categories (name, color) VALUES
  ('iPads',        '#0a7a3b'),   -- iPad Air / iPad Pro
  ('Phones',       '#3955cf'),   -- iPhones (all generations)
  ('Routers',      '#a16207'),   -- 4G / 5G routers, fixed + mobile
  ('Tablets',      '#b91c1c'),   -- VO-1 → VO-53 fleet
  ('Accessories',  '#525f7f');   -- MagSafe, cables, keyboards, etc.


-- ─── 3. Products ───────────────────────────────────────────────
-- One row per distinct SKU. total_stock matches the count physically
-- on the shelf so the cart can refuse a 6th iPad Air automatically.

WITH cat AS (
  SELECT id, name FROM categories
)
INSERT INTO products (name, description, category_id, total_stock, is_visible)
SELECT v.name, v.description, c.id, v.stock, true
FROM (VALUES
  -- iPads -----------------------------------------------------
  ('iPad Air',              'iPad Air — Wi-Fi, MPQ03FD/A',              'iPads',        5),
  ('iPad Pro',              'iPad Pro — Wi-Fi, MNXF3NF/A',              'iPads',        2),

  -- Phones (one row per model so we can track per-model stock) -
  ('iPhone 6',              'iPhone 6 — legacy device, no iOS updates', 'Phones',       1),
  ('iPhone 7',              'iPhone 7',                                 'Phones',       1),
  ('iPhone 8',              'iPhone 8',                                 'Phones',       2),
  ('iPhone SE',             'iPhone SE (1st gen)',                       'Phones',       1),
  ('iPhone SE (2020)',      'iPhone SE 2nd gen (2020)',                 'Phones',       1),
  ('iPhone XR',             'iPhone XR',                                'Phones',       1),
  ('iPhone 13',             'iPhone 13 — event fleet (#1 → #4)',         'Phones',       4),
  ('iPhone 13 Pro Max',     'iPhone 13 Pro Max — flagship spare',        'Phones',       1),
  ('iPhone 15 Pro Max',     'iPhone 15 Pro Max — flagship spare',        'Phones',       1),

  -- Routers ---------------------------------------------------
  ('Routeur 4G Fixe',       '4G fixed router (TP-Link, deposit unit)',   'Routers',      3),
  ('Routeur 4G Mobile',     '4G pocket router',                         'Routers',      2),

  -- Tablets ---------------------------------------------------
  ('Tablette VO',           'Event tablet — VO-1 … VO-53 fleet',         'Tablets',     53),

  -- Accessories -----------------------------------------------
  ('MagSafe Charger',       'MagSafe charger',                          'Accessories',  3),
  ('Lightning to HDMI',     'Lightning to HDMI adapter',                'Accessories',  1),
  ('Chargeur USB-C + Câble','USB-C charger + cable kit',                'Accessories', 10),
  ('HDMI Cable',            'HDMI cable',                               'Accessories', 10),
  ('Keyboard',              'USB / Bluetooth keyboard',                 'Accessories',  5),
  ('Mouse',                 'USB / Bluetooth mouse',                    'Accessories',  5),
  ('Power Strip',           'Multi-socket power strip',                 'Accessories', 10),
  ('Printer Laser B&W A4',  'Brother B&W A4 laser printer (small)',     'Accessories',  1)
) AS v(name, description, cat_name, stock)
JOIN cat c ON c.name = v.cat_name;


-- ─── 4. Regenerate QR codes ───────────────────────────────────
-- One code per stock unit, format VO-<SLUG>-NNN, all 'available'.
-- The slug strips non-alphanum, uppercases, caps at 16 chars so
-- VO-IPHONE13PROMAX-001 stays readable on a label.

INSERT INTO qr_codes (code, product_id, label, is_active, status)
SELECT
  'VO-' || substring(regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g'), 1, 16) || '-' || lpad(n::text, 3, '0'),
  p.id,
  p.name || ' #' || lpad(n::text, 3, '0'),
  true,
  'available'
FROM products p
CROSS JOIN LATERAL generate_series(1, p.total_stock) AS n;


-- ─── 5. Sanity check (read-only output) ────────────────────────

SELECT
  p.name,
  c.name AS category,
  p.total_stock AS stock,
  COUNT(qc.id) AS qr_count,
  MIN(qc.code) AS first_code,
  MAX(qc.code) AS last_code
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN qr_codes qc ON qc.product_id = p.id
GROUP BY p.id, p.name, c.name, p.total_stock
ORDER BY c.name, p.name;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 092_device_credentials.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 092 — Sensitive per-device credentials.
--
-- IMEI, SIM ICCID, PIN, WiFi password, MAC, phone number — all
-- the per-device data the Excel inventory was tracking but that
-- doesn't belong in the public products / qr_codes tables. Linked
-- 1:1 to a qr_codes row so the admin UI can join straight from the
-- equipment list. RLS is admin-only.
--
-- Run after 091 (otherwise the qr_codes referenced below don't
-- exist yet).
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.it_device_credentials (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  qr_code_id        UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,

  -- Identification
  imei              TEXT,        -- iPhones + routers
  mac_address       TEXT,        -- routers only
  serial_number     TEXT,        -- per-device serial when known

  -- Cellular
  sim_iccid         TEXT,        -- the long SIM serial
  sim_pin           TEXT,        -- SIM PIN code
  phone_number      TEXT,        -- voice / data number associated with the SIM
  carrier           TEXT,

  -- WiFi (routers only)
  wifi_ssid         TEXT,
  wifi_password     TEXT,
  router_password   TEXT,        -- the router's admin web UI password

  -- OS
  os_version        TEXT,        -- iOS X.Y, Android Z, …

  -- Free-form
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (qr_code_id)
);

CREATE INDEX IF NOT EXISTS idx_device_credentials_imei ON public.it_device_credentials (imei);
CREATE INDEX IF NOT EXISTS idx_device_credentials_phone_number ON public.it_device_credentials (phone_number);

CREATE TRIGGER trg_it_device_credentials_updated_at
  BEFORE UPDATE ON public.it_device_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── RLS: admin-only, no end-user read ───────────────────────
ALTER TABLE public.it_device_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage device credentials" ON public.it_device_credentials;
CREATE POLICY "Admins can manage device credentials" ON public.it_device_credentials
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─── Import the Excel sensitive data ─────────────────────────
-- Phones first (one row per QR code we generated in 091). The
-- 'code' join key follows the VO-<SLUG>-NNN convention.

WITH phone_data (code, imei, phone_number, sim_iccid, sim_pin, serial_number, os_version, notes) AS (VALUES
  -- iPhone 8 — two units
  ('VO-IPHONE8-001',         '356395104246966',      '0478 79 45 92', '2100422207458', '7465', NULL,            '16.6', '1 - iPhone 8'),
  ('VO-IPHONE8-002',         '356395104507698',      '0478 79 68 63', '2100422207417', '8750', NULL,            '16.6', '2 - iPhone 8'),

  -- iPhone SE (2020)
  ('VO-IPHONESE2020-001',    '356785117951992',      '0475 60 06 32', '2100411960034', '2514', NULL,            NULL,   '6 - iPhone SE (2020)'),

  -- iPhone 6
  ('VO-IPHONE6-001',         '353025091413161',      '0470 80 38 94', '2100453481584', '6000', NULL,            '12.5.7 — no more updates', '4 - iPhone 6'),

  -- iPhone XR
  ('VO-IPHONEXR-001',        '356456102243585',      '0470 80 38 93', '2100453481600', '9919', NULL,            '17.5.1', '3 - iPhone XR'),

  -- iPhone 13 Pro Max
  ('VO-IPHONE13PROMAX-001',  '356579550794617',      '0476 95 07 65', '2100446707806', '1228', NULL,            '16.6', 'VO - 13-PM - #1'),

  -- iPhone SE (1st gen)
  ('VO-IPHONESE-001',        '359142076745204',       NULL,             NULL,             NULL,   NULL,            '15.7.8', '7 - iPhone SE'),

  -- iPhone 7
  ('VO-IPHONE7-001',          NULL,                  '0470 70 41 73', '2100446707772', '1880', NULL,            '15.7.8', '8 - iPhone 7'),

  -- iPhone 15 Pro Max
  ('VO-IPHONE15PROMAX-001',  '356642158472604',      '0470 80 06 67', '2100453481618', '9432', NULL,            '18',   'VO - 15-PM - #1'),

  -- iPhone 13 fleet (4 units)
  ('VO-IPHONE13-001',         NULL,                  '0470 60 04 87', '2100453481535', '4457', NULL,            NULL,   'VO - 13 - #1 — NE26 (Deniz/Alix)'),
  ('VO-IPHONE13-002',         NULL,                  '0470 60 06 54', '2100453481543', '8272', NULL,            NULL,   'VO - 13 - #2'),
  ('VO-IPHONE13-003',         NULL,                  '0470 60 08 33', '2100479233266', '5117', NULL,            NULL,   'VO - 13 - #3'),
  ('VO-IPHONE13-004',         NULL,                  '0470 60 08 73', '2100479233258', '2111', NULL,            NULL,   'VO - 13 - #4 — NE26 (Deniz/Alix)')
)
INSERT INTO public.it_device_credentials
  (qr_code_id, imei, phone_number, sim_iccid, sim_pin, serial_number, os_version, notes)
SELECT qc.id, p.imei, p.phone_number, p.sim_iccid, p.sim_pin, p.serial_number, p.os_version, p.notes
FROM phone_data p
JOIN public.qr_codes qc ON qc.code = p.code;


-- Routers (fixed + mobile). Routeur 1 / 2 / 3 = fixed (TP-Link),
-- Routeur Mobile - 1 / 2 = mobile pocket units.

WITH router_data (code, imei, mac_address, sim_iccid, sim_pin, phone_number, router_password, wifi_ssid, serial_number, notes) AS (VALUES
  ('VO-ROUTEUR4GFIXE-001',
     '866501041413766', '60-A4-B7-48-18-E9', '2100479233175 / 2100453481550', '9525',
     '0470 60 44 77 / 0470 75 02 76', '99064273', 'TP-LINK_18E9(_5G)', '22152H1004366',
     'Routeur 1 — fixed (Olivier Vernimmen)'),
  ('VO-ROUTEUR4GFIXE-002',
     '866501041786021', '10-27-F5-95-80-2F', '2100479233241 / 2100453481527', '2805',
     '0470 60 45 97 / 0470 70 36 37', '87445633', 'TP-LINK_802F(_5G)', '22172Y0004612',
     'Routeur 2 — fixed (Olivier Vernimmen)'),
  ('VO-ROUTEUR4GFIXE-003',
     '866501041524315', '60-A4-B7-90-ED-80', '2100453481576',                 '8382',
     '0470 80 09 28',                  '15950529', 'TP-LINK_ED80(_5G)', '2215211006101',
     'Routeur 3 — fixed (Olivier Vernimmen)'),
  ('VO-ROUTEUR4GMOBILE-001',
     '861806056426289', NULL,               '2100453481592',                 '8720',
     '0470 80 13 39',                  NULL,       NULL,                '22395F7003157',
     'Routeur Mobile - 1'),
  ('VO-ROUTEUR4GMOBILE-002',
     NULL,              NULL,               '2100479233233',                 '2703',
     '0470 60 23 35',                  '31306022', 'TP-Link_2C7D',       '2246378000744',
     'Routeur Mobile - 2')
)
INSERT INTO public.it_device_credentials
  (qr_code_id, imei, mac_address, sim_iccid, sim_pin, phone_number, router_password, wifi_ssid, serial_number, notes)
SELECT qc.id, r.imei, r.mac_address, r.sim_iccid, r.sim_pin, r.phone_number, r.router_password, r.wifi_ssid, r.serial_number, r.notes
FROM router_data r
JOIN public.qr_codes qc ON qc.code = r.code;


-- iPad Air + iPad Pro serial numbers (no SIM/IMEI, just SN).

WITH ipad_data (code, serial_number, notes) AS (VALUES
  ('VO-IPADAIR-001', 'XFM6X6JN9L', 'iPad Air | 1'),
  ('VO-IPADAIR-002', 'YX7PHCJ2F2', 'iPad Air | 2'),
  ('VO-IPADAIR-003', 'FRQOQNDXOV', 'iPad Air | 3'),
  ('VO-IPADAIR-004', 'Y3DXMQYMX1', 'iPad Air | 4'),
  ('VO-IPADAIR-005', 'NXRT62JJWG', 'iPad Air | 5'),
  ('VO-IPADPRO-001', 'H2TPYJQ65X', 'iPad Pro | 1'),
  ('VO-IPADPRO-002', 'L90VMM6G0G', 'iPad Pro | 2')
)
INSERT INTO public.it_device_credentials (qr_code_id, serial_number, notes)
SELECT qc.id, i.serial_number, i.notes
FROM ipad_data i
JOIN public.qr_codes qc ON qc.code = i.code;


-- Sanity check.
SELECT 'Credentials imported' AS step,
       (SELECT COUNT(*) FROM public.it_device_credentials) AS rows;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 093_seed_active_loans.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 093 — Mark QR codes that are physically loaned out.
--
-- Snapshot of the Excel "Prêts résumé" + "Events ongoing" tabs as
-- of 2026-06-11. Anything still in someone's hands today is flipped
-- to status='assigned' so the catalog stops offering them and the
-- /admin/qr-codes page shows who holds them.
--
-- We don't create matching loan_request rows — per spec the user
-- asked to "marquer les QR codes 'assigned' uniquement". Returns
-- get handled by the normal unassign flow from /admin/qr-codes.
--
-- Past loans (Jacopo Dec 2025, Martin Dec 2025, Luca Dec 2025,
-- Zoi May 2026, Giulia Mar 2026, Giada Mar 2026, Zineb Feb 2026)
-- are NOT seeded — they returned before this snapshot.
-- =============================================================

BEGIN;

UPDATE public.qr_codes
SET status            = 'assigned',
    assigned_to_name  = v.assigned_to_name,
    assigned_to_email = v.assigned_to_email,
    assigned_at       = v.assigned_at::timestamptz
FROM (VALUES
  -- iPhone 13 #1 / #4 — NE26 NATO Edge event 2026 (Deniz / Alix)
  ('VO-IPHONE13-001', 'Deniz Ozcelikel / Alix de Montjoye', 'denizozcelikel@vo-europe.eu', '2025-11-27 09:00:00'),
  ('VO-IPHONE13-004', 'Deniz Ozcelikel / Alix de Montjoye', 'denizozcelikel@vo-europe.eu', '2025-11-27 09:00:00'),

  -- Routeurs 1 / 2 / 3 fixed — Olivier Vernimmen (no end date in
  -- the source; flagged "Ongoing" in 'Pr ts résumé').
  ('VO-ROUTEUR4GFIXE-001', 'Olivier Vernimmen', 'overnimmen@vo-event.be', '2025-11-01 09:00:00'),
  ('VO-ROUTEUR4GFIXE-002', 'Olivier Vernimmen', 'overnimmen@vo-event.be', '2025-11-01 09:00:00'),
  ('VO-ROUTEUR4GFIXE-003', 'Olivier Vernimmen', 'overnimmen@vo-event.be', '2025-11-01 09:00:00')
) AS v(code, assigned_to_name, assigned_to_email, assigned_at)
WHERE public.qr_codes.code = v.code;


-- Sanity check.
SELECT
  qc.code,
  qc.status,
  qc.assigned_to_name,
  qc.assigned_at::date AS assigned_on
FROM public.qr_codes qc
WHERE qc.status = 'assigned'
ORDER BY qc.code;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 095_merge_ipads_into_tablets.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 095 — One "Tablets" category for everything iPad.
--
-- Current state after 091+094 left iPads in two buckets:
--   iPads   = 1 product  (the renamed Tablette VO fleet, 53 units)
--   Tablets = 2 products (iPad Air 5, iPad Pro 2)
-- Per Nadir: "un iPad c'est une tablette" — collapse both into a
-- single Tablets category (iPad Air + iPad Pro + iPad fleet =
-- 3 products / 60 units), then drop the empty iPads bucket.
--
-- Also resets the 5 example "assigned" QR codes from 093 back to
-- 'available' since nothing is actually in someone's hands today.
-- =============================================================

BEGIN;

-- ─── 1. Reset the 5 example "assigned" QR codes ──────────────
UPDATE public.qr_codes
SET status            = 'available',
    assigned_to       = NULL,
    assigned_to_name  = NULL,
    assigned_to_email = NULL,
    assigned_at       = NULL,
    loan_request_id   = NULL,
    loan_request_item_id = NULL
WHERE code IN (
  'VO-IPHONE13-001',
  'VO-IPHONE13-004',
  'VO-ROUTEUR4GFIXE-001',
  'VO-ROUTEUR4GFIXE-002',
  'VO-ROUTEUR4GFIXE-003'
);


-- ─── 2. Ensure a "Tablets" category exists ───────────────────
INSERT INTO public.categories (name, color)
VALUES ('Tablets', '#0a7a3b')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color;


-- ─── 3. Move every iPad product into "Tablets" ───────────────
-- Covers the case where Tablette VO was renamed to "iPad" in 094
-- and parked in iPads, plus the original iPad Air / iPad Pro.

UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE name = 'Tablets')
WHERE name IN ('iPad', 'iPad Air', 'iPad Pro')
   OR name = 'Tablette VO';  -- defensive: in case 094 never ran


-- ─── 4. Rename the fleet product to "iPad" if 094 didn't run ─
UPDATE public.products
SET name        = 'iPad',
    description = 'iPad — VO event fleet (53 units)'
WHERE name = 'Tablette VO';


-- ─── 5. Regenerate QR codes for the renamed fleet ────────────
-- Drop any leftover VO-TABLETTEVO-* labels and reissue VO-IPAD-NNN
-- so the codes match the new product name.

DELETE FROM public.qr_codes
WHERE code LIKE 'VO-TABLETTEVO-%';

INSERT INTO public.qr_codes (code, product_id, label, is_active, status)
SELECT 'VO-IPAD-' || lpad(n::text, 3, '0'),
       p.id,
       p.name || ' #' || lpad(n::text, 3, '0'),
       true,
       'available'
FROM public.products p
CROSS JOIN LATERAL generate_series(1, p.total_stock) AS n
WHERE p.name = 'iPad'
  AND NOT EXISTS (
    SELECT 1 FROM public.qr_codes qc
    WHERE qc.product_id = p.id
      AND qc.code = 'VO-IPAD-' || lpad(n::text, 3, '0')
  );


-- ─── 6. Drop the now-empty "iPads" category ──────────────────
DELETE FROM public.categories
WHERE name = 'iPads'
  AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE category_id = categories.id
  );


-- ─── 7. Sanity check ─────────────────────────────────────────
SELECT c.name AS category,
       COUNT(p.id) AS products,
       COALESCE(SUM(p.total_stock), 0) AS stock,
       (SELECT COUNT(*) FROM public.qr_codes qc
        JOIN public.products pp ON pp.id = qc.product_id
        WHERE pp.category_id = c.id) AS qr_count
FROM public.categories c
LEFT JOIN public.products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

SELECT 'Assigned QR codes after reset' AS step,
       COUNT(*) AS rows
FROM public.qr_codes
WHERE status = 'assigned';

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 096_rls_audit_patches.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 096 — RLS audit patches.
--
-- Phase-1 follow-up to migrations 088, 089, 031: a full re-read of
-- every CREATE POLICY across migrations 001-095 flagged 3 INSERT
-- policies that authenticate the caller but don't bind the row to
-- them. Two of those exist in this environment and are patched here.
--
-- The third (personal_info_submissions, migration 063) was a public
-- onboarding-token flow that was never deployed to this Supabase
-- instance and is no longer referenced by the client code, so it is
-- intentionally not part of this migration. If the flow gets
-- resurrected, ship the SECURITY DEFINER RPC + tightened policy as
-- part of that work.
-- =============================================================

BEGIN;


-- ─── 1. qr_reservations INSERT ──────────────────────────────
-- Before: WITH CHECK (auth.role() = 'authenticated'). No user_id
--         bind — any logged-in user could reserve in another user's
--         name.
-- After:  user_id = auth.uid() OR caller is admin.

DROP POLICY IF EXISTS "Users can create reservations" ON public.qr_reservations;
CREATE POLICY "Users can create reservations" ON public.qr_reservations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─── 2. qr_waitlist INSERT ──────────────────────────────────
-- Same shape, same fix.

DROP POLICY IF EXISTS "Users can join waitlist" ON public.qr_waitlist;
CREATE POLICY "Users can join waitlist" ON public.qr_waitlist
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─── Sanity check ────────────────────────────────────────────
SELECT 'rls audit patches applied' AS step,
       (SELECT COUNT(*) FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('qr_reservations','qr_waitlist')) AS policies_remaining;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 097_profile_theme_preference.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 097 — Persist a per-user theme preference.
--
-- Today the dark/light toggle only lives in localStorage, so the user
-- has to re-pick on every device + every cleared browser cache. Store
-- it on profiles so it follows the user once they sign in.
-- =============================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference TEXT
    CHECK (theme_preference IN ('light', 'dark', 'system'));

COMMENT ON COLUMN public.profiles.theme_preference IS
  'NULL = inherit app default; "light"/"dark"/"system" = user override';

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 098_onboarding_kit_link.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 098 — Link loan_requests back to the onboarding it_request
-- they were auto-reserved for.
--
-- Lets us:
--   1. Avoid duplicating the kit reservation if the admin clicks the
--      "Reserve kit" button twice (the SELECT in reserveOnboardingKit
--      checks this column for an existing row).
--   2. Surface "Kit reserved" status next to the onboarding card
--      without hitting a separate lookup.
-- =============================================================

BEGIN;

ALTER TABLE public.loan_requests
  ADD COLUMN IF NOT EXISTS onboarding_request_id UUID
    REFERENCES public.it_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_loan_requests_onboarding_request_id
  ON public.loan_requests (onboarding_request_id)
  WHERE onboarding_request_id IS NOT NULL;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 099_manager_role.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 099 — Re-introduce the "manager" role (HR / people-ops).
--
-- The role was dropped back in 025; bring it back as a middle tier
-- between 'user' and 'admin'. A manager can see the people-ops side
-- of the admin panel (onboarding, offboarding, mailbox requests,
-- planning) but NOT the sensitive inventory (QR codes, device
-- credentials, design, products, scan logs).
--
-- Enforcement is twofold:
--   1. Route guards on the client (RequireStaff + AdminOnly).
--   2. RLS stays admin-or-owner; managers don't get extra DB write
--      power here — they operate through the same it_requests /
--      mailbox_requests policies as before. If a manager needs to
--      mutate those, the existing "admin only" policies must be
--      widened in a follow-up. For now this migration only unlocks
--      the role value + read visibility through the existing
--      authenticated SELECT policies.
-- =============================================================

BEGIN;

-- 1. Widen the role check constraint to include 'manager'.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'manager', 'admin'));

-- 2. Helper: is the current user a manager OR admin? Used by any
--    RLS policy that wants to grant people-ops read/write later.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  );
$$;

-- 3. Let managers read + manage the people-ops request tables so the
--    HR view actually works. These mirror the existing admin policies
--    but broaden them to is_staff().
DO $$
BEGIN
  -- it_requests: managers can read every onboarding/offboarding row.
  DROP POLICY IF EXISTS "Staff can view all it_requests" ON public.it_requests;
  CREATE POLICY "Staff can view all it_requests" ON public.it_requests
    FOR SELECT USING (public.is_staff());

  DROP POLICY IF EXISTS "Staff can update it_requests" ON public.it_requests;
  CREATE POLICY "Staff can update it_requests" ON public.it_requests
    FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

  -- mailbox_requests: same idea.
  DROP POLICY IF EXISTS "Staff can view mailbox_requests" ON public.mailbox_requests;
  CREATE POLICY "Staff can view mailbox_requests" ON public.mailbox_requests
    FOR SELECT USING (public.is_staff());

  DROP POLICY IF EXISTS "Staff can update mailbox_requests" ON public.mailbox_requests;
  CREATE POLICY "Staff can update mailbox_requests" ON public.mailbox_requests
    FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Some people-ops table missing — skipped its staff policy';
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 100_audit_triggers.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 100 — Populate audit_logs via triggers.
--
-- The audit_logs table has existed since 001 but nothing ever wrote
-- to it. Attach a generic SECURITY DEFINER trigger to the tables that
-- matter for an "who did what" trail:
--   - loan_requests       (status changes, deletes)
--   - it_requests         (onboarding/offboarding status, deletes)
--   - qr_codes            (status / assignment changes)
--   - products            (create / update / delete)
--   - profiles            (role changes)
--   - it_device_credentials (any change — sensitive)
--
-- The trigger records the acting user (auth.uid()), the action, the
-- entity, and a compact diff. SECURITY DEFINER lets it write despite
-- the admin-only INSERT policy on audit_logs.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action     TEXT;
  v_entity_id  UUID;
  v_old        JSONB;
  v_new        JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_entity_id := OLD.id;
  ELSE -- UPDATE
    v_entity_id := NEW.id;
    -- For status-bearing tables, label the action by the status move.
    IF to_jsonb(NEW) ? 'status' AND (to_jsonb(OLD)->>'status') IS DISTINCT FROM (to_jsonb(NEW)->>'status') THEN
      v_action := 'status:' || COALESCE(to_jsonb(NEW)->>'status', '?');
    ELSIF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role THEN
      v_action := 'role:' || COALESCE(NEW.role, '?');
    ELSE
      v_action := 'update';
    END IF;
    -- Only keep changed keys in the diff to stay compact.
    v_old := (SELECT jsonb_object_agg(key, value)
              FROM jsonb_each(to_jsonb(OLD))
              WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key);
    v_new := (SELECT jsonb_object_agg(key, value)
              FROM jsonb_each(to_jsonb(NEW))
              WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key);
    -- Skip pure no-op updates (e.g. updated_at only) to avoid noise.
    IF v_action = 'update' AND (v_new - 'updated_at') = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_entity_id, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Attach to the audited tables.
DO $$
DECLARE
  t TEXT;
  audited TEXT[] := ARRAY[
    'loan_requests', 'it_requests', 'qr_codes',
    'products', 'profiles', 'it_device_credentials'
  ];
BEGIN
  FOREACH t IN ARRAY audited LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$s', t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.fn_audit()', t);
    END IF;
  END LOOP;
END $$;

-- Read view: join the acting user's name/email for the UI.
CREATE OR REPLACE VIEW public.audit_logs_with_details AS
SELECT
  a.*,
  p.first_name AS actor_first_name,
  p.last_name  AS actor_last_name,
  p.email      AS actor_email
FROM public.audit_logs a
LEFT JOIN public.profiles p ON p.id = a.user_id;

GRANT SELECT ON public.audit_logs_with_details TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 101_pickup_map.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 101 — App-wide pickup point (IT desk) + mini floor map.
--
-- The cart flow doesn't capture a per-request location (it's always
-- the IT desk), so a single app-wide pickup point on app_settings is
-- the right grain. Stores a name, written directions, an optional
-- floor-plan image and a pin position (0-100 %) to drop a marker on
-- that image.
-- =============================================================

BEGIN;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS pickup_location_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_directions    TEXT,
  ADD COLUMN IF NOT EXISTS pickup_map_url        TEXT,
  ADD COLUMN IF NOT EXISTS pickup_pin_x          NUMERIC,  -- 0..100 (% of image width)
  ADD COLUMN IF NOT EXISTS pickup_pin_y          NUMERIC;  -- 0..100 (% of image height)

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 102_auto_offboarding.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 102 — Auto-create an offboarding request 7 days before a
-- known departure.
--
-- Flow: admin sets profiles.departure_date on the user detail page.
-- A daily job creates a pre-filled offboarding it_request 7 days
-- before that date (idempotent — won't duplicate), so nobody forgets
-- to recover equipment / revoke access. Admins get an in-app notif.
-- =============================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS departure_date DATE;

COMMENT ON COLUMN public.profiles.departure_date IS
  'Known last working day. An offboarding request auto-spawns 7 days before.';

-- The worker. SECURITY DEFINER so the cron job (and a client fallback)
-- can insert it_requests + notifications regardless of the caller.
CREATE OR REPLACE FUNCTION public.auto_create_due_offboardings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r          RECORD;
  v_created  INTEGER := 0;
  v_req_id   UUID;
BEGIN
  FOR r IN
    SELECT p.*
    FROM public.profiles p
    WHERE p.departure_date IS NOT NULL
      -- fire once we're within 7 days of departure (covers missed days)
      AND p.departure_date <= CURRENT_DATE + 7
      AND p.departure_date >= CURRENT_DATE
      -- skip if an offboarding request already exists for this person
      AND NOT EXISTS (
        SELECT 1 FROM public.it_requests it
        WHERE it.type = 'offboarding'
          AND it.deleted_at IS NULL
          AND (
            it.requester_id = p.id
            OR lower(it.data->>'email') = lower(COALESCE(p.email, ''))
            OR (it.data->>'profile_id') = p.id::text
          )
      )
  LOOP
    INSERT INTO public.it_requests (type, status, requester_id, requester_name, requester_email, data)
    VALUES (
      'offboarding',
      'pending',
      r.id,
      TRIM(COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')),
      r.email,
      jsonb_build_object(
        'first_name', r.first_name,
        'last_name',  r.last_name,
        'email',      r.email,
        'business_unit', r.business_unit,
        'leaving_date', r.departure_date,
        'profile_id', r.id::text,
        'auto_created', true,
        'source', 'departure_date'
      )
    )
    RETURNING id INTO v_req_id;

    -- Notify every admin so it surfaces immediately.
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT a.id,
           'offboarding',
           'Offboarding auto-created',
           TRIM(COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ||
             ' leaves on ' || to_char(r.departure_date, 'DD Mon YYYY') || '. Review the offboarding.',
           '/admin/offboarding-requests'
    FROM public.profiles a
    WHERE a.role = 'admin';

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_create_due_offboardings() TO authenticated;

-- Schedule daily at 06:00 if pg_cron is available.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto-offboarding')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-offboarding');
    PERFORM cron.schedule('auto-offboarding', '0 6 * * *',
      'SELECT public.auto_create_due_offboardings();');
  ELSE
    RAISE NOTICE 'pg_cron not installed — rely on the client daily fallback';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule auto-offboarding cron: %', SQLERRM;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 103_push_subscriptions.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 103 — Web push subscriptions + auto-push on notification.
--
-- Stores each device's push subscription so the send-push edge
-- function can reach it. A trigger on `notifications` INSERT fires a
-- push to the target user's devices via pg_net (if available),
-- mirroring the in-app bell to the phone's lock screen.
--
-- Manual setup required (see PR notes):
--   1. npx web-push generate-vapid-keys
--   2. set VITE_VAPID_PUBLIC_KEY (client) + VAPID_PRIVATE_KEY /
--      VAPID_PUBLIC_KEY / VAPID_SUBJECT (edge function secrets)
--   3. deploy the send-push edge function
--   4. set app_settings-level config for the function URL below
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A user manages only their own subscriptions.
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Auto-push on new in-app notification ────────────────────
-- Uses pg_net to POST to the send-push edge function. Best-effort:
-- wrapped so a missing extension / unset config never blocks the
-- notification insert itself.
CREATE OR REPLACE FUNCTION public.fn_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Function URL + service key are read from GUCs an admin can set:
  --   ALTER DATABASE postgres SET app.push_function_url = 'https://<ref>.functions.supabase.co/send-push';
  --   ALTER DATABASE postgres SET app.push_service_key  = '<service-role-key>';
  v_url := current_setting('app.push_function_url', true);
  v_key := current_setting('app.push_service_key', true);

  IF v_url IS NULL OR v_url = '' THEN
    RETURN NEW; -- not configured yet; in-app notif still works
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_key, '')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'url', NEW.link,
        'tag', NEW.type
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- pg_net missing or call failed — never block the insert.
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_push_on_notification();

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 104_qr_expected_return.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 104 — qr_codes.expected_return_date.
--
-- Until now the expected return date lived only on qr_scan_logs.
-- Desktop assignment (claim without a scan) + the catalog
-- availability forecast both need it on the qr_codes row itself, so
-- a glance at qr_codes tells you when an assigned unit comes back.
-- =============================================================

BEGIN;

ALTER TABLE public.qr_codes
  ADD COLUMN IF NOT EXISTS expected_return_date DATE;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 105_equipment_issues.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 105 — Equipment issue tickets ("report a problem").
--
-- A user reports a problem with a device they hold; it becomes a
-- ticket the IT team can see + resolve, with an optional photo. On
-- creation every admin gets an in-app notification (which, once push
-- is configured, also lands on their phone).
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.equipment_issues (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  qr_code_id    UUID REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  qr_code       TEXT,
  product_name  TEXT,
  reported_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name TEXT,
  reporter_email TEXT,
  description   TEXT NOT NULL,
  photo_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_issues_status ON public.equipment_issues (status);
CREATE INDEX IF NOT EXISTS idx_equipment_issues_reporter ON public.equipment_issues (reported_by);

ALTER TABLE public.equipment_issues ENABLE ROW LEVEL SECURITY;

-- Users create their own; staff (admin/manager) see + manage all.
DROP POLICY IF EXISTS "Users create own issues" ON public.equipment_issues;
CREATE POLICY "Users create own issues" ON public.equipment_issues
  FOR INSERT WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Users read own issues" ON public.equipment_issues;
CREATE POLICY "Users read own issues" ON public.equipment_issues
  FOR SELECT USING (reported_by = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "Staff manage issues" ON public.equipment_issues;
CREATE POLICY "Staff manage issues" ON public.equipment_issues
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Notify every admin when an issue is opened.
CREATE OR REPLACE FUNCTION public.fn_notify_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT a.id,
         'it_material',
         'Equipment issue reported',
         COALESCE(NEW.reporter_name, 'Someone') || ' reported a problem with ' ||
           COALESCE(NEW.product_name, NEW.qr_code, 'a device'),
         '/admin/issues'
  FROM public.profiles a
  WHERE a.role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_issue ON public.equipment_issues;
CREATE TRIGGER trg_notify_issue
  AFTER INSERT ON public.equipment_issues
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_issue();

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 106_realtime.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 106 — Enable Realtime on the tables the UI watches live.
--
-- Adds the request + notification tables to the supabase_realtime
-- publication so the client can subscribe to postgres_changes and
-- refresh instantly instead of polling every 30 s.
-- =============================================================

BEGIN;

DO $$
DECLARE
  t TEXT;
  live TEXT[] := ARRAY[
    'notifications', 'loan_requests', 'it_requests',
    'mailbox_requests', 'qr_codes', 'equipment_issues'
  ];
BEGIN
  FOREACH t IN ARRAY live LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION
        WHEN duplicate_object THEN NULL; -- already in the publication
        WHEN undefined_object THEN
          RAISE NOTICE 'supabase_realtime publication not found — enable Realtime in the dashboard';
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 107_profile_language.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 107 — Per-user language preference.
--
-- The language switcher writes to profiles.language so the choice
-- (fr/en) follows the user across devices. localStorage already
-- covers same-device; this carries it on login elsewhere.
-- =============================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT
    CHECK (language IN ('fr', 'en'));

COMMENT ON COLUMN public.profiles.language IS
  'UI language override (fr/en); NULL = detect from browser, default fr';

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 108_fix_audit_role_access.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 108 — Fix fn_audit() OLD.role access on non-profiles tables.
--
-- The audit trigger from migration 100 read OLD.role inside an
-- ELSIF with an AND clause:
--
--   ELSIF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role
--
-- PL/pgSQL does not short-circuit AND in IF conditions, so OLD.role
-- got evaluated on every audited table — and crashed on the ones
-- without a role column (products, qr_codes, it_requests,
-- loan_requests, it_device_credentials):
--
--   ERROR: record "old" has no field "role"
--
-- Nest the table check so OLD.role is only ever read when we're
-- already inside the profiles branch.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action     TEXT;
  v_entity_id  UUID;
  v_old        JSONB;
  v_new        JSONB;
  v_old_role   TEXT;
  v_new_role   TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_entity_id := OLD.id;
  ELSE -- UPDATE
    v_entity_id := NEW.id;
    -- For status-bearing tables, label the action by the status move.
    IF to_jsonb(NEW) ? 'status'
       AND (to_jsonb(OLD)->>'status') IS DISTINCT FROM (to_jsonb(NEW)->>'status') THEN
      v_action := 'status:' || COALESCE(to_jsonb(NEW)->>'status', '?');
    ELSIF TG_TABLE_NAME = 'profiles' THEN
      -- Read role via to_jsonb() instead of OLD.role / NEW.role so the
      -- plan compiles for every audited table (PL/pgSQL doesn't
      -- short-circuit AND in IF conditions).
      v_old_role := to_jsonb(OLD)->>'role';
      v_new_role := to_jsonb(NEW)->>'role';
      IF v_old_role IS DISTINCT FROM v_new_role THEN
        v_action := 'role:' || COALESCE(v_new_role, '?');
      ELSE
        v_action := 'update';
      END IF;
    ELSE
      v_action := 'update';
    END IF;
    -- Only keep changed keys in the diff to stay compact.
    v_old := (SELECT jsonb_object_agg(key, value)
              FROM jsonb_each(to_jsonb(OLD))
              WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key);
    v_new := (SELECT jsonb_object_agg(key, value)
              FROM jsonb_each(to_jsonb(NEW))
              WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key);
    -- Skip pure no-op updates (e.g. updated_at only) to avoid noise.
    IF v_action = 'update' AND (v_new - 'updated_at') = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_entity_id, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 109_business_units.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 109 — Business units as an editable, first-class table.
--
-- The list of business units (VO GROUP, VO EUROPE, ACT-EVENTS, …)
-- and their corporate email domains lived as a TypeScript constant
-- (src/lib/constants/business-units.ts). That blocked admins from
-- adding / renaming a BU without a deploy, and meant the database
-- had no way to map a BU to its email domain (needed for the
-- upcoming Manager-scope RLS that filters it_requests by BU).
--
-- Move the list into the database as a real CRUD resource:
--   - admin can edit via /admin/business-units
--   - any authenticated user can SELECT (needed by the onboarding
--     form's BU dropdown and email-pattern computation)
--   - audit trigger + updated_at trigger like every other table
--
-- Seeded with the 7 existing BUs plus ACT-EVENTS (act-events.com).
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.business_units (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  value         TEXT        NOT NULL UNIQUE,
  domain        TEXT        NOT NULL UNIQUE,
  email_pattern TEXT        NOT NULL CHECK (email_pattern IN ('initial_last', 'first', 'initials')),
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup by domain for the future Manager-scope RLS that maps
-- a profile.business_unit to it_requests.data->>'corporate_email'.
CREATE INDEX IF NOT EXISTS idx_business_units_domain ON public.business_units (domain);

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read — the onboarding form needs the list
-- to populate its BU dropdown, and generateCorporateEmail() needs
-- the domain + pattern.
CREATE POLICY "Business units readable by authenticated"
  ON public.business_units
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify business units"
  ON public.business_units
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reuse the shared updated_at trigger (defined in full_schema.sql).
DROP TRIGGER IF EXISTS update_business_units_updated_at ON public.business_units;
CREATE TRIGGER update_business_units_updated_at
  BEFORE UPDATE ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit trigger — match the pattern from migration 100.
DROP TRIGGER IF EXISTS trg_audit_business_units ON public.business_units;
CREATE TRIGGER trg_audit_business_units
  AFTER INSERT OR UPDATE OR DELETE ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();

-- Seed: the 7 BUs that were already hard-coded in the front-end,
-- plus ACT-EVENTS. Idempotent on `value` so reruns are safe.
INSERT INTO public.business_units (value, domain, email_pattern, sort_order) VALUES
  ('VO GROUP',         'vo-group.be',       'initial_last', 10),
  ('THE LITTLE VOICE', 'thelittlevoice.be', 'first',        20),
  ('VO EUROPE',        'vo-europe.eu',      'initial_last', 30),
  ('VO EVENT',         'vo-event.be',       'initial_last', 40),
  ('MAX',              'vo-event-max.be',   'first',        50),
  ('SIGN BRUSSELS',    'sign.brussels',     'initials',     60),
  ('ART ON PAPER',     'artonpaper.be',     'first',        70),
  ('ACT-EVENTS',       'act-events.com',    'initial_last', 80)
ON CONFLICT (value) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 110_manager_bu_scope.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 110 — Manager scope on it_requests by business unit.
--
-- Until now, anyone with profiles.role IN ('manager', 'admin') saw
-- and updated every it_request (migration 099 granted both via the
-- is_staff() helper). With multiple business units onboarding
-- people in parallel, a Manager from VO EUROPE shouldn't be reading
-- VO EVENT's pipeline — and shouldn't be touching anyone else's
-- submissions.
--
-- New rules:
--   - Admin keeps full access (unchanged — admin FOR ALL from 021).
--   - Manager SELECT is scoped to their business unit (profiles.business_unit).
--     The match is triple: legacy it_requests.business_unit column,
--     data->>'business_unit', or corporate_email domain == business_units.domain.
--     Lets two Managers of the same BU see each other's pending requests
--     to avoid duplicate onboardings — the original ask.
--   - Manager UPDATE on own request while pending — already covered by
--     migration 071's "Users can update own pending it_requests".
--   - Manager DELETE on own request anytime (no pending guard). New.
--
-- Also add onboarded_by_manager_id for traceability — the front-end
-- can record which manager kicked off the onboarding, separately
-- from requester_id (which can be reassigned later).
-- =============================================================

BEGIN;

-- 1. Traceability column. Separate from requester_id so we always
-- know who originally submitted, even if requester_id is repointed.
ALTER TABLE public.it_requests
  ADD COLUMN IF NOT EXISTS onboarded_by_manager_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_it_requests_onboarded_by_manager
  ON public.it_requests(onboarded_by_manager_id);

-- 2. Helper: does the current Manager's business_unit match the request?
-- SECURITY DEFINER so the function can read profiles + business_units
-- regardless of the calling user's row-level grants.
CREATE OR REPLACE FUNCTION public.is_manager_of_request_bu(
  req_business_unit TEXT,
  req_data          JSONB
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.business_units bu ON bu.value = p.business_unit
    WHERE p.id = auth.uid()
      AND p.role = 'manager'
      AND p.business_unit IS NOT NULL
      AND p.business_unit <> ''
      AND (
        req_business_unit = p.business_unit
        OR req_data->>'business_unit' = p.business_unit
        OR (bu.domain IS NOT NULL AND req_data->>'corporate_email' ILIKE '%@' || bu.domain)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_manager_of_request_bu(TEXT, JSONB) TO authenticated;

-- 3. Replace the blanket "Staff" policies from migration 099 with role-split rules.
DROP POLICY IF EXISTS "Staff can view all it_requests" ON public.it_requests;
DROP POLICY IF EXISTS "Staff can update it_requests" ON public.it_requests;

-- Managers see every request inside their BU (to avoid duplicate work).
CREATE POLICY "Managers view it_requests of own BU"
  ON public.it_requests
  FOR SELECT
  USING (public.is_manager_of_request_bu(business_unit, data));

-- Managers cancel their own request at any status (own = requester_id
-- or requested_by — the codebase populates one or the other depending
-- on flow). The BU check is belt-and-braces: a manager whose BU was
-- later renamed can still tidy up their own past requests, but only
-- if they still own the row.
CREATE POLICY "Managers delete own it_requests"
  ON public.it_requests
  FOR DELETE
  USING (
    (requester_id = auth.uid() OR requested_by = auth.uid())
    AND public.is_manager_of_request_bu(business_unit, data)
  );

-- Note: UPDATE for managers on their own pending request is already
-- covered by migration 071 ("Users can update own pending it_requests")
-- which gates on requester_id = auth.uid() AND status = 'pending'.
-- We deliberately do NOT add a manager-update-anyone-in-BU policy:
-- "Ne peut pas toucher aux demandes des autres Managers".

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 111_hot_indexes.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 111 — Add three composite indexes that match the
-- hottest list-style queries in the app.
--
-- All three are partial indexes filtered on the soft-delete /
-- active flags the app already filters on at query time, so the
-- index stays small and the planner picks it directly.
-- =============================================================

BEGIN;

-- Full (non-partial) indexes: some environments predate the soft-delete
-- migration (067) and don't have a deleted_at column, so we avoid a
-- partial `WHERE deleted_at IS NULL` predicate that would fail there.

-- 1. it_requests list pages query by requester + sort by created_at DESC.
-- Examples: useMyItRequests, ManagerDashboardPage time slices,
-- onboarding/offboarding admin tables.
CREATE INDEX IF NOT EXISTS idx_it_requests_requester_created
  ON public.it_requests (requester_id, created_at DESC);

-- 2. loan_requests list pages filter by user_id + status + sort by created_at DESC.
-- Examples: MyEquipmentPage active vs returned, admin equipment queue.
CREATE INDEX IF NOT EXISTS idx_loan_requests_user_status_created
  ON public.loan_requests (user_id, status, created_at DESC);

-- 3. profiles admin list filters by role + sorts by created_at DESC.
-- Example: AdminUsersPage role filter ("all", "admin", "manager", "user").
CREATE INDEX IF NOT EXISTS idx_profiles_role_created
  ON public.profiles (role, created_at DESC);

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 112_categories_require_auth.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 112 — Require login to read categories (B4).
--
-- Migration 089 left categories world-readable ("USING (true)") so
-- the catalog could paint before the session resolved. But the whole
-- app is behind login anyway (RequireAuth), and categories are only
-- ever fetched from the authenticated catalog — nothing public needs
-- them. Close the anonymous read so the database matches the app's
-- "nothing without login" posture.
--
-- Admin write access is unchanged.
-- =============================================================

BEGIN;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Categories are viewable by authenticated users" ON public.categories;

CREATE POLICY "Categories are viewable by authenticated users"
  ON public.categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 113_language_add_nl.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 113 — Allow Dutch (nl) as a profile language.
--
-- Migration 107 added profiles.language with CHECK (language IN
-- ('fr','en')). The language switcher now offers Nederlands too, so
-- widen the constraint to accept 'nl'.
-- =============================================================

BEGIN;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_language_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_language_check
  CHECK (language IN ('fr', 'en', 'nl'));

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- 114_drop_personal_info_submissions.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================
-- Migration 114 — Drop the unused personal_info_submissions table.
--
-- Created in 063 for a public "new hire fills in their own personal
-- info" flow that was never wired into the app (zero frontend
-- references). Removing it to keep the schema honest.
--
-- ⚠️ Before running in an environment that might hold real data, check:
--     SELECT count(*) FROM personal_info_submissions;
--   If it returns > 0, export/verify first — this DROP is irreversible.
-- =============================================================

BEGIN;

DROP VIEW IF EXISTS public.personal_info_submissions_with_details;
DROP TABLE IF EXISTS public.personal_info_submissions CASCADE;

COMMIT;
