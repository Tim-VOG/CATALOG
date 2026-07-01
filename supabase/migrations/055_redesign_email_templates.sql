-- ============================================
-- MIGRATION 055: Redesign email templates
-- New Stripe-like style, black CTA buttons,
-- bodies are now INNER content only (wrapped at runtime by wrapEmailHtml)
-- ============================================

-- ─── user_invitation ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'You''re invited to join {{app_name}}',
    body = E'Hi {{first_name}},\n\nWelcome aboard! You''ve been invited to join **{{app_name}}**.\n\nSign in with your Microsoft account to access the platform — your access is configured and ready to go.\n\n{{cta:Get started|{{login_url}}}}\n\nOnce you''re in, you''ll find everything you need: equipment catalog, your requests, and your team''s resources.\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe {{app_name}} Team',
    format = 'html',
    is_active = true
WHERE template_key = 'user_invitation';

-- ─── request_confirmed ─────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request has been received',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Request received</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">Your <strong style="color:#0a2540;">{{request_type}}</strong> request has been received and will be processed by the IT team.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 8px 0;font-size:14px;color:#425466;">Track your request anytime:</p>\n{{cta:Track my request|{{tracking_url}}}}',
    format = 'html',
    is_active = true
WHERE template_key = 'request_confirmed';

-- ─── request_in_progress ───────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is being prepared',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">We''re on it</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">Your <strong style="color:#0a2540;">{{request_type}}</strong> request is now being prepared by the IT team.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#eef4ff;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#3955cf;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#3955cf;letter-spacing:-0.3px;">In Progress</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 8px 0;font-size:14px;color:#425466;">Track your request anytime:</p>\n{{cta:Track my request|{{tracking_url}}}}',
    format = 'html',
    is_active = true
WHERE template_key = 'request_in_progress';

-- ─── request_ready ─────────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Your {{request_type}} request is ready',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Your request is ready</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">Your <strong style="color:#0a2540;">{{request_type}}</strong> request has been completed. Your equipment is ready for pickup at the IT desk.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Ready</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 8px 0;font-size:14px;color:#425466;">See the details:</p>\n{{cta:View details|{{tracking_url}}}}',
    format = 'html',
    is_active = true
WHERE template_key = 'request_ready';

-- ─── request_return_reminder ───────────────────────────────────
UPDATE email_templates SET
    subject = 'Reminder: {{product_name}} due back on {{return_date}}',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Return reminder</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;">This is a friendly reminder that <strong style="color:#0a2540;">{{product_name}}</strong> is due for return on <strong style="color:#0a2540;">{{return_date}}</strong>.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Return date</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">{{return_date}}</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 0;font-size:13px;color:#8898aa;">Please bring the equipment to the IT desk.</p>',
    format = 'html',
    is_active = true
WHERE template_key = 'request_return_reminder';

-- ─── request_overdue ───────────────────────────────────────────
UPDATE email_templates SET
    subject = 'Action required: {{product_name}} is overdue',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#b91c1c;letter-spacing:-0.3px;">Equipment overdue</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;"><strong style="color:#0a2540;">{{product_name}}</strong> was due for return on <strong style="color:#0a2540;">{{return_date}}</strong> and has not been returned.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fde8e8;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#b91c1c;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#b91c1c;letter-spacing:-0.3px;">Overdue</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 0;font-size:13px;color:#8898aa;">Please return the equipment to the IT desk as soon as possible.</p>',
    format = 'html',
    is_active = true
WHERE template_key = 'request_overdue';

-- ─── request_return_confirmed ──────────────────────────────────
UPDATE email_templates SET
    subject = '{{product_name}} has been returned — thank you',
    body = E'<h1 style="margin:0 0 14px 0;font-size:24px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Return confirmed</h1>\n<p style="margin:0 0 12px 0;font-size:15px;color:#425466;line-height:1.65;">Hi {{requester_name}},</p>\n<p style="margin:0 0 24px 0;font-size:15px;color:#425466;line-height:1.65;"><strong style="color:#0a2540;">{{product_name}}</strong> has been returned and checked in by the IT team.</p>\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Returned</p>\n  </div>\n</td></tr></table>\n<p style="margin:24px 0 0;font-size:13px;color:#8898aa;">Thank you for returning the equipment on time.</p>',
    format = 'html',
    is_active = true
WHERE template_key = 'request_return_confirmed';
