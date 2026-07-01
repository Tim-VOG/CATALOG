-- ============================================
-- MIGRATION 049: Fix RLS for it_requests
-- Users need to see requests where requester_id = their ID
-- (old policy only checked requested_by)
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can view own IT requests" ON it_requests;

-- New policy: check both old and new columns
CREATE POLICY "Users can view own IT requests" ON it_requests
    FOR SELECT USING (
        requested_by = auth.uid() OR requester_id = auth.uid()
    );
