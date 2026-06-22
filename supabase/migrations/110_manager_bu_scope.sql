-- =============================================================
-- Migration 110 — Manager scope on it_requests by business unit.
--
-- Until now, anyone with profiles.role IN ('manager', 'admin') saw
-- and updated every it_request (migration 099 granted both via the
-- is_staff() helper). With multiple business units onboarding
-- people in parallel, a Manager from VO EUROPE shouldn't be reading
-- VO EVENT's pipeline — and shouldn't be touching anyone else's
-- submissions.
--
-- New rules:
--   - Admin keeps full access (unchanged — admin FOR ALL from 021).
--   - Manager SELECT is scoped to their business unit (profiles.business_unit).
--     The match is triple: legacy it_requests.business_unit column,
--     data->>'business_unit', or corporate_email domain == business_units.domain.
--     Lets two Managers of the same BU see each other's pending requests
--     to avoid duplicate onboardings — the original ask.
--   - Manager UPDATE on own request while pending — already covered by
--     migration 071's "Users can update own pending it_requests".
--   - Manager DELETE on own request anytime (no pending guard). New.
--
-- Also add onboarded_by_manager_id for traceability — the front-end
-- can record which manager kicked off the onboarding, separately
-- from requester_id (which can be reassigned later).
-- =============================================================

BEGIN;

-- 1. Traceability column. Separate from requester_id so we always
-- know who originally submitted, even if requester_id is repointed.
ALTER TABLE public.it_requests
  ADD COLUMN IF NOT EXISTS onboarded_by_manager_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_it_requests_onboarded_by_manager
  ON public.it_requests(onboarded_by_manager_id);

-- 2. Helper: does the current Manager's business_unit match the request?
-- SECURITY DEFINER so the function can read profiles + business_units
-- regardless of the calling user's row-level grants.
CREATE OR REPLACE FUNCTION public.is_manager_of_request_bu(
  req_business_unit TEXT,
  req_data          JSONB
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.business_units bu ON bu.value = p.business_unit
    WHERE p.id = auth.uid()
      AND p.role = 'manager'
      AND p.business_unit IS NOT NULL
      AND p.business_unit <> ''
      AND (
        req_business_unit = p.business_unit
        OR req_data->>'business_unit' = p.business_unit
        OR (bu.domain IS NOT NULL AND req_data->>'corporate_email' ILIKE '%@' || bu.domain)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_manager_of_request_bu(TEXT, JSONB) TO authenticated;

-- 3. Replace the blanket "Staff" policies from migration 099 with role-split rules.
DROP POLICY IF EXISTS "Staff can view all it_requests" ON public.it_requests;
DROP POLICY IF EXISTS "Staff can update it_requests" ON public.it_requests;

-- Managers see every request inside their BU (to avoid duplicate work).
CREATE POLICY "Managers view it_requests of own BU"
  ON public.it_requests
  FOR SELECT
  USING (public.is_manager_of_request_bu(business_unit, data));

-- Managers cancel their own request at any status (own = requester_id
-- or requested_by — the codebase populates one or the other depending
-- on flow). The BU check is belt-and-braces: a manager whose BU was
-- later renamed can still tidy up their own past requests, but only
-- if they still own the row.
CREATE POLICY "Managers delete own it_requests"
  ON public.it_requests
  FOR DELETE
  USING (
    (requester_id = auth.uid() OR requested_by = auth.uid())
    AND public.is_manager_of_request_bu(business_unit, data)
  );

-- Note: UPDATE for managers on their own pending request is already
-- covered by migration 071 ("Users can update own pending it_requests")
-- which gates on requester_id = auth.uid() AND status = 'pending'.
-- We deliberately do NOT add a manager-update-anyone-in-BU policy:
-- "Ne peut pas toucher aux demandes des autres Managers".

COMMIT;
