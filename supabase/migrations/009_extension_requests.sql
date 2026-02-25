-- Migration 009: Extension Requests
-- Allows users to request extra days for picked_up loans

CREATE TABLE IF NOT EXISTS extension_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    requested_days INTEGER NOT NULL CHECK (requested_days > 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    granted_days INTEGER,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_extension_requests_request_id ON extension_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_extension_requests_user_id ON extension_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_requests_status ON extension_requests(status);

-- Trigger for updated_at
CREATE TRIGGER update_extension_requests_updated_at
    BEFORE UPDATE ON extension_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- View with joined details
CREATE OR REPLACE VIEW extension_requests_with_details AS
SELECT
    er.*,
    p.first_name AS user_first_name,
    p.last_name AS user_last_name,
    p.email AS user_email,
    lr.project_name,
    lr.pickup_date,
    lr.return_date,
    lr.status AS request_status,
    lr.request_number,
    reviewer.first_name AS reviewer_first_name,
    reviewer.last_name AS reviewer_last_name
FROM extension_requests er
LEFT JOIN profiles p ON er.user_id = p.id
LEFT JOIN loan_requests lr ON er.request_id = lr.id
LEFT JOIN profiles reviewer ON er.reviewed_by = reviewer.id;

-- RLS
ALTER TABLE extension_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own extension requests
CREATE POLICY "Users can view own extension requests" ON extension_requests
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all extension requests
CREATE POLICY "Admins can view all extension requests" ON extension_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can create extension requests for their own loans
CREATE POLICY "Users can create own extension requests" ON extension_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Only admins can update extension requests (approve/reject)
CREATE POLICY "Only admins can update extension requests" ON extension_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
