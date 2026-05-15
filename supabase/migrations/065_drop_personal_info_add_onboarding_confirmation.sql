-- ============================================
-- MIGRATION 065: Remove in-app personal info form, add onboarding
-- confirmation template that reminds the requester to send the
-- PERSONAL INFORMATION form via HR (out-of-band).
-- ============================================

-- ─── Drop the in-app personal info collection ──────────────────
DROP VIEW IF EXISTS public_onboarding_token;
DROP TABLE IF EXISTS personal_info_submissions CASCADE;
ALTER TABLE it_requests DROP COLUMN IF EXISTS personal_info_token;

-- ─── Onboarding confirmation template ──────────────────────────
INSERT INTO email_templates (template_key, name, subject, body, description, format, category, is_active) VALUES
(
  'onboarding_confirmation',
  'Onboarding Request Confirmed',
  'Onboarding request received for {{new_hire_name}}',
  E'Hi {{requester_name}},\n\nYour onboarding request for **{{new_hire_name}}** has been received and the IT team will start processing it.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0;"><tr><td>\n  <div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;">\n    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">⚠️ Don''t forget</p>\n    <p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Send the <strong>PERSONAL INFORMATION form</strong> to {{new_hire_name}} via HR so we can deliver the welcome materials to their personal email.</p>\n  </div>\n</td></tr></table>\n\nWe''ll let you know as soon as the corporate account is ready.\n\nBest,\nThe VO Hub Team',
  'Sent to the requester (IT admin) when an onboarding request is submitted. Includes the HR reminder to send the PERSONAL INFORMATION form.',
  'html',
  'onboarding',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
  description = EXCLUDED.description, format = EXCLUDED.format,
  category = EXCLUDED.category, is_active = true;
