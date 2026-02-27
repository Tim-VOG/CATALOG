-- Add missing DELETE policy on profiles table so admins can delete users
CREATE POLICY "Admins can delete any profile" ON profiles
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Fix: loan_requests.user_id is ON DELETE SET NULL but NOT NULL — contradictory.
-- Allow NULL so deleted users' requests are preserved with user_id = NULL.
ALTER TABLE loan_requests ALTER COLUMN user_id DROP NOT NULL;

-- Fix: extension_requests.user_id has no ON DELETE action (defaults to RESTRICT).
-- Change to SET NULL so deleting a user doesn't block on extension_requests.
ALTER TABLE extension_requests DROP CONSTRAINT IF EXISTS extension_requests_user_id_fkey;
ALTER TABLE extension_requests
    ADD CONSTRAINT extension_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE extension_requests ALTER COLUMN user_id DROP NOT NULL;

-- Fix: it_requests.requested_by has no ON DELETE action (defaults to RESTRICT).
-- Change to SET NULL so deleting a user doesn't block on it_requests.
ALTER TABLE it_requests DROP CONSTRAINT IF EXISTS it_requests_requested_by_fkey;
ALTER TABLE it_requests
    ADD CONSTRAINT it_requests_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Fix: loan_requests.created_by has no ON DELETE action.
ALTER TABLE loan_requests DROP CONSTRAINT IF EXISTS loan_requests_created_by_fkey;
ALTER TABLE loan_requests
    ADD CONSTRAINT loan_requests_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Fix: loan_requests.approved_by has no ON DELETE action.
ALTER TABLE loan_requests DROP CONSTRAINT IF EXISTS loan_requests_approved_by_fkey;
ALTER TABLE loan_requests
    ADD CONSTRAINT loan_requests_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
