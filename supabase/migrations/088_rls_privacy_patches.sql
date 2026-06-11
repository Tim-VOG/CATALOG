-- =============================================================
-- Migration 088 — RLS privacy patches (T1, T2, T3 from RLS audit)
--
-- Tightens three SELECT policies that were 'visible to any
-- authenticated user' — which on a multi-tenant-ish internal hub
-- like VO is a privacy leak (one employee can read every other
-- employee's QR assignments / scan history / shared mailbox list).
--
-- Each block DROPs the loose policy and recreates a tight pair
-- (user sees their own, admin sees all). No table touched outside
-- the policies themselves.
-- =============================================================


-- ─── T1: qr_codes — was visible to any authenticated user ─────
--
-- Allowed any logged-in user to enumerate every QR code in the
-- catalog together with assigned_to / assigned_to_name /
-- assigned_to_email. Now scoped: a regular user only sees codes
-- assigned to themselves; admins keep full visibility (needed by
-- /admin/qr-codes and /admin/requests/:id assignment flows).

DROP POLICY IF EXISTS "QR codes are viewable by authenticated users" ON public.qr_codes;

CREATE POLICY "Users can view own QR codes" ON public.qr_codes
    FOR SELECT
    USING (assigned_to = auth.uid());

CREATE POLICY "Admins can view all QR codes" ON public.qr_codes
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── T2: qr_scan_logs — was visible to any authenticated user ─
--
-- Same problem: any user could read every scan event (who scanned
-- which device, when). Scoped: user sees their own scans only;
-- admins keep full visibility for /admin/scan-logs.

DROP POLICY IF EXISTS "Scan logs are viewable by authenticated users" ON public.qr_scan_logs;

CREATE POLICY "Users can view own scan logs" ON public.qr_scan_logs
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all scan logs" ON public.qr_scan_logs
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── T3: shared_mailboxes — was visible to any authenticated user
--
-- Exposed the 130-row FMB inventory (functional mailboxes, project
-- leaders, who-has-access list, archive / delete schedules) to every
-- employee. /admin/shared-mailboxes is the only UI that consumes it
-- and it sits under RequireAdmin, so we lock SELECT to admins.
--
-- (If, later, regular users need to see the FMBs they personally
-- lead or have access to, add a second policy matching them by
-- name / email against project_leader / have_access — see commented
-- example at the bottom.)

DROP POLICY IF EXISTS "Shared mailboxes are viewable by authenticated users" ON public.shared_mailboxes;

CREATE POLICY "Admins can view all shared mailboxes" ON public.shared_mailboxes
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Optional future extension — uncomment if/when the user-side panel
-- needs to surface 'mailboxes I lead or have access to':
--
-- CREATE POLICY "Users can view mailboxes they lead or access" ON public.shared_mailboxes
--     FOR SELECT
--     USING (
--         project_leader ILIKE '%' || (
--             SELECT first_name || ' ' || last_name
--             FROM public.profiles WHERE id = auth.uid()
--         ) || '%'
--         OR have_access ILIKE '%' || (
--             SELECT email FROM public.profiles WHERE id = auth.uid()
--         ) || '%'
--     );


NOTIFY pgrst, 'reload schema';
