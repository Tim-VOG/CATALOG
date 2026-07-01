-- =============================================================
-- Migration 112 — Require login to read categories (B4).
--
-- Migration 089 left categories world-readable ("USING (true)") so
-- the catalog could paint before the session resolved. But the whole
-- app is behind login anyway (RequireAuth), and categories are only
-- ever fetched from the authenticated catalog — nothing public needs
-- them. Close the anonymous read so the database matches the app's
-- "nothing without login" posture.
--
-- Admin write access is unchanged.
-- =============================================================

BEGIN;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;

CREATE POLICY "Categories are viewable by authenticated users"
  ON public.categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMIT;
