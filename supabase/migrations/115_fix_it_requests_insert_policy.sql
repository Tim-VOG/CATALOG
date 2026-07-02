-- =============================================================
-- Migration 115 — Fix it_requests INSERT policy (requester_id).
--
-- The INSERT policy from 031 only accepted rows where the DB column
-- `requested_by` = auth.uid(). But the onboarding / offboarding /
-- equipment forms populate `requester_id` instead (they keep the
-- form's "Requested By" text field inside data JSONB, not in the
-- requested_by column). Result: those submissions were rejected with
-- "new row violates row-level security policy for table it_requests".
--
-- Widen the check to accept ownership via EITHER column. Still
-- requires the caller to own the row or be an admin — no loss of
-- security, just recognises the other ownership column.
-- =============================================================

BEGIN;

DROP POLICY IF EXISTS "Users can create IT requests" ON public.it_requests;

CREATE POLICY "Users can create IT requests" ON public.it_requests
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    OR requester_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMIT;
