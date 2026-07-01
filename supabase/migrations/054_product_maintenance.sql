-- MIGRATION 054: Add maintenance mode to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- Recreate view
DROP VIEW IF EXISTS products_with_category CASCADE;
CREATE VIEW products_with_category AS
SELECT p.*, c.name AS category_name, c.color AS category_color
FROM products p LEFT JOIN categories c ON p.category_id = c.id;
