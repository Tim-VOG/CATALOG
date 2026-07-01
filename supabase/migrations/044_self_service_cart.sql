-- ============================================
-- MIGRATION 044: Self-Service Cart System
-- Adds cart_items table, global_comment to loan_requests,
-- and a checkout function to convert cart → loan_request
-- ============================================

-- ─── Cart Items Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    options JSONB DEFAULT '{}',
    -- options format:
    -- {
    --   "specifications": { "color": "Space Gray", "storage": "256GB" },
    --   "services": { "subscription_plan": "Data 20GB", "insurance": true },
    --   "accessories": ["USB-C Hub", "Screen Protector"]
    -- }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)  -- one row per product per user, quantity stacks
);

-- Indexes
CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- Updated_at trigger
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart"
    ON cart_items FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all carts"
    ON cart_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── Add global_comment to loan_requests ─────────────────────
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS global_comment TEXT;

-- ─── View: cart with product details ─────────────────────────
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

-- ─── Checkout function: cart → loan_request ──────────────────
-- Converts all cart_items for a user into a loan_request + items,
-- then clears the cart.
CREATE OR REPLACE FUNCTION checkout_cart(
    p_user_id UUID,
    p_project_name VARCHAR DEFAULT 'Equipment Request',
    p_project_description TEXT DEFAULT NULL,
    p_global_comment TEXT DEFAULT NULL,
    p_pickup_date DATE DEFAULT CURRENT_DATE,
    p_return_date DATE DEFAULT NULL,
    p_location_id UUID DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_cart_count INTEGER;
BEGIN
    -- Check cart is not empty
    SELECT COUNT(*) INTO v_cart_count FROM cart_items WHERE user_id = p_user_id;
    IF v_cart_count = 0 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    -- Create loan_request
    INSERT INTO loan_requests (
        user_id, project_name, project_description, global_comment,
        pickup_date, return_date, location_id, priority,
        status, terms_accepted, responsibility_accepted
    ) VALUES (
        p_user_id, p_project_name, p_project_description, p_global_comment,
        p_pickup_date, p_return_date, p_location_id, p_priority,
        'pending', true, true
    ) RETURNING id INTO v_request_id;

    -- Copy cart items to loan_request_items
    INSERT INTO loan_request_items (request_id, product_id, quantity, options)
    SELECT v_request_id, product_id, quantity, options
    FROM cart_items
    WHERE user_id = p_user_id;

    -- Clear the cart
    DELETE FROM cart_items WHERE user_id = p_user_id;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
