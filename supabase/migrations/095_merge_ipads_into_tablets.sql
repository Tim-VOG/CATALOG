-- =============================================================
-- Migration 095 — One "Tablets" category for everything iPad.
--
-- Current state after 091+094 left iPads in two buckets:
--   iPads   = 1 product  (the renamed Tablette VO fleet, 53 units)
--   Tablets = 2 products (iPad Air 5, iPad Pro 2)
-- Per Nadir: "un iPad c'est une tablette" — collapse both into a
-- single Tablets category (iPad Air + iPad Pro + iPad fleet =
-- 3 products / 60 units), then drop the empty iPads bucket.
--
-- Also resets the 5 example "assigned" QR codes from 093 back to
-- 'available' since nothing is actually in someone's hands today.
-- =============================================================

BEGIN;

-- ─── 1. Reset the 5 example "assigned" QR codes ──────────────
UPDATE public.qr_codes
SET status            = 'available',
    assigned_to       = NULL,
    assigned_to_name  = NULL,
    assigned_to_email = NULL,
    assigned_at       = NULL,
    loan_request_id   = NULL,
    loan_request_item_id = NULL
WHERE code IN (
  'VO-IPHONE13-001',
  'VO-IPHONE13-004',
  'VO-ROUTEUR4GFIXE-001',
  'VO-ROUTEUR4GFIXE-002',
  'VO-ROUTEUR4GFIXE-003'
);


-- ─── 2. Ensure a "Tablets" category exists ───────────────────
INSERT INTO public.categories (name, color)
VALUES ('Tablets', '#0a7a3b')
ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color;


-- ─── 3. Move every iPad product into "Tablets" ───────────────
-- Covers the case where Tablette VO was renamed to "iPad" in 094
-- and parked in iPads, plus the original iPad Air / iPad Pro.

UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE name = 'Tablets')
WHERE name IN ('iPad', 'iPad Air', 'iPad Pro')
   OR name = 'Tablette VO';  -- defensive: in case 094 never ran


-- ─── 4. Rename the fleet product to "iPad" if 094 didn't run ─
UPDATE public.products
SET name        = 'iPad',
    description = 'iPad — VO event fleet (53 units)'
WHERE name = 'Tablette VO';


-- ─── 5. Regenerate QR codes for the renamed fleet ────────────
-- Drop any leftover VO-TABLETTEVO-* labels and reissue VO-IPAD-NNN
-- so the codes match the new product name.

DELETE FROM public.qr_codes
WHERE code LIKE 'VO-TABLETTEVO-%';

INSERT INTO public.qr_codes (code, product_id, label, is_active, status)
SELECT 'VO-IPAD-' || lpad(n::text, 3, '0'),
       p.id,
       p.name || ' #' || lpad(n::text, 3, '0'),
       true,
       'available'
FROM public.products p
CROSS JOIN LATERAL generate_series(1, p.total_stock) AS n
WHERE p.name = 'iPad'
  AND NOT EXISTS (
    SELECT 1 FROM public.qr_codes qc
    WHERE qc.product_id = p.id
      AND qc.code = 'VO-IPAD-' || lpad(n::text, 3, '0')
  );


-- ─── 6. Drop the now-empty "iPads" category ──────────────────
DELETE FROM public.categories
WHERE name = 'iPads'
  AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE category_id = categories.id
  );


-- ─── 7. Sanity check ─────────────────────────────────────────
SELECT c.name AS category,
       COUNT(p.id) AS products,
       COALESCE(SUM(p.total_stock), 0) AS stock,
       (SELECT COUNT(*) FROM public.qr_codes qc
        JOIN public.products pp ON pp.id = qc.product_id
        WHERE pp.category_id = c.id) AS qr_count
FROM public.categories c
LEFT JOIN public.products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

SELECT 'Assigned QR codes after reset' AS step,
       COUNT(*) AS rows
FROM public.qr_codes
WHERE status = 'assigned';

COMMIT;
