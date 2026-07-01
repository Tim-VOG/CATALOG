-- ============================================
-- MIGRATION 071: Replace user-side cancel with a "note to admin"
-- - Drop the DELETE policies from 070 (users can no longer cancel)
-- - Add a user_notes TEXT column on loan_requests + mailbox_requests
--   (it_requests already stores everything inside data jsonb)
-- - Make sure users can UPDATE their own pending rows so they can
--   write / edit that note. The UI only exposes the notes field.
-- ============================================

DROP POLICY IF EXISTS "Users can delete own pending requests"         ON loan_requests;
DROP POLICY IF EXISTS "Users can delete own pending request items"    ON loan_request_items;
DROP POLICY IF EXISTS "Users can delete own pending it_requests"      ON it_requests;
DROP POLICY IF EXISTS "Users can delete own pending mailbox_requests" ON mailbox_requests;

-- ─── user_notes column on tables that don't already have data{} ───
ALTER TABLE loan_requests    ADD COLUMN IF NOT EXISTS user_notes TEXT DEFAULT '';
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS user_notes TEXT DEFAULT '';

-- ─── UPDATE policies on it_requests / mailbox_requests ───────────
-- loan_requests already has "Users can update own draft/pending requests"
DROP POLICY IF EXISTS "Users can update own pending it_requests" ON it_requests;
CREATE POLICY "Users can update own pending it_requests" ON it_requests
  FOR UPDATE
  USING      (requester_id = auth.uid() AND status = 'pending')
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Users can update own pending mailbox_requests" ON mailbox_requests;
CREATE POLICY "Users can update own pending mailbox_requests" ON mailbox_requests
  FOR UPDATE
  USING      (requested_by = auth.uid() AND status = 'pending')
  WITH CHECK (requested_by = auth.uid() AND status = 'pending');
