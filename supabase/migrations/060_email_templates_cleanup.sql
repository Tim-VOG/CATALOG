-- ============================================
-- MIGRATION 060: Email templates final cleanup
-- - Hardcode "VO Hub" everywhere (no more {{app_name}})
-- - Align every template on a single, clean structure:
--     greeting + intro + bold field list + closing + signature
-- - Drop redundant templates
-- ============================================

-- ─── Drop deprecated/legacy templates ──────────────────────────
DELETE FROM email_templates
WHERE template_key IN (
  'order_confirmation', 'order_ready',
  'return_reminder', 'return_confirmation',
  'equipment_picked_up', 'request_closed',
  'extension_approved', 'extension_rejected',
  'dashboard_reminder'   -- redundant with request_return_reminder
);

-- ─── user_invitation ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'You''re invited to join VO Hub',
    body = E'Hi {{first_name}},\n\nWelcome aboard! You''ve been invited to join **VO Hub**.\n\nSign in with your Microsoft account to access the platform — your access is configured and ready to go.\n\n{{cta:Get started|{{login_url}}}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'invitations',
    is_active = true
WHERE template_key = 'user_invitation';

-- ─── mailbox_confirmation ──────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your functional mailbox has been created',
    body = E'Hi {{requester_name}},\n\nYour functional mailbox has been created and is ready to use.\n\n**Mailbox** {{mailbox_email}}\n**Project** {{project_name}}\n**Display name** {{display_name}}\n\n{{onepassword_section}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    description = 'Sent to the requester when a functional mailbox has been provisioned',
    format = 'html',
    category = 'mailbox',
    is_active = true
WHERE template_key = 'mailbox_confirmation';

-- ─── onboarding_welcome (condensed single-email version) ───────
UPDATE email_templates SET
    subject = 'Welcome to VO Group, {{first_name}}',
    body = E'Hi {{first_name}},\n\nWelcome to the team! Your account is configured and you''re ready to start.\n\n**Corporate email** {{email}}\n**Personal email** {{personal_email}}\n**Company** {{company}}\n**Job title** {{job_title}}\n**Start date** {{start_date}}\n\nYour 1Password link is on its way to your personal address — use it to retrieve your initial credentials.\n\nIf you have any questions before your first day, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    description = 'Single-email welcome (condensed). For the rich block-based version, use the inline composer on a request.',
    format = 'html',
    category = 'onboarding',
    is_active = true
WHERE template_key = 'onboarding_welcome';

-- ─── request_confirmed ─────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request has been received',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n\nTrack your request anytime in the hub.\n\n{{cta:Track my request|{{tracking_url}}}}\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'requests',
    is_active = true
WHERE template_key = 'request_confirmed';

-- ─── request_in_progress ───────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is being prepared',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#eef4ff;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#3955cf;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#3955cf;letter-spacing:-0.3px;">In Progress</p>\n  </div>\n</td></tr></table>\n\nWe''ll let you know as soon as it''s ready.\n\n{{cta:Track my request|{{tracking_url}}}}\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'requests',
    is_active = true
WHERE template_key = 'request_in_progress';

-- ─── request_ready ─────────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is ready',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed. Your equipment is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Ready</p>\n  </div>\n</td></tr></table>\n\n{{cta:View details|{{tracking_url}}}}\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'requests',
    is_active = true
WHERE template_key = 'request_ready';

-- ─── request_return_reminder ───────────────────────────────────
UPDATE email_templates SET
    subject = 'Reminder: {{product_name}} due back on {{return_date}}',
    body = E'Hi {{requester_name}},\n\nFriendly reminder that **{{product_name}}** is due for return on **{{return_date}}**.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Return date</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">{{return_date}}</p>\n  </div>\n</td></tr></table>\n\nPlease bring the equipment to the IT desk.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'reminders',
    is_active = true
WHERE template_key = 'request_return_reminder';

-- ─── request_overdue ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Action required: {{product_name}} is overdue',
    body = E'Hi {{requester_name}},\n\n**{{product_name}}** was due for return on **{{return_date}}** and has not been returned.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fde8e8;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#b91c1c;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#b91c1c;letter-spacing:-0.3px;">Overdue</p>\n  </div>\n</td></tr></table>\n\nPlease return the equipment to the IT desk as soon as possible.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'reminders',
    is_active = true
WHERE template_key = 'request_overdue';

-- ─── request_return_confirmed ──────────────────────────────────
UPDATE email_templates SET
    subject = '{{product_name}} has been returned — thank you',
    body = E'Hi {{requester_name}},\n\n**{{product_name}}** has been returned and checked in by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Returned</p>\n  </div>\n</td></tr></table>\n\nThank you for returning the equipment on time.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    category = 'reminders',
    is_active = true
WHERE template_key = 'request_return_confirmed';
