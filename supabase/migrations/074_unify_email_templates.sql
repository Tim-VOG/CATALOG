-- ============================================
-- MIGRATION 074: Unify ALL email templates on the mailbox_confirmation
-- layout — single white bordered card with uppercase labels and
-- bold values, no more coloured "STATUS" pill blocks.
-- ============================================

-- ─── request_confirmed ─────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request has been received',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Pending</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Request</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;text-transform:capitalize;">{{request_type}}</div>\n  </td></tr>\n</table>\n\nYou can track your request anytime in the hub.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'request_confirmed';

-- ─── request_in_progress ───────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is being prepared',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">In Progress</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Request</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;text-transform:capitalize;">{{request_type}}</div>\n  </td></tr>\n</table>\n\nWe''ll let you know as soon as it''s ready.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'request_in_progress';

-- ─── request_ready ─────────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is ready',
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed and is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Ready</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Request</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;text-transform:capitalize;">{{request_type}}</div>\n  </td></tr>\n</table>\n\nCome by the IT desk whenever you''re ready.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'request_ready';

-- ─── request_return_reminder ───────────────────────────────────
UPDATE email_templates SET
    subject = 'Reminder: {{product_name}} due back on {{return_date}}',
    body = E'Hi {{requester_name}},\n\nFriendly reminder that **{{product_name}}** is due for return on **{{return_date}}**. Please bring the equipment to the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Equipment</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">{{product_name}}</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Return date</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{return_date}}</div>\n  </td></tr>\n</table>\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'request_return_reminder';

-- ─── onboarding_confirmation ───────────────────────────────────
UPDATE email_templates SET
    subject = 'Onboarding request received for {{new_hire_name}}',
    body = E'Hi {{requester_name}},\n\nYour onboarding request for **{{new_hire_name}}** has been received and the IT team will start processing it.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Pending</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">New hire</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{new_hire_name}}</div>\n  </td></tr>\n</table>\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;"><tr><td>\n  <div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;">\n    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">Don''t forget</p>\n    <p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Send the <strong>PERSONAL INFORMATION form</strong> to {{new_hire_name}} via HR so we can deliver the welcome materials to their personal email.</p>\n  </div>\n</td></tr></table>\n\nWe''ll let you know as soon as the corporate account is ready.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'onboarding_confirmation';

-- ─── user_invitation ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'You''re invited to join VO Hub',
    body = E'Hi {{first_name}},\n\nWelcome aboard! You''ve been invited to join **VO Hub**.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Sign in with</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">Your Microsoft account</div>\n  </td></tr>\n</table>\n\nYour access is configured and ready to go.\n\n{{cta:Get started|{{login_url}}}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'user_invitation';
