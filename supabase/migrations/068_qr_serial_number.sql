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
