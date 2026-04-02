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
