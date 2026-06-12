-- =============================================================
-- Migration 096 — RLS audit patches.
--
-- Phase-1 follow-up to migrations 088, 089, 031: a full re-read of
-- every CREATE POLICY across migrations 001-095 flagged 3 INSERT
-- policies that authenticate the caller but don't bind the row to
-- them. Each lets any logged-in user (or, in one case, anonymous
-- visitor) create rows attributed to OTHER users.
--
-- Holes patched here:
--   1. personal_info_submissions — public INSERT with no token check
--   2. qr_reservations          — auth INSERT without user_id check
--   3. qr_waitlist              — auth INSERT without user_id check
--
-- Each policy is replaced in-place. Existing rows are untouched.
-- =============================================================

BEGIN;


-- ─── 1. personal_info_submissions ───────────────────────────
-- Before: WITH CHECK (true). Anyone (incl. anon) could insert with
--         any it_request_id, squat the UNIQUE constraint, and steal
--         the welcome email destination.
-- After:  Public RPC submit_personal_info(token, email) is the only
--         way in. It validates the token, resolves the request id
--         server-side, and inserts with SECURITY DEFINER. Direct
--         table INSERT becomes admin-only.

CREATE OR REPLACE FUNCTION public.submit_personal_info(
  p_token UUID,
  p_email TEXT
)
RETURNS public.personal_info_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_row        public.personal_info_submissions;
BEGIN
  -- Basic email shape check — full validation happens client-side too
  -- but we never want a clearly bogus value to land in the DB.
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  SELECT id
    INTO v_request_id
    FROM public.it_requests
    WHERE personal_info_token = p_token
      AND type = 'onboarding';

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  INSERT INTO public.personal_info_submissions (it_request_id, personal_email)
  VALUES (v_request_id, lower(trim(p_email)))
  ON CONFLICT (it_request_id) DO UPDATE
    SET personal_email = EXCLUDED.personal_email,
        submitted_at   = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_personal_info(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_personal_info(UUID, TEXT) TO anon, authenticated;

-- Drop the open INSERT policy. Admins keep full access via the
-- pre-existing "Admins can manage personal info submissions" policy.
DROP POLICY IF EXISTS "Public can submit personal info" ON public.personal_info_submissions;


-- ─── 2. qr_reservations INSERT ──────────────────────────────
-- Before: WITH CHECK (auth.role() = 'authenticated'). Any logged-in
--         user could create a reservation in another user's name.
-- After:  user_id must match the caller (or caller is admin).

DROP POLICY IF EXISTS "Users can create reservations" ON public.qr_reservations;
CREATE POLICY "Users can create reservations" ON public.qr_reservations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─── 3. qr_waitlist INSERT ──────────────────────────────────
-- Before: WITH CHECK (auth.role() = 'authenticated'). Same shape.
-- After:  user_id must match the caller (or caller is admin).

DROP POLICY IF EXISTS "Users can join waitlist" ON public.qr_waitlist;
CREATE POLICY "Users can join waitlist" ON public.qr_waitlist
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─── Sanity check ────────────────────────────────────────────
SELECT 'rls audit patches applied' AS step,
       (SELECT COUNT(*) FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('personal_info_submissions','qr_reservations','qr_waitlist')) AS policies_remaining;

COMMIT;
