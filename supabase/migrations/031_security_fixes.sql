-- ═══════════════════════════════════════════════════════════════
-- Migration 031: Security Fixes
-- Addresses Supabase Security Advisor warnings:
--   1. SECURITY DEFINER functions without search_path (Auth Leak)
--   2. Overly permissive INSERT policies (RLS Bypass)
--   3. Views without security_invoker (Insecure Views)
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. FIX: SECURITY DEFINER functions — add SET search_path = ''
--    Without a fixed search_path, a malicious actor could
--    hijack function behavior via search_path manipulation.
--    All table references must be fully qualified (public.xxx).
-- ═══════════════════════════════════════════════════════════════

-- 1a. handle_new_user() — Creates profile on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, azure_oid, department, job_title, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name', ''),
    new.raw_user_meta_data->>'oid',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'jobTitle',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.profiles.last_name),
    azure_oid = COALESCE(EXCLUDED.azure_oid, public.profiles.azure_oid),
    department = COALESCE(EXCLUDED.department, public.profiles.department),
    job_title = COALESCE(EXCLUDED.job_title, public.profiles.job_title),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1b. notify_request_status_change() — Notifies user on status change
CREATE OR REPLACE FUNCTION public.notify_request_status_change()
RETURNS trigger AS $$
DECLARE
  v_title text;
  v_message text;
  v_link text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_link := '/requests/' || NEW.id;

  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'Request Approved';
      v_message := 'Your request "' || NEW.project_name || '" has been approved. You can pick up your equipment.';
    WHEN 'rejected' THEN
      v_title := 'Request Rejected';
      v_message := 'Your request "' || NEW.project_name || '" has been rejected.';
      IF NEW.rejection_reason IS NOT NULL THEN
        v_message := v_message || ' Reason: ' || NEW.rejection_reason;
      END IF;
    WHEN 'picked_up' THEN
      v_title := 'Equipment Picked Up';
      v_message := 'Equipment for "' || NEW.project_name || '" has been marked as picked up.';
    WHEN 'returned' THEN
      v_title := 'Equipment Returned';
      v_message := 'Equipment for "' || NEW.project_name || '" has been marked as returned.';
    WHEN 'closed' THEN
      v_title := 'Request Closed';
      v_message := 'Your request "' || NEW.project_name || '" has been closed.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (NEW.user_id, 'request_status', v_title, v_message, v_link);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1c. notify_new_request() — Notifies admins on new request
CREATE OR REPLACE FUNCTION public.notify_new_request()
RETURNS trigger AS $$
DECLARE
  v_admin record;
  v_requester_name text;
BEGIN
  SELECT first_name || ' ' || last_name INTO v_requester_name
  FROM public.profiles WHERE id = NEW.user_id;

  FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      v_admin.id,
      'new_request',
      'New Equipment Request',
      v_requester_name || ' submitted a request for "' || NEW.project_name || '".',
      '/admin/requests/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 1d. cleanup_old_requests() — Scheduled daily cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_loans     INT := 0;
  deleted_it        INT := 0;
  deleted_mailbox   INT := 0;
BEGIN
  WITH d AS (
    DELETE FROM public.loan_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_loans FROM d;

  WITH d AS (
    DELETE FROM public.it_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_it FROM d;

  WITH d AS (
    DELETE FROM public.mailbox_requests
    WHERE (status = 'completed' AND updated_at < NOW() - INTERVAL '6 months')
       OR (status = 'rejected'  AND updated_at < NOW() - INTERVAL '3 months')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_mailbox FROM d;

  RAISE LOG 'cleanup_old_requests: deleted % loans, % IT, % mailbox requests',
    deleted_loans, deleted_it, deleted_mailbox;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 2. FIX: Overly permissive INSERT policies
--    WITH CHECK (true) on INSERT allows any authenticated user
--    to create rows for OTHER users (e.g., fake notifications,
--    fake audit logs). Triggers use SECURITY DEFINER and bypass
--    RLS, so restricting these policies does not affect triggers.
-- ═══════════════════════════════════════════════════════════════

-- 2a. Notifications: restrict INSERT to own user_id only
--     Trigger-based inserts bypass RLS (SECURITY DEFINER).
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users can create own notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2b. Audit logs: restrict INSERT to admins only via API
--     Trigger-based inserts bypass RLS (SECURITY DEFINER).
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;
CREATE POLICY "Admins can create audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2c. Mailbox requests: verify requester identity
DROP POLICY IF EXISTS "mailbox_requests_insert" ON public.mailbox_requests;
CREATE POLICY "mailbox_requests_insert" ON public.mailbox_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2d. IT requests: verify requester identity
DROP POLICY IF EXISTS "Users can create IT requests" ON public.it_requests;
CREATE POLICY "Users can create IT requests" ON public.it_requests
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ═══════════════════════════════════════════════════════════════
-- 3. FIX: Views without security_invoker = true
--    By default, views execute with the view owner's permissions
--    (SECURITY DEFINER), bypassing RLS on underlying tables.
--    Setting security_invoker = true ensures the calling user's
--    RLS policies are enforced.
--    Requires PostgreSQL 15+ (Supabase uses PG 15+).
-- ═══════════════════════════════════════════════════════════════

ALTER VIEW public.products_with_category SET (security_invoker = true);
ALTER VIEW public.loans_with_details SET (security_invoker = true);
ALTER VIEW public.loan_requests_with_details SET (security_invoker = true);
ALTER VIEW public.loan_request_items_with_details SET (security_invoker = true);
ALTER VIEW public.extension_requests_with_details SET (security_invoker = true);


-- ═══════════════════════════════════════════════════════════════
-- 4. FIX: Require authentication for locations SELECT
--    Locations contain internal office addresses and should not
--    be accessible without authentication.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Locations are viewable by everyone" ON public.locations;
CREATE POLICY "Locations are viewable by authenticated users" ON public.locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ═══════════════════════════════════════════════════════════════
-- 5. FIX: Revoke public execute on functions
--    By default, PostgreSQL grants EXECUTE to PUBLIC on all
--    functions. Restrict sensitive functions to authenticated.
-- ═══════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_request_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_request() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_requests() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_available_stock(UUID, DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_available_stock_v2(UUID, DATE, DATE, UUID) FROM PUBLIC;

-- Grant back to postgres (superuser) and authenticated role
GRANT EXECUTE ON FUNCTION public.get_available_stock(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_stock_v2(UUID, DATE, DATE, UUID) TO authenticated;


-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
