-- =============================================================
-- Migration 129 — Extend Realtime to the rest of the admin surface.
--
-- Publish stock, users, feedback, directory, shared mailboxes, holidays
-- and onboarding emails so the whole admin (dashboard KPIs, lists…) updates
-- live without a manual refresh. Idempotent, same pattern as migration 106.
-- =============================================================

BEGIN;

DO $$
DECLARE
  t TEXT;
  live TEXT[] := ARRAY[
    'products', 'profiles', 'feedback', 'people_directory',
    'shared_mailboxes', 'holidays', 'onboarding_emails'
  ];
BEGIN
  FOREACH t IN ARRAY live LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION
        WHEN duplicate_object THEN NULL; -- already published
        WHEN undefined_object THEN
          RAISE NOTICE 'supabase_realtime publication not found — enable Realtime in the dashboard';
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;
