-- Migration 021: IT Request Form + Module Access Control

-- ============================================================
-- 1. IT Request submissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS it_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    -- Person info
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    status VARCHAR(100) DEFAULT '',
    business_unit VARCHAR(255) DEFAULT '',
    signature_title VARCHAR(255) DEFAULT '',
    start_date DATE,
    leaving_date DATE,
    -- IT needs
    needs_computer BOOLEAN DEFAULT FALSE,
    access_needs TEXT[] DEFAULT '{}',
    sharepoint_url TEXT DEFAULT '',
    listing VARCHAR(255) DEFAULT '',
    listing_date DATE,
    -- Meta
    requested_by UUID REFERENCES profiles(id),
    requested_by_name VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_it_requests_updated_at
    BEFORE UPDATE ON it_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: authenticated users can create; admins can manage all
ALTER TABLE it_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create IT requests" ON it_requests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own IT requests" ON it_requests
    FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Admins can manage all IT requests" ON it_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 2. Module access control table
-- ============================================================
CREATE TABLE IF NOT EXISTS module_access (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    module_key VARCHAR(50) NOT NULL CHECK (module_key IN ('catalog', 'onboarding', 'it_form', 'functional_mailbox')),
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_key)
);

CREATE TRIGGER update_module_access_updated_at
    BEFORE UPDATE ON module_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own module access" ON module_access
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage module access" ON module_access
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_module_access_user ON module_access(user_id);
CREATE INDEX IF NOT EXISTS idx_module_access_module ON module_access(module_key);
CREATE INDEX IF NOT EXISTS idx_it_requests_requested_by ON it_requests(requested_by);
