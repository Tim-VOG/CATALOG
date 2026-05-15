-- ============================================
-- MIGRATION 061: Drop the redundant onboarding_welcome template
-- The block-based composer (onboarding_block_templates +
-- src/lib/onboarding-mjml.js) is the single source of truth for
-- welcome emails. The flat email_templates row was a leftover.
-- ============================================

DELETE FROM email_templates WHERE template_key = 'onboarding_welcome';
