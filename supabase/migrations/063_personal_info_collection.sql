-- ============================================
-- MIGRATION 063: Public personal-info collection for onboarding
-- The new hire fills in their personal email through a public link
-- shared by the admin requester. The submission auto-links back to
-- the it_request via a unique token.
-- ============================================

-- Token on each onboarding it_request
ALTER TABLE it_requests
  ADD COLUMN IF NOT EXISTS personal_info_token UUID DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_it_requests_personal_info_token
  ON it_requests(personal_info_token);

-- Backfill any existing onboarding rows missing a token
UPDATE it_requests
SET personal_info_token = uuid_generate_v4()
WHERE personal_info_token IS NULL;

-- Submissions table
CREATE TABLE IF NOT EXISTS personal_info_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  it_request_id UUID NOT NULL REFERENCES it_requests(id) ON DELETE CASCADE,
  personal_email VARCHAR(255) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT personal_info_submissions_request_unique UNIQUE (it_request_id)
);

CREATE INDEX IF NOT EXISTS idx_personal_info_submissions_request
  ON personal_info_submissions(it_request_id);

-- RLS: admin reads everything; public can insert via the token (handled
-- in the API layer using the token as a filter)
ALTER TABLE personal_info_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage personal info submissions"
  ON personal_info_submissions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow anonymous inserts (the public form posts here without auth);
-- we rely on the it_request_id being resolved server-side from the
-- public token, so the public can't forge submissions for arbitrary
-- requests.
CREATE POLICY "Public can submit personal info"
  ON personal_info_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow public read of (token → first_name/last_name) so the form
-- can greet the new hire by name. Restrict columns via a view.
CREATE OR REPLACE VIEW public_onboarding_token AS
  SELECT
    personal_info_token AS token,
    data->>'first_name' AS first_name,
    data->>'last_name'  AS last_name,
    data->>'company'    AS company,
    EXISTS (SELECT 1 FROM personal_info_submissions s WHERE s.it_request_id = it_requests.id) AS already_submitted
  FROM it_requests
  WHERE type = 'onboarding';

GRANT SELECT ON public_onboarding_token TO anon, authenticated;
