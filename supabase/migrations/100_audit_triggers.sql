-- =============================================================
-- Migration 100 — Populate audit_logs via triggers.
--
-- The audit_logs table has existed since 001 but nothing ever wrote
-- to it. Attach a generic SECURITY DEFINER trigger to the tables that
-- matter for an "who did what" trail:
--   - loan_requests       (status changes, deletes)
--   - it_requests         (onboarding/offboarding status, deletes)
--   - qr_codes            (status / assignment changes)
--   - products            (create / update / delete)
--   - profiles            (role changes)
--   - it_device_credentials (any change — sensitive)
--
-- The trigger records the acting user (auth.uid()), the action, the
-- entity, and a compact diff. SECURITY DEFINER lets it write despite
-- the admin-only INSERT policy on audit_logs.
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
    IF to_jsonb(NEW) ? 'status' AND (to_jsonb(OLD)->>'status') IS DISTINCT FROM (to_jsonb(NEW)->>'status') THEN
      v_action := 'status:' || COALESCE(to_jsonb(NEW)->>'status', '?');
    ELSIF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role THEN
      v_action := 'role:' || COALESCE(NEW.role, '?');
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

-- Attach to the audited tables.
DO $$
DECLARE
  t TEXT;
  audited TEXT[] := ARRAY[
    'loan_requests', 'it_requests', 'qr_codes',
    'products', 'profiles', 'it_device_credentials'
  ];
BEGIN
  FOREACH t IN ARRAY audited LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$s', t);
      EXECUTE format(
        'CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.fn_audit()', t);
    END IF;
  END LOOP;
END $$;

-- Read view: join the acting user's name/email for the UI.
CREATE OR REPLACE VIEW public.audit_logs_with_details AS
SELECT
  a.*,
  p.first_name AS actor_first_name,
  p.last_name  AS actor_last_name,
  p.email      AS actor_email
FROM public.audit_logs a
LEFT JOIN public.profiles p ON p.id = a.user_id;

GRANT SELECT ON public.audit_logs_with_details TO authenticated;

COMMIT;
