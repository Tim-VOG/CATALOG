-- ================================================================
-- QR CODE TEST DATA SEED
-- Run this in Supabase SQL Editor to create test products,
-- QR codes, and kits for testing the QR inventory system.
-- ================================================================

-- ============================================
-- 1. TEST PRODUCT: iPhone 20 Pro Max
-- ============================================

INSERT INTO products (name, description, category_id, image_url, total_stock, includes, has_accessories, has_subscription, has_apps)
VALUES (
  'iPhone 20 Pro Max',
  'Apple A20 Bionic chip, 512GB, Titanium — QR Test Product',
  (SELECT id FROM categories WHERE name = 'iPhone'),
  'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=300&fit=crop',
  10,
  ARRAY['USB-C Charger', 'SIM Eject Tool'],
  true,
  true,
  true
);

-- ============================================
-- 2. KITS — Logical groups (product + accessories)
-- ============================================

-- Kit: iPhone (phone + charger)
INSERT INTO qr_kits (reference, name, description) VALUES
  ('KIT-IPHONE', 'iPhone Kit', 'iPhone + USB-C Charger — do not separate'),
  ('KIT-ROUTER', 'Router Kit', '5G Router + Power adapter + Ethernet cable'),
  ('KIT-MAC', 'MacBook Kit', 'MacBook + Charger + USB-C dongle'),
  ('KIT-PC', 'PC Kit', 'Laptop + Charger + Docking station'),
  ('KIT-SCREEN', 'Screen Kit', 'Monitor + HDMI cable + Power cable'),
  ('KIT-TABLET', 'Tablet Kit', 'Tablet + Charger + Stylus');

-- Link kit items: each kit → its products
-- iPhone Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-IPHONE' AND p.name = 'iPhone 20 Pro Max';

-- Router Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-ROUTER' AND p.name = '5G Mobile Router';

-- Mac Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-MAC' AND p.name = 'MacBook Pro 14"';

-- PC Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-PC' AND p.name = 'Dell Latitude 5540';

-- Screen Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-SCREEN' AND p.name = 'Dell 27" Monitor';

-- Tablet Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-TABLET' AND p.name = 'iPad Pro 11"';

-- ============================================
-- 3. QR CODES — One per product (with kit link where applicable)
-- ============================================

-- iPhone 20 Pro Max (test product) — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-IPHONE20-001', p.id, k.id, 'iPhone 20 Pro Max #1', true
FROM products p, qr_kits k
WHERE p.name = 'iPhone 20 Pro Max' AND k.reference = 'KIT-IPHONE';

-- iPhone 15 Pro — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-IPHONE15-001', p.id, k.id, 'iPhone 15 Pro #1', true
FROM products p, qr_kits k
WHERE p.name = 'iPhone 15 Pro' AND k.reference = 'KIT-IPHONE';

-- 5G Mobile Router — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-ROUTER5G-001', p.id, k.id, '5G Router #1', true
FROM products p, qr_kits k
WHERE p.name = '5G Mobile Router' AND k.reference = 'KIT-ROUTER';

-- MacBook Pro — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-MACPRO14-001', p.id, k.id, 'MacBook Pro 14" #1', true
FROM products p, qr_kits k
WHERE p.name = 'MacBook Pro 14"' AND k.reference = 'KIT-MAC';

-- Dell Latitude — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-DELL5540-001', p.id, k.id, 'Dell Latitude 5540 #1', true
FROM products p, qr_kits k
WHERE p.name = 'Dell Latitude 5540' AND k.reference = 'KIT-PC';

-- Dell Monitor — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-SCREEN27-001', p.id, k.id, 'Dell 27" Monitor #1', true
FROM products p, qr_kits k
WHERE p.name = 'Dell 27" Monitor' AND k.reference = 'KIT-SCREEN';

-- iPad Pro — WITH kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-IPADPRO-001', p.id, k.id, 'iPad Pro 11" #1', true
FROM products p, qr_kits k
WHERE p.name = 'iPad Pro 11"' AND k.reference = 'KIT-TABLET';

-- HP Printer — NO kit (standalone, boîte simple)
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-PRINTER-001', p.id, NULL, 'HP LaserJet Pro #1', true
FROM products p
WHERE p.name = 'HP LaserJet Pro';

-- Accessories — NO kit
INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'EQ-CLICKER-001', p.id, NULL, 'Presentation Clicker #1', true
FROM products p
WHERE p.name = 'Presentation Clicker';
