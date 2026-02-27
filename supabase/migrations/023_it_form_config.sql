-- ============================================================
-- 023 — IT Form Builder: dynamic form field configuration
-- ============================================================

-- Table: it_form_fields
-- Stores the schema/config for each field in the IT request form.
-- System fields (is_system = true) map to real it_requests columns.
-- Custom fields store values in it_requests.custom_fields JSONB.
CREATE TABLE IF NOT EXISTS it_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(30) NOT NULL CHECK (field_type IN (
    'text', 'select', 'multi_select', 'date', 'checkbox', 'toggle', 'textarea'
  )),
  step VARCHAR(30) NOT NULL DEFAULT 'additional' CHECK (step IN (
    'identity', 'dates', 'it-needs', 'additional'
  )),
  placeholder VARCHAR(255) DEFAULT '',
  help_text VARCHAR(500) DEFAULT '',
  is_required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]',

  -- Conditional logic: show this field only when condition is met
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

-- Add custom_fields JSONB column to it_requests for custom field storage
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- ── RLS ──
ALTER TABLE it_form_fields ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (needed to render the form)
CREATE POLICY "it_form_fields_select" ON it_form_fields
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "it_form_fields_admin_insert" ON it_form_fields
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "it_form_fields_admin_update" ON it_form_fields
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "it_form_fields_admin_delete" ON it_form_fields
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ── Seed 13 system fields ──
INSERT INTO it_form_fields (field_key, label, field_type, step, placeholder, help_text, is_required, options, sort_order, is_system) VALUES
  ('first_name',      'First Name',         'text',         'identity',  'John',              '',                           true,  '[]', 10, true),
  ('last_name',       'Last Name',          'text',         'identity',  'Doe',               '',                           true,  '[]', 20, true),
  ('status',          'Status',             'select',       'identity',  '',                  '',                           true,  '["CDI","CDD","Freelance","Intern","Student"]', 30, true),
  ('business_unit',   'Business Unit',      'select',       'identity',  '',                  'Email will be auto-generated based on this', true, '["VO GROUP","THE LITTLE VOICE","VO EUROPE","VO EVENT","MAX","SIGN BRUSSELS","ART ON PAPER"]', 40, true),
  ('personal_email',  'Personal Email',     'text',         'identity',  'john@gmail.com',    'Used for sending welcome email before corporate account is created', false, '[]', 50, true),
  ('signature_title', 'Signature Title',    'text',         'identity',  'Project Manager',   'Job title for email signature', false, '[]', 60, true),
  ('start_date',      'Start Date',         'date',         'dates',     '',                  '',                           false, '[]', 70, true),
  ('leaving_date',    'Leaving Date',       'date',         'dates',     '',                  '',                           false, '[]', 80, true),
  ('needs_computer',  'Needs a Computer',   'toggle',       'it-needs',  '',                  '',                           false, '[]', 90, true),
  ('access_needs',    'Access Needed',      'multi_select', 'it-needs',  '',                  'Select all required access',  false, '["Email","Teams","SharePoint","VPN","ERP","CRM","Adobe CC","Other"]', 100, true),
  ('sharepoint_url',  'SharePoint URL',     'text',         'it-needs',  'https://...',       'Link to the team SharePoint site', false, '[]', 110, true),
  ('listing',         'Listing',            'text',         'additional','',                  '',                           false, '[]', 120, true),
  ('listing_date',    'Listing Date',       'date',         'additional','',                  '',                           false, '[]', 130, true)
ON CONFLICT (field_key) DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
