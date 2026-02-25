-- Migration 002: Add SSO fields to profiles
-- Supports Azure AD / Microsoft Entra ID SSO

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS azure_oid text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en';

-- Index for fast SSO lookup
CREATE INDEX IF NOT EXISTS idx_profiles_azure_oid ON profiles(azure_oid) WHERE azure_oid IS NOT NULL;

-- Update the handle_new_user trigger to capture Azure AD metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, azure_oid, department, job_title, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'given_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'family_name', ''),
    new.raw_user_meta_data->>'oid',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'jobTitle',
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), profiles.last_name),
    azure_oid = COALESCE(EXCLUDED.azure_oid, profiles.azure_oid),
    department = COALESCE(EXCLUDED.department, profiles.department),
    job_title = COALESCE(EXCLUDED.job_title, profiles.job_title),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
