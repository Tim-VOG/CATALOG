-- ============================================
-- MIGRATION 047: Recreate views + cleanup
-- Views may have been dropped by CASCADE in migration 045
-- ============================================

-- Recreate loan_requests_with_details
CREATE OR REPLACE VIEW loan_requests_with_details AS
SELECT
    lr.*,
    p.first_name AS user_first_name,
    p.last_name AS user_last_name,
    p.email AS user_email,
    p.avatar_url AS user_avatar_url,
    loc.name AS location_name,
    loc.address AS location_address,
    (SELECT COUNT(*) FROM loan_request_items WHERE request_id = lr.id) AS item_count
FROM loan_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
LEFT JOIN locations loc ON lr.location_id = loc.id;

-- Recreate loan_request_items_with_details
CREATE OR REPLACE VIEW loan_request_items_with_details AS
SELECT
    lri.*,
    p.name AS product_name,
    p.image_url AS product_image,
    p.includes AS product_includes,
    p.total_stock AS product_stock,
    c.name AS category_name,
    c.color AS category_color
FROM loan_request_items lri
LEFT JOIN products p ON lri.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- Recreate products_with_category (in case it was dropped)
CREATE OR REPLACE VIEW products_with_category AS
SELECT
    p.*,
    c.name AS category_name,
    c.color AS category_color
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- Recreate cart_items_with_product (in case it was dropped)
CREATE OR REPLACE VIEW cart_items_with_product AS
SELECT
    ci.*,
    p.name AS product_name,
    p.description AS product_description,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    p.includes AS product_includes,
    p.has_subscription,
    p.has_apps,
    c.name AS category_name,
    c.color AS category_color
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

-- Recreate user_equipment_with_product (in case it was dropped)
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
