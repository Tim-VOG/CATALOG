-- =============================================================
-- Migration 101 — App-wide pickup point (IT desk) + mini floor map.
--
-- The cart flow doesn't capture a per-request location (it's always
-- the IT desk), so a single app-wide pickup point on app_settings is
-- the right grain. Stores a name, written directions, an optional
-- floor-plan image and a pin position (0-100 %) to drop a marker on
-- that image.
-- =============================================================

BEGIN;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS pickup_location_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_directions    TEXT,
  ADD COLUMN IF NOT EXISTS pickup_map_url        TEXT,
  ADD COLUMN IF NOT EXISTS pickup_pin_x          NUMERIC,  -- 0..100 (% of image width)
  ADD COLUMN IF NOT EXISTS pickup_pin_y          NUMERIC;  -- 0..100 (% of image height)

COMMIT;
