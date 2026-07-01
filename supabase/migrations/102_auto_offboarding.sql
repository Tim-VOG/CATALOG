-- =============================================================
-- Migration 102 — Auto-create an offboarding request 7 days before a
-- known departure.
--
-- Flow: admin sets profiles.departure_date on the user detail page.
-- A daily job creates a pre-filled offboarding it_request 7 days
-- before that date (idempotent — won't duplicate), so nobody forgets
-- to recover equipment / revoke access. Admins get an in-app notif.
-- =============================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS departure_date DATE;

COMMENT ON COLUMN public.profiles.departure_date IS
  'Known last working day. An offboarding request auto-spawns 7 days before.';

-- The worker. SECURITY DEFINER so the cron job (and a client fallback)
-- can insert it_requests + notifications regardless of the caller.
CREATE OR REPLACE FUNCTION public.auto_create_due_offboardings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r          RECORD;
  v_created  INTEGER := 0;
  v_req_id   UUID;
BEGIN
  FOR r IN
    SELECT p.*
    FROM public.profiles p
    WHERE p.departure_date IS NOT NULL
      -- fire once we're within 7 days of departure (covers missed days)
      AND p.departure_date <= CURRENT_DATE + 7
      AND p.departure_date >= CURRENT_DATE
      -- skip if an offboarding request already exists for this person
      AND NOT EXISTS (
        SELECT 1 FROM public.it_requests it
        WHERE it.type = 'offboarding'
          AND it.deleted_at IS NULL
          AND (
            it.requester_id = p.id
            OR lower(it.data->>'email') = lower(COALESCE(p.email, ''))
            OR (it.data->>'profile_id') = p.id::text
          )
      )
  LOOP
    INSERT INTO public.it_requests (type, status, requester_id, requester_name, requester_email, data)
    VALUES (
      'offboarding',
      'pending',
      r.id,
      TRIM(COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')),
      r.email,
      jsonb_build_object(
        'first_name', r.first_name,
        'last_name',  r.last_name,
        'email',      r.email,
        'business_unit', r.business_unit,
        'leaving_date', r.departure_date,
        'profile_id', r.id::text,
        'auto_created', true,
        'source', 'departure_date'
      )
    )
    RETURNING id INTO v_req_id;

    -- Notify every admin so it surfaces immediately.
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT a.id,
           'offboarding',
           'Offboarding auto-created',
           TRIM(COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')) ||
             ' leaves on ' || to_char(r.departure_date, 'DD Mon YYYY') || '. Review the offboarding.',
           '/admin/offboarding-requests'
    FROM public.profiles a
    WHERE a.role = 'admin';

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_create_due_offboardings() TO authenticated;

-- Schedule daily at 06:00 if pg_cron is available.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto-offboarding')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-offboarding');
    PERFORM cron.schedule('auto-offboarding', '0 6 * * *',
      'SELECT public.auto_create_due_offboardings();');
  ELSE
    RAISE NOTICE 'pg_cron not installed — rely on the client daily fallback';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule auto-offboarding cron: %', SQLERRM;
END $$;

COMMIT;
