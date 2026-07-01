-- =============================================================
-- Migration 096 — RLS audit patches.
--
-- Phase-1 follow-up to migrations 088, 089, 031: a full re-read of
-- every CREATE POLICY across migrations 001-095 flagged 3 INSERT
-- policies that authenticate the caller but don't bind the row to
-- them. Two of those exist in this environment and are patched here.
--
-- The third (personal_info_submissions, migration 063) was a public
-- onboarding-token flow that was never deployed to this Supabase
-- instance and is no longer referenced by the client code, so it is
-- intentionally not part of this migration. If the flow gets
-- resurrected, ship the SECURITY DEFINER RPC + tightened policy as
-- part of that work.
-- =============================================================

BEGIN;


-- ─── 1. qr_reservations INSERT ──────────────────────────────
-- Before: WITH CHECK (auth.role() = 'authenticated'). No user_id
--         bind — any logged-in user could reserve in another user's
--         name.
-- After:  user_id = auth.uid() OR caller is admin.

DROP POLICY IF EXISTS "Users can create reservations" ON public.qr_reservations;
CREATE POLICY "Users can create reservations" ON public.qr_reservations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─── 2. qr_waitlist INSERT ──────────────────────────────────
-- Same shape, same fix.

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
          AND tablename IN ('qr_reservations','qr_waitlist')) AS policies_remaining;

COMMIT;
