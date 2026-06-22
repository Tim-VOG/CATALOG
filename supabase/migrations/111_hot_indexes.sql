-- =============================================================
-- Migration 111 — Add three composite indexes that match the
-- hottest list-style queries in the app.
--
-- All three are partial indexes filtered on the soft-delete /
-- active flags the app already filters on at query time, so the
-- index stays small and the planner picks it directly.
-- =============================================================

BEGIN;

-- 1. it_requests list pages query by requester + sort by created_at DESC.
-- Examples: useMyItRequests, ManagerDashboardPage time slices,
-- onboarding/offboarding admin tables.
CREATE INDEX IF NOT EXISTS idx_it_requests_requester_created
  ON public.it_requests (requester_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 2. loan_requests list pages filter by user_id + status + sort by created_at DESC.
-- Examples: MyEquipmentPage active vs returned, admin equipment queue.
CREATE INDEX IF NOT EXISTS idx_loan_requests_user_status_created
  ON public.loan_requests (user_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- 3. profiles admin list filters by role + sorts by created_at DESC.
-- Example: AdminUsersPage role filter ("all", "admin", "manager", "user").
CREATE INDEX IF NOT EXISTS idx_profiles_role_created
  ON public.profiles (role, created_at DESC)
  WHERE is_active = TRUE;

COMMIT;
