-- ============================================
-- 017: Allow admin to create requests on behalf of users
-- ============================================

-- Add created_by column for audit tracking
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- ============================================
-- Update RLS policies on loan_requests
-- ============================================

-- Drop old INSERT policy that restricts to user_id = auth.uid()
DROP POLICY IF EXISTS "Users can create requests" ON loan_requests;

-- New policy: users can create their own, admins can create for anyone
CREATE POLICY "Users and admins can create requests" ON loan_requests
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- Update RLS policies on loan_request_items
-- ============================================

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Users can create request items" ON loan_request_items;

-- New policy: users can insert for own requests, admins can insert for any request
CREATE POLICY "Users and admins can create request items" ON loan_request_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM loan_requests WHERE id = request_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- Update view to include created_by info
-- ============================================

DROP VIEW IF EXISTS loan_requests_with_details;

CREATE VIEW loan_requests_with_details AS
SELECT
    lr.*,
    p.first_name AS user_first_name,
    p.last_name AS user_last_name,
    p.email AS user_email,
    p.avatar_url AS user_avatar_url,
    loc.name AS location_name,
    loc.address AS location_address,
    (SELECT COUNT(*) FROM loan_request_items WHERE request_id = lr.id) AS item_count,
    creator.first_name AS created_by_first_name,
    creator.last_name AS created_by_last_name
FROM loan_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
LEFT JOIN locations loc ON lr.location_id = loc.id
LEFT JOIN profiles creator ON lr.created_by = creator.id;
