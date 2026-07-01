-- =============================================================
-- Manager business-unit scope tests (migration 110)
--
-- Verifies is_manager_of_request_bu() — the function the RLS policy
-- "Managers view it_requests of own BU" relies on — only matches
-- requests that belong to the acting manager's business unit.
--
-- The three match paths are all exercised:
--   1. the legacy it_requests.business_unit column
--   2. data->>'business_unit'
--   3. the corporate_email domain (via the business_units table)
--
-- Runs entirely inside BEGIN … ROLLBACK, so it temporarily flips one
-- existing profile to manager / VO EUROPE and restores everything on
-- exit — nothing is persisted.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/tests/manager_scope_test.sql
--
-- Exits with a clear EXCEPTION on the first failed assertion.
-- =============================================================

BEGIN;

DO $$
DECLARE
  v_uid         UUID;
  v_old_role    TEXT;
  v_old_bu      TEXT;
  r             BOOLEAN;
BEGIN
  -- Borrow any existing profile as our test subject.
  SELECT id, role, business_unit INTO v_uid, v_old_role, v_old_bu
  FROM public.profiles
  ORDER BY created_at
  LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'manager_scope_test: need at least one profile in the target DB';
  END IF;

  -- Sanity: the seed business units must exist (migration 109).
  IF NOT EXISTS (SELECT 1 FROM public.business_units WHERE value = 'VO EUROPE') THEN
    RAISE EXCEPTION 'manager_scope_test: business_units seed missing (run migration 109)';
  END IF;

  -- Act as this profile, promoted to manager of VO EUROPE.
  PERFORM set_config('request.jwt.claim.sub', v_uid::text, true);
  UPDATE public.profiles SET role = 'manager', business_unit = 'VO EUROPE' WHERE id = v_uid;

  -- ── 1. legacy business_unit column ──────────────────────────
  r := public.is_manager_of_request_bu('VO EUROPE', '{}'::jsonb);
  IF r IS NOT TRUE THEN
    RAISE EXCEPTION 'manager_scope_test 1: own BU (legacy column) should match, got %', r;
  END IF;

  r := public.is_manager_of_request_bu('VO EVENT', '{}'::jsonb);
  IF r IS NOT FALSE THEN
    RAISE EXCEPTION 'manager_scope_test 2: other BU (legacy column) must NOT match, got %', r;
  END IF;

  -- ── 2. data->>''business_unit'' ─────────────────────────────
  r := public.is_manager_of_request_bu(NULL, '{"business_unit":"VO EUROPE"}'::jsonb);
  IF r IS NOT TRUE THEN
    RAISE EXCEPTION 'manager_scope_test 3: own BU (data json) should match, got %', r;
  END IF;

  r := public.is_manager_of_request_bu(NULL, '{"business_unit":"VO EVENT"}'::jsonb);
  IF r IS NOT FALSE THEN
    RAISE EXCEPTION 'manager_scope_test 4: other BU (data json) must NOT match, got %', r;
  END IF;

  -- ── 3. corporate_email domain (via business_units.domain) ───
  r := public.is_manager_of_request_bu(NULL, '{"corporate_email":"newhire@vo-europe.eu"}'::jsonb);
  IF r IS NOT TRUE THEN
    RAISE EXCEPTION 'manager_scope_test 5: own BU (email domain) should match, got %', r;
  END IF;

  r := public.is_manager_of_request_bu(NULL, '{"corporate_email":"newhire@vo-event.be"}'::jsonb);
  IF r IS NOT FALSE THEN
    RAISE EXCEPTION 'manager_scope_test 6: other BU (email domain) must NOT match, got %', r;
  END IF;

  -- ── 4. a manager with no BU set sees nothing ────────────────
  UPDATE public.profiles SET business_unit = '' WHERE id = v_uid;
  r := public.is_manager_of_request_bu('VO EUROPE', '{"business_unit":"VO EUROPE"}'::jsonb);
  IF r IS NOT FALSE THEN
    RAISE EXCEPTION 'manager_scope_test 7: manager with empty BU must match nothing, got %', r;
  END IF;

  -- ── 5. a non-manager (regular user) is never scoped in ──────
  UPDATE public.profiles SET role = 'user', business_unit = 'VO EUROPE' WHERE id = v_uid;
  r := public.is_manager_of_request_bu('VO EUROPE', '{"business_unit":"VO EUROPE"}'::jsonb);
  IF r IS NOT FALSE THEN
    RAISE EXCEPTION 'manager_scope_test 8: non-manager must not be BU-scoped, got %', r;
  END IF;

  -- Restore (rollback also guarantees this, belt and braces).
  UPDATE public.profiles SET role = v_old_role, business_unit = v_old_bu WHERE id = v_uid;

  RAISE NOTICE 'manager_scope_test: all 8 assertions passed';
END $$;

ROLLBACK;
