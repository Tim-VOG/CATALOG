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
