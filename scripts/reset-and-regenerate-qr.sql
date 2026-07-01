-- =============================================================
-- HARD RESET — all requests + QR system, regenerate QR codes
-- =============================================================
-- Wipes:
--   - Every request type (loan, it, mailbox, offboarding)
--   - Every QR row + its scan logs / reservations / waitlist / reminders
--   - Carts, notifications, audit logs, onboarding emails history
-- Keeps:
--   - Profiles, products, categories, mailboxes (templates), IT inventory,
--     shared_mailboxes (FMB), user_equipment (what people already hold),
--     app_settings, email templates, subscription plans.
--
-- Then bumps every product's total_stock to at least 5 and generates one
-- QR code per stock unit, formatted as VO-<SLUG>-NNN.
--
-- Run as-is to PREVIEW the regeneration (transaction stays open under
-- BEGIN); change ROLLBACK to COMMIT at the bottom to apply.
-- =============================================================

BEGIN;

-- ── 1. Wipe every request + QR-related row ──────────────────────
TRUNCATE TABLE
  loan_requests,
  loan_request_items,
  extension_requests,
  cart_items,
  mailbox_requests,
  it_requests,
  offboarding_processes,
  onboarding_emails,
  notifications,
  audit_logs,
  qr_codes,
  qr_scan_logs,
  qr_reservations,
  qr_waitlist,
  qr_reminders_sent
RESTART IDENTITY CASCADE;

-- ── 2. Make sure every active product has at least 5 stock ─────
UPDATE products
SET total_stock = GREATEST(COALESCE(total_stock, 0), 5)
WHERE total_stock IS NULL OR total_stock < 5;

-- ── 3. Regenerate QR codes: one per stock unit, VO-<SLUG>-NNN ──
INSERT INTO qr_codes (code, product_id, label, is_active, status)
SELECT
  'VO-' || substring(regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g'), 1, 16) || '-' || lpad(n::text, 3, '0') AS code,
  p.id,
  p.name || ' #' || lpad(n::text, 3, '0'),
  true,
  'available'
FROM products p
CROSS JOIN LATERAL generate_series(1, p.total_stock) AS n;

-- ── 4. Sanity check — should show every product with N QRs ──────
SELECT
  p.name,
  p.total_stock AS stock,
  COUNT(qc.id) AS qr_count,
  MIN(qc.code) AS first_code,
  MAX(qc.code) AS last_code
FROM products p
LEFT JOIN qr_codes qc ON qc.product_id = p.id
GROUP BY p.id, p.name, p.total_stock
ORDER BY p.name;

-- =============================================================
-- Change ROLLBACK -> COMMIT to apply for real.
-- =============================================================
ROLLBACK;
