-- ═══════════════════════════════════════════════════════════════
-- Local Development Seed: Admin Test User
-- Run with: npx supabase db reset
-- Login:    admin@vo-group.be / Admin123!
-- ═══════════════════════════════════════════════════════════════

-- 1. Create auth user (email login for local dev)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'admin@vo-group.be',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"full_name":"Admin Test","first_name":"Admin","last_name":"Test"}'::jsonb,
  NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create identity record (required for email/password login)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  jsonb_build_object('sub', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'email', 'admin@vo-group.be'),
  'email', 'admin@vo-group.be',
  NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- 3. Ensure profile exists with admin role
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@vo-group.be', 'Admin', 'Test', 'admin', true
) ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;

-- 4. Grant all module access
INSERT INTO module_access (user_id, module_key, granted) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'onboarding', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'it_form', true),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'functional_mailbox', true)
ON CONFLICT (user_id, module_key) DO NOTHING;
