-- ============================================
-- MIGRATION 070: Let users cancel their own pending requests
-- Until now only admins could DELETE rows from loan/it/mailbox_requests,
-- which silently broke the "Cancel request" button on /my-requests.
-- ============================================

-- ─── loan_requests ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own pending requests" ON loan_requests;
CREATE POLICY "Users can delete own pending requests" ON loan_requests
  FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Users can delete own pending request items" ON loan_request_items;
CREATE POLICY "Users can delete own pending request items" ON loan_request_items
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM loan_requests r
    WHERE r.id = loan_request_items.request_id
      AND r.user_id = auth.uid()
      AND r.status = 'pending'
  ));

-- ─── it_requests ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own pending it_requests" ON it_requests;
CREATE POLICY "Users can delete own pending it_requests" ON it_requests
  FOR DELETE
  USING (requester_id = auth.uid() AND status = 'pending');

-- ─── mailbox_requests ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own pending mailbox_requests" ON mailbox_requests;
CREATE POLICY "Users can delete own pending mailbox_requests" ON mailbox_requests
  FOR DELETE
  USING (requester_id = auth.uid() AND status = 'pending');
