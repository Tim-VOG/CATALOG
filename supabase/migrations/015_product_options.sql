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
