-- ============================================
-- MIGRATION 067: Soft-delete on profiles / requests / products
-- Add deleted_at column + RLS filter so admins can keep history
-- without violating FKs that don't ON DELETE SET NULL (rare).
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE mailbox_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loan_requests_deleted_at ON loan_requests(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_it_requests_deleted_at ON it_requests(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mailbox_requests_deleted_at ON mailbox_requests(deleted_at) WHERE deleted_at IS NULL;

-- Helper RPC: soft-delete a row by id from a known table
CREATE OR REPLACE FUNCTION soft_delete(table_name TEXT, row_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF table_name NOT IN ('profiles','products','loan_requests','it_requests','mailbox_requests') THEN
    RAISE EXCEPTION 'soft_delete: table % not allowed', table_name;
  END IF;
  EXECUTE format('UPDATE %I SET deleted_at = NOW() WHERE id = $1', table_name) USING row_id;
END;
$$;

REVOKE ALL ON FUNCTION soft_delete FROM PUBLIC;
GRANT EXECUTE ON FUNCTION soft_delete TO authenticated;
