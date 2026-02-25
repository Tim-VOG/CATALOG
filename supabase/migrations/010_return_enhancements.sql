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
