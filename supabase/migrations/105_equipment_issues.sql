-- =============================================================
-- Migration 105 — Equipment issue tickets ("report a problem").
--
-- A user reports a problem with a device they hold; it becomes a
-- ticket the IT team can see + resolve, with an optional photo. On
-- creation every admin gets an in-app notification (which, once push
-- is configured, also lands on their phone).
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.equipment_issues (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  qr_code_id    UUID REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  qr_code       TEXT,
  product_name  TEXT,
  reported_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name TEXT,
  reporter_email TEXT,
  description   TEXT NOT NULL,
  photo_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_issues_status ON public.equipment_issues (status);
CREATE INDEX IF NOT EXISTS idx_equipment_issues_reporter ON public.equipment_issues (reported_by);

ALTER TABLE public.equipment_issues ENABLE ROW LEVEL SECURITY;

-- Users create their own; staff (admin/manager) see + manage all.
DROP POLICY IF EXISTS "Users create own issues" ON public.equipment_issues;
CREATE POLICY "Users create own issues" ON public.equipment_issues
  FOR INSERT WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Users read own issues" ON public.equipment_issues;
CREATE POLICY "Users read own issues" ON public.equipment_issues
  FOR SELECT USING (reported_by = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "Staff manage issues" ON public.equipment_issues;
CREATE POLICY "Staff manage issues" ON public.equipment_issues
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Notify every admin when an issue is opened.
CREATE OR REPLACE FUNCTION public.fn_notify_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT a.id,
         'it_material',
         'Equipment issue reported',
         COALESCE(NEW.reporter_name, 'Someone') || ' reported a problem with ' ||
           COALESCE(NEW.product_name, NEW.qr_code, 'a device'),
         '/admin/issues'
  FROM public.profiles a
  WHERE a.role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_issue ON public.equipment_issues;
CREATE TRIGGER trg_notify_issue
  AFTER INSERT ON public.equipment_issues
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_issue();

COMMIT;
