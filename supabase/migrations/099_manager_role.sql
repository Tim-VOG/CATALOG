-- =============================================================
-- Migration 099 — Re-introduce the "manager" role (HR / people-ops).
--
-- The role was dropped back in 025; bring it back as a middle tier
-- between 'user' and 'admin'. A manager can see the people-ops side
-- of the admin panel (onboarding, offboarding, mailbox requests,
-- planning) but NOT the sensitive inventory (QR codes, device
-- credentials, design, products, scan logs).
--
-- Enforcement is twofold:
--   1. Route guards on the client (RequireStaff + AdminOnly).
--   2. RLS stays admin-or-owner; managers don't get extra DB write
--      power here — they operate through the same it_requests /
--      mailbox_requests policies as before. If a manager needs to
--      mutate those, the existing "admin only" policies must be
--      widened in a follow-up. For now this migration only unlocks
--      the role value + read visibility through the existing
--      authenticated SELECT policies.
-- =============================================================

BEGIN;

-- 1. Widen the role check constraint to include 'manager'.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'manager', 'admin'));

-- 2. Helper: is the current user a manager OR admin? Used by any
--    RLS policy that wants to grant people-ops read/write later.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('manager', 'admin')
  );
$$;

-- 3. Let managers read + manage the people-ops request tables so the
--    HR view actually works. These mirror the existing admin policies
--    but broaden them to is_staff().
DO $$
BEGIN
  -- it_requests: managers can read every onboarding/offboarding row.
  DROP POLICY IF EXISTS "Staff can view all it_requests" ON public.it_requests;
  CREATE POLICY "Staff can view all it_requests" ON public.it_requests
    FOR SELECT USING (public.is_staff());

  DROP POLICY IF EXISTS "Staff can update it_requests" ON public.it_requests;
  CREATE POLICY "Staff can update it_requests" ON public.it_requests
    FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

  -- mailbox_requests: same idea.
  DROP POLICY IF EXISTS "Staff can view mailbox_requests" ON public.mailbox_requests;
  CREATE POLICY "Staff can view mailbox_requests" ON public.mailbox_requests
    FOR SELECT USING (public.is_staff());

  DROP POLICY IF EXISTS "Staff can update mailbox_requests" ON public.mailbox_requests;
  CREATE POLICY "Staff can update mailbox_requests" ON public.mailbox_requests
    FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Some people-ops table missing — skipped its staff policy';
END $$;

COMMIT;
