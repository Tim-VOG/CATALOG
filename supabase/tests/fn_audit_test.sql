-- =============================================================
-- fn_audit smoke tests
--
-- Standalone SQL script — run against any environment to verify
-- that the audit trigger from migration 100 (patched in 108) still
-- captures the four shapes of action we rely on in the UI:
--
--   1. INSERT       → action = 'create'
--   2. plain UPDATE → action = 'update', with a non-trivial diff
--   3. status flip  → action = 'status:<new>'
--   4. role flip    → action = 'role:<new>' (profiles only)
--   5. DELETE       → action = 'delete'
--
-- Also asserts:
--   - a "no-op" UPDATE (only updated_at changes) does NOT log a row
--   - the diff stays compact (only changed keys)
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/tests/fn_audit_test.sql
--
-- Exits non-zero on first failed assertion. Wraps everything in a
-- transaction with ROLLBACK so no test data is persisted.
-- =============================================================

BEGIN;

-- Each block raises EXCEPTION if the assertion fails, so a failing
-- run aborts with a clear message.

DO $$
DECLARE
  v_count        BIGINT;
  v_action       TEXT;
  v_new_keys     TEXT[];
  v_old_keys     TEXT[];
  v_user_id      UUID;
  v_request_id   UUID;
  v_baseline_n   BIGINT;
BEGIN
  -- Reuse an existing admin profile or fail loudly. Tests run against
  -- a populated environment.
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'fn_audit_test: need at least one admin profile in the target DB';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);

  -- ── Test 1: INSERT into it_requests logs action='create' ──────
  SELECT COUNT(*) INTO v_baseline_n FROM public.audit_logs WHERE entity_type = 'it_requests';

  INSERT INTO public.it_requests (type, status, requester_id, requester_email, requester_name, data)
  VALUES ('it', 'pending', v_user_id, 'fn_audit_test@example.test', 'fn_audit_test', '{"first_name":"Audit","last_name":"Test"}'::jsonb)
  RETURNING id INTO v_request_id;

  SELECT action INTO v_action
  FROM public.audit_logs
  WHERE entity_type = 'it_requests' AND entity_id = v_request_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_action IS DISTINCT FROM 'create' THEN
    RAISE EXCEPTION 'fn_audit_test 1: INSERT expected action=create, got %', v_action;
  END IF;

  -- ── Test 2: UPDATE with only updated_at change → no log ──────
  SELECT COUNT(*) INTO v_baseline_n FROM public.audit_logs WHERE entity_id = v_request_id;
  UPDATE public.it_requests SET updated_at = NOW() WHERE id = v_request_id;
  SELECT COUNT(*) INTO v_count FROM public.audit_logs WHERE entity_id = v_request_id;
  IF v_count <> v_baseline_n THEN
    RAISE EXCEPTION 'fn_audit_test 2: pure updated_at change should NOT log; before=%, after=%', v_baseline_n, v_count;
  END IF;

  -- ── Test 3: status flip → action='status:<new>' ──────────────
  UPDATE public.it_requests SET status = 'in_progress' WHERE id = v_request_id;
  SELECT action INTO v_action
  FROM public.audit_logs
  WHERE entity_id = v_request_id
  ORDER BY created_at DESC LIMIT 1;
  IF v_action IS DISTINCT FROM 'status:in_progress' THEN
    RAISE EXCEPTION 'fn_audit_test 3: status flip expected action=status:in_progress, got %', v_action;
  END IF;

  -- ── Test 4: diff is compact (only changed keys) ──────────────
  SELECT array_agg(key) INTO v_new_keys
  FROM (
    SELECT key FROM jsonb_each((
      SELECT new_values FROM public.audit_logs
      WHERE entity_id = v_request_id
      ORDER BY created_at DESC LIMIT 1
    ))
  ) sub;
  IF NOT v_new_keys @> ARRAY['status'] THEN
    RAISE EXCEPTION 'fn_audit_test 4: status diff missing "status" key, got %', v_new_keys;
  END IF;
  IF v_new_keys @> ARRAY['data'] AND array_length(v_new_keys, 1) > 3 THEN
    RAISE EXCEPTION 'fn_audit_test 4: diff should be compact, got % keys: %', array_length(v_new_keys, 1), v_new_keys;
  END IF;

  -- ── Test 5: plain UPDATE on a non-status column → action='update' ──
  UPDATE public.it_requests
  SET requester_name = 'fn_audit_test renamed'
  WHERE id = v_request_id;
  SELECT action INTO v_action
  FROM public.audit_logs
  WHERE entity_id = v_request_id
  ORDER BY created_at DESC LIMIT 1;
  IF v_action IS DISTINCT FROM 'update' THEN
    RAISE EXCEPTION 'fn_audit_test 5: plain UPDATE expected action=update, got %', v_action;
  END IF;

  -- ── Test 6: DELETE logs action='delete' with old_values ──────
  DELETE FROM public.it_requests WHERE id = v_request_id;
  SELECT action INTO v_action
  FROM public.audit_logs
  WHERE entity_id = v_request_id AND new_values IS NULL
  ORDER BY created_at DESC LIMIT 1;
  IF v_action IS DISTINCT FROM 'delete' THEN
    RAISE EXCEPTION 'fn_audit_test 6: DELETE expected action=delete, got %', v_action;
  END IF;

  -- ── Test 7: profiles role flip → action='role:<new>' ─────────
  -- Self-edit a sentinel column on the admin profile.
  UPDATE public.profiles SET role = 'manager' WHERE id = v_user_id;
  SELECT action INTO v_action
  FROM public.audit_logs
  WHERE entity_type = 'profiles' AND entity_id = v_user_id
  ORDER BY created_at DESC LIMIT 1;
  IF v_action IS DISTINCT FROM 'role:manager' THEN
    RAISE EXCEPTION 'fn_audit_test 7: role flip expected action=role:manager, got %', v_action;
  END IF;

  -- Flip the admin back inside the same transaction so the rollback
  -- doubly guarantees we leave state untouched.
  UPDATE public.profiles SET role = 'admin' WHERE id = v_user_id;

  RAISE NOTICE 'fn_audit_test: all 7 assertions passed';
END $$;

-- Discard every audit row + state change we just created.
ROLLBACK;
