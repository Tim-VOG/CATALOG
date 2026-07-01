-- ============================================
-- MIGRATION 064: User-deletion safety — ON DELETE SET NULL
-- Switching every profiles FK that should preserve history away from
-- the default (RESTRICT) so admins can delete a profile without
-- hitting onboarding_emails_created_by_fkey / similar violations.
-- ============================================

-- Helper: rebuild a FK with ON DELETE SET NULL
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT conname, conrelid::regclass AS tbl, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'profiles'::regclass
      AND a.attname IN (
        'created_by', 'requested_by', 'approved_by', 'reviewed_by',
        'requester_id', 'assigned_by', 'invited_by'
      )
      AND pg_get_constraintdef(c.oid) NOT LIKE '%ON DELETE SET NULL%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%ON DELETE CASCADE%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', rec.tbl, rec.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I %s ON DELETE SET NULL',
      rec.tbl, rec.conname, rec.def
    );
    RAISE NOTICE 'Patched FK % on %', rec.conname, rec.tbl;
  END LOOP;
END $$;

-- Belt-and-braces: also handle the specific constraint that triggered
-- the user-reported violation, in case the loop above missed it.
ALTER TABLE onboarding_emails
  DROP CONSTRAINT IF EXISTS onboarding_emails_created_by_fkey;
ALTER TABLE onboarding_emails
  ADD CONSTRAINT onboarding_emails_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
