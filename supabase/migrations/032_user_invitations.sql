-- ═══════════════════════════════════════════════════════════════
-- Migration 032: User Invitations
-- Allows admins to invite new users by email.
-- On first Microsoft SSO login, the post-login logic checks
-- for pending invitations and auto-grants all module access.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) DEFAULT '',
    last_name VARCHAR(255) DEFAULT '',
    business_unit VARCHAR(255) DEFAULT '',
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one pending invitation per email
CREATE UNIQUE INDEX idx_user_invitations_email_pending
  ON user_invitations(email) WHERE status = 'pending';

-- Lookup by token (for future use)
CREATE INDEX idx_user_invitations_token ON user_invitations(token);

-- Updated_at trigger
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage invitations" ON user_invitations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Authenticated users can read their own invitation (matched by email)
CREATE POLICY "Users can view own invitations" ON user_invitations
    FOR SELECT USING (
        lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
    );

-- Authenticated users can accept their own invitation
CREATE POLICY "Users can accept own invitations" ON user_invitations
    FOR UPDATE USING (
        lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
    WITH CHECK (
        status = 'accepted'
    );

NOTIFY pgrst, 'reload schema';
