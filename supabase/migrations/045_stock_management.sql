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
CREATE OR REPLACE VIEW products_with_category AS
SELECT
    p.*,
    c.name as category_name,
    c.color as category_color
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;
