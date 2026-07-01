-- =============================================================
-- Migration 108 — Fix fn_audit() OLD.role access on non-profiles tables.
--
-- The audit trigger from migration 100 read OLD.role inside an
-- ELSIF with an AND clause:
--
--   ELSIF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role
--
-- PL/pgSQL does not short-circuit AND in IF conditions, so OLD.role
-- got evaluated on every audited table — and crashed on the ones
-- without a role column (products, qr_codes, it_requests,
-- loan_requests, it_device_credentials):
--
--   ERROR: record "old" has no field "role"
--
-- Nest the table check so OLD.role is only ever read when we're
-- already inside the profiles branch.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action     TEXT;
  v_entity_id  UUID;
  v_old        JSONB;
  v_new        JSONB;
  v_old_role   TEXT;
  v_new_role   TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_entity_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_entity_id := OLD.id;
  ELSE -- UPDATE
    v_entity_id := NEW.id;
    -- For status-bearing tables, label the action by the status move.
    IF to_jsonb(NEW) ? 'status'
       AND (to_jsonb(OLD)->>'status') IS DISTINCT FROM (to_jsonb(NEW)->>'status') THEN
      v_action := 'status:' || COALESCE(to_jsonb(NEW)->>'status', '?');
    ELSIF TG_TABLE_NAME = 'profiles' THEN
      -- Read role via to_jsonb() instead of OLD.role / NEW.role so the
      -- plan compiles for every audited table (PL/pgSQL doesn't
      -- short-circuit AND in IF conditions).
      v_old_role := to_jsonb(OLD)->>'role';
      v_new_role := to_jsonb(NEW)->>'role';
      IF v_old_role IS DISTINCT FROM v_new_role THEN
        v_action := 'role:' || COALESCE(v_new_role, '?');
      ELSE
        v_action := 'update';
      END IF;
    ELSE
      v_action := 'update';
    END IF;
    -- Only keep changed keys in the diff to stay compact.
    v_old := (SELECT jsonb_object_agg(key, value)
              FROM jsonb_each(to_jsonb(OLD))
              WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key);
    v_new := (SELECT jsonb_object_agg(key, value)
              FROM jsonb_each(to_jsonb(NEW))
              WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key);
    -- Skip pure no-op updates (e.g. updated_at only) to avoid noise.
    IF v_action = 'update' AND (v_new - 'updated_at') = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_entity_id, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

COMMIT;
