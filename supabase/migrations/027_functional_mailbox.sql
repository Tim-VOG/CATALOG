-- ============================================================
-- 027 — Functional Mailbox Request: tables + form builder
-- ============================================================

-- ── Table: mailbox_requests ──
CREATE TABLE IF NOT EXISTS mailbox_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section 1: Functional Mailbox (general)
  project_name VARCHAR(255) NOT NULL,
  project_leader VARCHAR(255),
  agency VARCHAR(100),
  email_to_create VARCHAR(100),
  who_needs_access TEXT,
  creation_date DATE,

  -- Section 2: Signature
  display_name VARCHAR(255),
  signature_title VARCHAR(255),
  banner_url TEXT,
  links TEXT,
  more_info TEXT,

  -- Section 3: Email Management
  deleted_archived VARCHAR(50),

  -- Section 4: Requester (auto-filled from profile)
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requested_by_name VARCHAR(255),
  requested_on DATE DEFAULT CURRENT_DATE,
  requester_email VARCHAR(255),

  -- Admin management
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','completed','cancelled')),
  admin_notes TEXT,
  custom_fields JSONB DEFAULT '{}',

  -- Email tracking
  confirmation_email_sent BOOLEAN DEFAULT false,
  onepassword_link TEXT,
  archive_date DATE,
  deletion_date DATE,
  archive_reminder_sent BOOLEAN DEFAULT false,
  deletion_reminder_sent BOOLEAN DEFAULT false,
  archive_confirmed BOOLEAN DEFAULT false,
  deletion_confirmed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS for mailbox_requests ──
ALTER TABLE mailbox_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mailbox_requests_insert" ON mailbox_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "mailbox_requests_select" ON mailbox_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "mailbox_requests_admin_update" ON mailbox_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "mailbox_requests_admin_delete" ON mailbox_requests
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_mailbox_requests_updated_at
  BEFORE UPDATE ON mailbox_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Table: mailbox_form_fields ──
CREATE TABLE IF NOT EXISTS mailbox_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(30) NOT NULL CHECK (field_type IN (
    'text', 'select', 'multi_select', 'date', 'checkbox', 'toggle', 'textarea', 'file'
  )),
  step VARCHAR(30) NOT NULL DEFAULT 'additional' CHECK (step IN (
    'general', 'signature', 'management', 'requester', 'additional'
  )),
  placeholder VARCHAR(255) DEFAULT '',
  help_text VARCHAR(500) DEFAULT '',
  is_required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]',

  -- Conditional logic
  condition_field VARCHAR(100) DEFAULT NULL,
  condition_operator VARCHAR(20) DEFAULT NULL CHECK (condition_operator IS NULL OR condition_operator IN (
    'equals', 'not_equals', 'contains', 'is_true', 'is_false'
  )),
  condition_value TEXT DEFAULT NULL,

  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS for mailbox_form_fields ──
ALTER TABLE mailbox_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mailbox_form_fields_select" ON mailbox_form_fields
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mailbox_form_fields_admin_insert" ON mailbox_form_fields
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "mailbox_form_fields_admin_update" ON mailbox_form_fields
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "mailbox_form_fields_admin_delete" ON mailbox_form_fields
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ── Seed 14 system fields ──
INSERT INTO mailbox_form_fields (field_key, label, field_type, step, placeholder, help_text, is_required, options, sort_order, is_system) VALUES
  -- Section 1: Functional Mailbox (general)
  ('project_name',       'Project Name',           'text',     'general',    '',                  '',                                      true,  '[]', 10, true),
  ('project_leader',     'Project Leader',         'text',     'general',    '',                  '',                                      true,  '[]', 20, true),
  ('agency',             'Agency',                 'select',   'general',    '',                  '',                                      true,  '["MAX","SIGN","THE LITTLE VOICE","VO EUROPE"]', 30, true),
  ('email_to_create',    'Email to be Created',    'text',     'general',    '',                  '20 character max before the @',         true,  '[]', 40, true),
  ('who_needs_access',   'Who Needs Access?',      'textarea', 'general',    '',                  'List people who need access to this mailbox', true, '[]', 50, true),
  ('creation_date',      'To be Created On',       'date',     'general',    '',                  '',                                      true,  '[]', 60, true),

  -- Section 2: Signature
  ('display_name',       'Display Name',           'text',     'signature',  '',                  'Will appear as the sender',             true,  '[]', 70, true),
  ('signature_title',    'Title',                  'text',     'signature',  '',                  'e.g. secretariat team',                 true,  '[]', 80, true),
  ('banner_social_icons','Banner or Social Icons', 'file',     'signature',  '',                  'Max 10MB',                              false, '[]', 90, true),
  ('links',              'Links',                  'text',     'signature',  '',                  '',                                      false, '[]', 100, true),
  ('more_info',          'More Info, Disclaimer, etc', 'textarea', 'signature', '', '',           false, '[]', 110, true),

  -- Section 3: Email Management
  ('deleted_archived',   'Deleted / Archived',     'select',   'management', '',                  '',                                      true,  '["ARCHIVE & DELETE","DELETED only"]', 120, true),

  -- Section 4: Requested By (auto-filled)
  ('first_name',         'First Name',             'text',     'requester',  '',                  '',                                      true,  '[]', 130, true),
  ('last_name',          'Last Name',              'text',     'requester',  '',                  '',                                      true,  '[]', 140, true),
  ('mail',               'Mail',                   'text',     'requester',  '',                  '',                                      true,  '[]', 150, true)
ON CONFLICT (field_key) DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
