-- =============================================================
-- Migration 104 — qr_codes.expected_return_date.
--
-- Until now the expected return date lived only on qr_scan_logs.
-- Desktop assignment (claim without a scan) + the catalog
-- availability forecast both need it on the qr_codes row itself, so
-- a glance at qr_codes tells you when an assigned unit comes back.
-- =============================================================

BEGIN;

ALTER TABLE public.qr_codes
  ADD COLUMN IF NOT EXISTS expected_return_date DATE;

COMMIT;
