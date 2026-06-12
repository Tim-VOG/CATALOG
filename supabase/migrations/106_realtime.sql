-- =============================================================
-- Migration 106 — Enable Realtime on the tables the UI watches live.
--
-- Adds the request + notification tables to the supabase_realtime
-- publication so the client can subscribe to postgres_changes and
-- refresh instantly instead of polling every 30 s.
-- =============================================================

BEGIN;

DO $$
DECLARE
  t TEXT;
  live TEXT[] := ARRAY[
    'notifications', 'loan_requests', 'it_requests',
    'mailbox_requests', 'qr_codes', 'equipment_issues'
  ];
BEGIN
  FOREACH t IN ARRAY live LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXCEPTION
        WHEN duplicate_object THEN NULL; -- already in the publication
        WHEN undefined_object THEN
          RAISE NOTICE 'supabase_realtime publication not found — enable Realtime in the dashboard';
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;
