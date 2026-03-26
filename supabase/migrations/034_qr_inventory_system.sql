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
