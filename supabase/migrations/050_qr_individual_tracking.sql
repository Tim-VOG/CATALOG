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
