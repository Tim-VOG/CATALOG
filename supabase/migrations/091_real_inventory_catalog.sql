-- =============================================================
-- Migration 091 — Replace the catalog with the real VO inventory.
--
-- Wipes the existing demo products / QR codes / cart items and
-- rebuilds the catalog from the Excel inventory provided on
-- 2026-06-11. Categories are reset to what the inventory actually
-- contains; obsolete demo categories disappear via CASCADE.
--
-- Stock figures and QR codes are sized 1:1 with the physical
-- inventory so the cart's max-per-product check, the offboarding
-- auto-detect and the assignment flow can all reason about real
-- units instead of demo seed data.
--
-- Sensitive per-device data (IMEI, SIM, PIN, WiFi passwords) lives
-- in migration 092 (it_device_credentials, admin-only). Don't put
-- any of that in this file.
-- =============================================================

BEGIN;

-- ─── 1. Wipe ──────────────────────────────────────────────────
-- products → qr_codes → cart_items via CASCADE on the FK chain.
-- user_equipment.product_id is ON DELETE SET NULL so existing
-- assignments stay around but lose their catalog pointer (intent:
-- "the laptop the person currently holds was a demo product that
-- doesn't exist anymore — keep the row, drop the link").

TRUNCATE TABLE
  products,
  categories,
  qr_codes,
  cart_items,
  qr_scan_logs,
  qr_reservations,
  qr_waitlist,
  qr_reminders_sent
RESTART IDENTITY CASCADE;


-- ─── 2. Categories from the real inventory ────────────────────

INSERT INTO categories (name, color) VALUES
  ('iPads',        '#0a7a3b'),   -- iPad Air / iPad Pro
  ('Phones',       '#3955cf'),   -- iPhones (all generations)
  ('Routers',      '#a16207'),   -- 4G / 5G routers, fixed + mobile
  ('Tablets',      '#b91c1c'),   -- VO-1 → VO-53 fleet
  ('Accessories',  '#525f7f');   -- MagSafe, cables, keyboards, etc.


-- ─── 3. Products ───────────────────────────────────────────────
-- One row per distinct SKU. total_stock matches the count physically
-- on the shelf so the cart can refuse a 6th iPad Air automatically.

WITH cat AS (
  SELECT id, name FROM categories
)
INSERT INTO products (name, description, category_id, total_stock, is_active)
SELECT v.name, v.description, c.id, v.stock, true
FROM (VALUES
  -- iPads -----------------------------------------------------
  ('iPad Air',              'iPad Air — Wi-Fi, MPQ03FD/A',              'iPads',        5),
  ('iPad Pro',              'iPad Pro — Wi-Fi, MNXF3NF/A',              'iPads',        2),

  -- Phones (one row per model so we can track per-model stock) -
  ('iPhone 6',              'iPhone 6 — legacy device, no iOS updates', 'Phones',       1),
  ('iPhone 7',              'iPhone 7',                                 'Phones',       1),
  ('iPhone 8',              'iPhone 8',                                 'Phones',       2),
  ('iPhone SE',             'iPhone SE (1st gen)',                       'Phones',       1),
  ('iPhone SE (2020)',      'iPhone SE 2nd gen (2020)',                 'Phones',       1),
  ('iPhone XR',             'iPhone XR',                                'Phones',       1),
  ('iPhone 13',             'iPhone 13 — event fleet (#1 → #4)',         'Phones',       4),
  ('iPhone 13 Pro Max',     'iPhone 13 Pro Max — flagship spare',        'Phones',       1),
  ('iPhone 15 Pro Max',     'iPhone 15 Pro Max — flagship spare',        'Phones',       1),

  -- Routers ---------------------------------------------------
  ('Routeur 4G Fixe',       '4G fixed router (TP-Link, deposit unit)',   'Routers',      3),
  ('Routeur 4G Mobile',     '4G pocket router',                         'Routers',      2),

  -- Tablets ---------------------------------------------------
  ('Tablette VO',           'Event tablet — VO-1 … VO-53 fleet',         'Tablets',     53),

  -- Accessories -----------------------------------------------
  ('MagSafe Charger',       'MagSafe charger',                          'Accessories',  3),
  ('Lightning to HDMI',     'Lightning to HDMI adapter',                'Accessories',  1),
  ('Chargeur USB-C + Câble','USB-C charger + cable kit',                'Accessories', 10),
  ('HDMI Cable',            'HDMI cable',                               'Accessories', 10),
  ('Keyboard',              'USB / Bluetooth keyboard',                 'Accessories',  5),
  ('Mouse',                 'USB / Bluetooth mouse',                    'Accessories',  5),
  ('Power Strip',           'Multi-socket power strip',                 'Accessories', 10),
  ('Printer Laser B&W A4',  'Brother B&W A4 laser printer (small)',     'Accessories',  1)
) AS v(name, description, cat_name, stock)
JOIN cat c ON c.name = v.cat_name;


-- ─── 4. Regenerate QR codes ───────────────────────────────────
-- One code per stock unit, format VO-<SLUG>-NNN, all 'available'.
-- The slug strips non-alphanum, uppercases, caps at 16 chars so
-- VO-IPHONE13PROMAX-001 stays readable on a label.

INSERT INTO qr_codes (code, product_id, label, is_active, status)
SELECT
  'VO-' || substring(regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g'), 1, 16) || '-' || lpad(n::text, 3, '0'),
  p.id,
  p.name || ' #' || lpad(n::text, 3, '0'),
  true,
  'available'
FROM products p
CROSS JOIN LATERAL generate_series(1, p.total_stock) AS n;


-- ─── 5. Sanity check (read-only output) ────────────────────────

SELECT
  p.name,
  c.name AS category,
  p.total_stock AS stock,
  COUNT(qc.id) AS qr_count,
  MIN(qc.code) AS first_code,
  MAX(qc.code) AS last_code
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN qr_codes qc ON qc.product_id = p.id
GROUP BY p.id, p.name, c.name, p.total_stock
ORDER BY c.name, p.name;

COMMIT;
