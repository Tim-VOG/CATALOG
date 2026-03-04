-- ═══════════════════════════════════════════════════════════════
-- Migration 033: Onboarding Template Save + Invitation Email Editor
-- 1. Add default_enabled to onboarding_block_templates
-- 2. Add email columns to user_invitations for draft/preview support
-- 3. Seed a default user_invitation email template
-- ═══════════════════════════════════════════════════════════════

-- 1. Allow blocks to be disabled by default in the template
ALTER TABLE onboarding_block_templates
  ADD COLUMN IF NOT EXISTS default_enabled BOOLEAN DEFAULT true;

-- 2. Add email draft columns to user_invitations
ALTER TABLE user_invitations
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_body TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- 3. Seed the invitation email template
INSERT INTO email_templates (template_key, name, subject, body, description, variables, format, is_active)
VALUES (
    'user_invitation',
    'User Invitation',
    'You''re invited to join {{app_name}}',
    E'Dear {{first_name}},\n\nYou''ve been invited to join {{app_name}}! Click the button below to sign in with your Microsoft account and get started.\n\n<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0;"><a href="{{login_url}}" style="display:inline-block;padding:14px 32px;border-radius:8px;background:linear-gradient(135deg,#f97316,#06b6d4);color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">Get Started</a></td></tr></table>\n\nYou''ll have access to all platform features once you sign in.\n\nBest regards,\nThe {{app_name}} Team',
    'Sent when an admin invites a new user to the platform',
    ARRAY['first_name', 'last_name', 'app_name', 'login_url'],
    'html',
    true
)
ON CONFLICT (template_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
