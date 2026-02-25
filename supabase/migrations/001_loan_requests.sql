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
