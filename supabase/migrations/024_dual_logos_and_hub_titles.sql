-- ============================================================
-- 024 — Dual logos (dark/light) + Hub page editable titles
-- ============================================================

-- Dual logo URLs (keep existing logo_url as fallback)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url_dark TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url_light TEXT;

-- Hub page customizable titles and descriptions
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_main_title VARCHAR(100) DEFAULT 'VO Gear Hub';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_tagline VARCHAR(200) DEFAULT 'Welcome — choose your destination';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_catalog_title VARCHAR(100) DEFAULT 'Equipment Catalog';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_catalog_description TEXT DEFAULT 'Browse and reserve equipment for your projects. View availability and submit loan requests.';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_onboarding_title VARCHAR(100) DEFAULT 'Onboarding Hub';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_onboarding_description TEXT DEFAULT 'Compose and send welcome emails to new team members. Manage recipients and track delivery.';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_mailbox_title VARCHAR(100) DEFAULT 'Functional Mailbox';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_mailbox_description TEXT DEFAULT 'Request a new functional mailbox for your team or project. Approval workflow included.';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_it_request_title VARCHAR(100) DEFAULT 'IT Onboarding Request';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hub_it_request_description TEXT DEFAULT 'Submit an IT onboarding request for new hires. Provide equipment and access requirements.';

NOTIFY pgrst, 'reload schema';
