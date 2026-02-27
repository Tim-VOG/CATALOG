-- ═══════════════════════════════════════════════════════════════
-- Migration 025: Offboarding tables + profile updates + role cleanup
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Add business_unit to profiles ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_unit VARCHAR(255) DEFAULT '';

-- ── 2. Remove 'manager' role: convert existing managers → user, update constraint ──
UPDATE profiles SET role = 'user' WHERE role = 'manager';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- ── 3. Update module_access to include offboarding ──
ALTER TABLE module_access DROP CONSTRAINT IF EXISTS module_access_module_key_check;
ALTER TABLE module_access ADD CONSTRAINT module_access_module_key_check
  CHECK (module_key IN ('catalog', 'onboarding', 'it_form', 'functional_mailbox', 'offboarding'));

-- ── 4. Offboarding processes ──
CREATE TABLE IF NOT EXISTS offboarding_processes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    it_request_id UUID REFERENCES it_requests(id) ON DELETE SET NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    personal_email VARCHAR(255) DEFAULT '',
    business_unit VARCHAR(255) DEFAULT '',
    departure_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    checklist JSONB DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Offboarding form fields (configurable checklist) ──
CREATE TABLE IF NOT EXISTS offboarding_form_fields (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL DEFAULT 'checkbox'
      CHECK (field_type IN ('text', 'textarea', 'select', 'multi_select', 'date', 'toggle', 'checkbox')),
    step VARCHAR(50) DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    placeholder VARCHAR(255) DEFAULT '',
    help_text TEXT DEFAULT '',
    options JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. RLS for offboarding tables ──
ALTER TABLE offboarding_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_form_fields ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_manage_offboarding" ON offboarding_processes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_manage_offboarding_fields" ON offboarding_form_fields
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── 7. Seed default offboarding checklist ──
INSERT INTO offboarding_form_fields (field_key, label, field_type, step, sort_order, is_active, help_text) VALUES
  ('departure_date', 'Last working day', 'date', 'general', 0, true, 'Employee''s final date'),
  ('revoke_email', 'Revoke email access', 'checkbox', 'access', 1, true, 'Disable corporate email account'),
  ('revoke_vpn', 'Revoke VPN access', 'checkbox', 'access', 2, true, 'Remove VPN credentials'),
  ('revoke_building', 'Revoke building access', 'checkbox', 'access', 3, true, 'Deactivate badge/access card'),
  ('collect_laptop', 'Collect laptop', 'checkbox', 'equipment', 4, true, 'Retrieve company laptop'),
  ('collect_phone', 'Collect mobile phone', 'checkbox', 'equipment', 5, true, 'Retrieve company phone'),
  ('collect_badge', 'Collect employee badge', 'checkbox', 'equipment', 6, true, 'Retrieve physical ID badge'),
  ('archive_files', 'Archive personal files', 'checkbox', 'data', 7, true, 'Backup and archive employee files'),
  ('transfer_projects', 'Transfer ongoing projects', 'checkbox', 'data', 8, true, 'Handover active projects'),
  ('remove_licenses', 'Remove software licenses', 'checkbox', 'data', 9, true, 'Revoke software subscriptions'),
  ('exit_interview', 'Schedule exit interview', 'checkbox', 'hr', 10, true, 'Coordinate with HR'),
  ('final_paycheck', 'Process final paycheck', 'checkbox', 'hr', 11, true, 'Ensure all payments settled')
ON CONFLICT DO NOTHING;

-- ── 8. Updated_at trigger for new tables ──
CREATE OR REPLACE FUNCTION update_offboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_offboarding_updated_at BEFORE UPDATE ON offboarding_processes
FOR EACH ROW EXECUTE FUNCTION update_offboarding_updated_at();

CREATE TRIGGER set_offboarding_fields_updated_at BEFORE UPDATE ON offboarding_form_fields
FOR EACH ROW EXECUTE FUNCTION update_offboarding_updated_at();
