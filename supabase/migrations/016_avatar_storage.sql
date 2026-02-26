-- ============================================
-- 016: Avatar Storage Bucket + RLS
-- ============================================

-- Create the avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read avatars (public bucket)
DO $$ BEGIN
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can upload to their own folder
DO $$ BEGIN
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update (replace) their own avatar
DO $$ BEGIN
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete their own avatar
DO $$ BEGIN
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Update loan_requests_with_details view to include avatar
-- Must DROP + CREATE because adding a column changes positions
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
    (SELECT COUNT(*) FROM loan_request_items WHERE request_id = lr.id) AS item_count
FROM loan_requests lr
LEFT JOIN profiles p ON lr.user_id = p.id
LEFT JOIN locations loc ON lr.location_id = loc.id;
