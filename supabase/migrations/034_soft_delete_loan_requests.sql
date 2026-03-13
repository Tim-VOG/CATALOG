-- Add soft-delete support to loan_requests
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Update RLS policies to exclude soft-deleted records
CREATE OR REPLACE VIEW active_loan_requests AS
  SELECT * FROM loan_requests WHERE deleted_at IS NULL;

-- Index for performance on soft-delete filter
CREATE INDEX IF NOT EXISTS idx_loan_requests_deleted_at ON loan_requests (deleted_at);

NOTIFY pgrst, 'reload schema';
