-- 022: Add generated_email and personal_email to IT requests + onboarding recipients

-- IT requests: auto-generated corporate email based on business unit
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS generated_email VARCHAR(255) DEFAULT '';

-- IT requests: personal email of the new hire (for sending welcome info)
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255) DEFAULT '';

-- Onboarding recipients: personal email (carried from IT request)
ALTER TABLE onboarding_recipients ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255) DEFAULT '';

NOTIFY pgrst, 'reload schema';
