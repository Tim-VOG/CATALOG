-- ================================================================
-- QR CODE CONVENTION UPDATE + iPhone 20 Test Product
-- Migration: 036_qr_vo_convention_and_iphone20.sql
-- Convention: All QR codes start with "VO-" followed by product name
-- ================================================================

-- ============================================
-- 1. NEW TEST PRODUCT: iPhone 20
-- ============================================

INSERT INTO products (name, description, category_id, image_url, total_stock, includes, has_accessories, has_subscription, has_apps)
VALUES (
  'iPhone 20',
  'Apple A20 chip, 256GB, Dynamic Island, USB-C, Ceramic Shield',
  (SELECT id FROM categories WHERE name = 'iPhone'),
  'https://images.unsplash.com/photo-1710023038911-454587904706?w=400&h=300&fit=crop',
  5,
  ARRAY['USB-C Charger', 'USB-C Cable', 'SIM Eject Tool'],
  true,
  true,
  true
);

-- Add iPhone 20 to the iPhone Kit
INSERT INTO qr_kit_items (kit_id, product_id, quantity)
SELECT k.id, p.id, 1
FROM qr_kits k, products p
WHERE k.reference = 'KIT-IPHONE' AND p.name = 'iPhone 20';

-- ============================================
-- 2. MIGRATE QR CODES TO VO- CONVENTION
-- ============================================

-- Update existing QR codes to VO- prefix
UPDATE qr_codes SET code = 'VO-IPHONE20PROMAX-001' WHERE code = 'EQ-IPHONE20-001';
UPDATE qr_codes SET code = 'VO-IPHONE15PRO-001'    WHERE code = 'EQ-IPHONE15-001';
UPDATE qr_codes SET code = 'VO-ROUTER5G-001'       WHERE code = 'EQ-ROUTER5G-001';
UPDATE qr_codes SET code = 'VO-MACBOOKPRO14-001'   WHERE code = 'EQ-MACPRO14-001';
UPDATE qr_codes SET code = 'VO-DELLLATITUDE-001'   WHERE code = 'EQ-DELL5540-001';
UPDATE qr_codes SET code = 'VO-DELLMONITOR27-001'  WHERE code = 'EQ-SCREEN27-001';
UPDATE qr_codes SET code = 'VO-IPADPRO11-001'      WHERE code = 'EQ-IPADPRO-001';
UPDATE qr_codes SET code = 'VO-HPLASERJET-001'     WHERE code = 'EQ-PRINTER-001';
UPDATE qr_codes SET code = 'VO-CLICKER-001'        WHERE code = 'EQ-CLICKER-001';

-- Also update any scan logs that reference old codes
UPDATE qr_scan_logs SET qr_code = 'VO-IPHONE20PROMAX-001' WHERE qr_code = 'EQ-IPHONE20-001';
UPDATE qr_scan_logs SET qr_code = 'VO-IPHONE15PRO-001'    WHERE qr_code = 'EQ-IPHONE15-001';
UPDATE qr_scan_logs SET qr_code = 'VO-ROUTER5G-001'       WHERE qr_code = 'EQ-ROUTER5G-001';
UPDATE qr_scan_logs SET qr_code = 'VO-MACBOOKPRO14-001'   WHERE qr_code = 'EQ-MACPRO14-001';
UPDATE qr_scan_logs SET qr_code = 'VO-DELLLATITUDE-001'   WHERE qr_code = 'EQ-DELL5540-001';
UPDATE qr_scan_logs SET qr_code = 'VO-DELLMONITOR27-001'  WHERE qr_code = 'EQ-SCREEN27-001';
UPDATE qr_scan_logs SET qr_code = 'VO-IPADPRO11-001'      WHERE qr_code = 'EQ-IPADPRO-001';
UPDATE qr_scan_logs SET qr_code = 'VO-HPLASERJET-001'     WHERE qr_code = 'EQ-PRINTER-001';
UPDATE qr_scan_logs SET qr_code = 'VO-CLICKER-001'        WHERE qr_code = 'EQ-CLICKER-001';

-- ============================================
-- 3. NEW QR CODE: iPhone 20 (VO- convention)
-- ============================================

INSERT INTO qr_codes (code, product_id, kit_id, label, is_active)
SELECT 'VO-IPHONE20-001', p.id, k.id, 'iPhone 20 #1', true
FROM products p, qr_kits k
WHERE p.name = 'iPhone 20' AND k.reference = 'KIT-IPHONE';
