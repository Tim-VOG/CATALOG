-- =============================================================
-- Shared mailboxes (FMB) inventory — the functional mailboxes set
-- up across the various entities. Mirrors the legacy Notion table
-- so an admin can see at a glance who owns what and when it
-- archives / deletes.
-- =============================================================

CREATE TABLE IF NOT EXISTS shared_mailboxes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mail VARCHAR(255),                    -- the actual email address
  company VARCHAR(100),                 -- VO GROUP, VO EUR, VO EVENT, MIT, …
  category VARCHAR(30),                 -- LEGER / MOYEN / LOURD
  created_in VARCHAR(30),               -- AD / Cloud / …
  created_time TIMESTAMPTZ,             -- creation timestamp from the source
  archive_from DATE,
  archive_to DATE,
  delete_on DATE,
  display_name VARCHAR(255),            -- the sender name people see
  have_access TEXT,                     -- comma-separated list of accessors
  job_title VARCHAR(255),
  licence VARCHAR(60),                  -- SHARED MAILBOX, Plan 1, O365 Premium, ARCHIVED
  licence_checked BOOLEAN DEFAULT FALSE,
  profile VARCHAR(60),                  -- WORK MAILBOX, ARCHIVED, EMPLOYEE
  project_leader VARCHAR(255),          -- free text — matched by name against profiles
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_mailboxes_company ON shared_mailboxes (company);
CREATE INDEX IF NOT EXISTS idx_shared_mailboxes_project_leader ON shared_mailboxes (project_leader);
CREATE INDEX IF NOT EXISTS idx_shared_mailboxes_mail ON shared_mailboxes (mail);

CREATE TRIGGER update_shared_mailboxes_updated_at
  BEFORE UPDATE ON shared_mailboxes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE shared_mailboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared mailboxes are viewable by authenticated users" ON shared_mailboxes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify shared mailboxes" ON shared_mailboxes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

NOTIFY pgrst, 'reload schema';
