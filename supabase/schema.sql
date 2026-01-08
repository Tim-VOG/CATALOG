-- ============================================
-- EQUIPLEND DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Categories table
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6b7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sub_type VARCHAR(100),
    image_url TEXT,
    total_stock INTEGER NOT NULL DEFAULT 1,
    includes TEXT[], -- Array of included items
    has_accessories BOOLEAN DEFAULT FALSE,
    has_software BOOLEAN DEFAULT FALSE,
    has_subscription BOOLEAN DEFAULT FALSE,
    has_apps BOOLEAN DEFAULT FALSE,
    wifi_only BOOLEAN DEFAULT FALSE,
    printer_info BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans table
CREATE TABLE subscription_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('call', 'data', 'both')),
    price VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users profile table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    organization VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loans table
CREATE TABLE loans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    borrower_name VARCHAR(255) NOT NULL,
    borrower_email VARCHAR(255) NOT NULL,
    borrower_phone VARCHAR(50),
    borrower_organization VARCHAR(255),
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    actual_return_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'returned', 'rejected', 'overdue')),
    notes TEXT,
    -- Options stored as JSONB
    options JSONB DEFAULT '{}',
    -- Return info
    return_condition VARCHAR(20) CHECK (return_condition IN ('good', 'minor', 'damaged', 'lost')),
    return_notes TEXT,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_loans_product ON loans(product_id);
CREATE INDEX idx_loans_user ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_dates ON loans(pickup_date, return_date);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loans_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to calculate available stock
CREATE OR REPLACE FUNCTION get_available_stock(p_product_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS INTEGER AS $$
DECLARE
    v_total_stock INTEGER;
    v_borrowed INTEGER;
BEGIN
    -- Get total stock
    SELECT total_stock INTO v_total_stock
    FROM products WHERE id = p_product_id;
    
    -- Get borrowed quantity for overlapping dates
    SELECT COALESCE(SUM(quantity), 0) INTO v_borrowed
    FROM loans
    WHERE product_id = p_product_id
    AND status IN ('active', 'pending')
    AND NOT (return_date < p_start_date OR pickup_date > p_end_date);
    
    RETURN v_total_stock - v_borrowed;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Categories: Everyone can read, only admins can modify
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify categories" ON categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Products: Everyone can read, only admins can modify
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify products" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Subscription plans: Everyone can read, only admins can modify
CREATE POLICY "Subscription plans are viewable by everyone" ON subscription_plans
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify subscription plans" ON subscription_plans
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Loans: Users can view all, create their own, admins can modify all
CREATE POLICY "Loans are viewable by authenticated users" ON loans
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create loans" ON loans
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own pending loans" ON loans
    FOR UPDATE USING (
        user_id = auth.uid() AND status = 'pending'
    );

CREATE POLICY "Admins can modify all loans" ON loans
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert categories
INSERT INTO categories (name, color) VALUES
    ('PC', '#3b82f6'),
    ('Mac', '#6b7280'),
    ('Screen', '#8b5cf6'),
    ('iPhone', '#ef4444'),
    ('Tablet', '#10b981'),
    ('Printer', '#f59e0b'),
    ('Accessories', '#ec4899'),
    ('5G Router', '#06b6d4');

-- Insert subscription plans
INSERT INTO subscription_plans (name, type, price, description) VALUES
    ('Call Basic', 'call', '€15/month', '100 minutes'),
    ('Call Unlimited', 'call', '€25/month', 'Unlimited calls'),
    ('Data 5GB', 'data', '€10/month', '5GB data'),
    ('Data 20GB', 'data', '€20/month', '20GB data'),
    ('Data Unlimited', 'data', '€35/month', 'Unlimited data'),
    ('Combo Basic', 'both', '€30/month', '100 min + 10GB'),
    ('Combo Premium', 'both', '€50/month', 'Unlimited + 50GB');

-- Insert sample products
INSERT INTO products (name, description, category_id, image_url, total_stock, includes, has_accessories, has_software) VALUES
    ('Dell Latitude 5540', 'Professional laptop - Intel i7, 16GB RAM', (SELECT id FROM categories WHERE name = 'PC'), 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop', 10, ARRAY['Charger'], true, true),
    ('HP ProBook 450', 'Business laptop - Intel i5, 8GB RAM', (SELECT id FROM categories WHERE name = 'PC'), 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop', 8, ARRAY['Charger'], true, true);

INSERT INTO products (name, description, category_id, image_url, total_stock, includes, has_accessories, has_software) VALUES
    ('MacBook Pro 14"', 'Apple M3 Pro, 18GB RAM, 512GB SSD', (SELECT id FROM categories WHERE name = 'Mac'), 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop', 5, ARRAY['Charger'], true, true),
    ('MacBook Air 13"', 'Apple M2, 8GB RAM, 256GB SSD', (SELECT id FROM categories WHERE name = 'Mac'), 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=300&fit=crop', 6, ARRAY['Charger'], true, true);

INSERT INTO products (name, description, category_id, image_url, total_stock, includes) VALUES
    ('Dell 27" Monitor', '27" 4K UHD IPS Display', (SELECT id FROM categories WHERE name = 'Screen'), 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop', 12, ARRAY['Charger', 'HDMI Cable']),
    ('LG 24" Monitor', '24" Full HD IPS Display', (SELECT id FROM categories WHERE name = 'Screen'), 'https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=400&h=300&fit=crop', 15, ARRAY['Charger', 'HDMI Cable']);

INSERT INTO products (name, description, category_id, image_url, total_stock, includes, has_subscription, has_apps) VALUES
    ('iPhone 15 Pro', 'A17 Pro chip, 256GB', (SELECT id FROM categories WHERE name = 'iPhone'), 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400&h=300&fit=crop', 8, ARRAY['Charger'], true, true),
    ('iPhone 14', 'A15 Bionic chip, 128GB', (SELECT id FROM categories WHERE name = 'iPhone'), 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=400&h=300&fit=crop', 10, ARRAY['Charger'], true, true);

INSERT INTO products (name, description, category_id, sub_type, image_url, total_stock, includes, wifi_only, has_apps) VALUES
    ('iPad Pro 11"', 'M2 chip, 128GB, WiFi only', (SELECT id FROM categories WHERE name = 'Tablet'), 'iPad', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop', 7, ARRAY['Charger'], true, true),
    ('Samsung Galaxy Tab S9', 'Snapdragon 8 Gen 2, WiFi only', (SELECT id FROM categories WHERE name = 'Tablet'), 'Android', 'https://images.unsplash.com/photo-1632634716509-6b16fee9fd16?w=400&h=300&fit=crop', 30, ARRAY['Charger'], true, true);

INSERT INTO products (name, description, category_id, image_url, total_stock, includes, printer_info) VALUES
    ('HP LaserJet Pro', 'B&W Laser - Print only (no scan/copy)', (SELECT id FROM categories WHERE name = 'Printer'), 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&h=300&fit=crop', 4, ARRAY['A4 Paper Ream'], true);

INSERT INTO products (name, description, category_id, image_url, total_stock) VALUES
    ('Presentation Clicker', 'Wireless presenter with laser pointer', (SELECT id FROM categories WHERE name = 'Accessories'), 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop', 2),
    ('HDMI Cable 2m', 'High-speed HDMI 2.1 cable', (SELECT id FROM categories WHERE name = 'Accessories'), 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', 5),
    ('USB-C Cable', 'USB-C to USB-C, 100W charging', (SELECT id FROM categories WHERE name = 'Accessories'), 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400&h=300&fit=crop', 5);

INSERT INTO products (name, description, category_id, sub_type, image_url, total_stock, has_subscription) VALUES
    ('5G Mobile Router', 'Portable 5G hotspot, battery powered', (SELECT id FROM categories WHERE name = '5G Router'), 'Portable', 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=300&fit=crop', 2, true),
    ('5G Home Router', '5G router with AC power, WiFi 6', (SELECT id FROM categories WHERE name = '5G Router'), 'Plug-in', 'https://images.unsplash.com/photo-1558618047-f4b511b47781?w=400&h=300&fit=crop', 3, true);

-- ============================================
-- VIEWS (optional, for easier queries)
-- ============================================

CREATE OR REPLACE VIEW products_with_category AS
SELECT 
    p.*,
    c.name as category_name,
    c.color as category_color
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

CREATE OR REPLACE VIEW loans_with_details AS
SELECT 
    l.*,
    p.name as product_name,
    p.image_url as product_image,
    c.name as category_name,
    c.color as category_color,
    pr.first_name as user_first_name,
    pr.last_name as user_last_name
FROM loans l
LEFT JOIN products p ON l.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN profiles pr ON l.user_id = pr.id;
