-- ============================================
-- MIGRATION 062: Strip unused tracking CTAs from status templates
-- The status emails are sent by src/services/request-status-service.js
-- which doesn't pass a {{tracking_url}} (IT / onboarding / mailbox
-- requests don't have tracking tokens). Remove the orphan CTAs so the
-- admin preview matches what subscribers actually receive.
-- ============================================

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#fef6e0;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#a16207;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#a16207;letter-spacing:-0.3px;">Pending</p>\n  </div>\n</td></tr></table>\n\nYou can track your request anytime in the hub.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_confirmed';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#eef4ff;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#3955cf;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#3955cf;letter-spacing:-0.3px;">In Progress</p>\n  </div>\n</td></tr></table>\n\nWe''ll let you know as soon as it''s ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_in_progress';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed. Your equipment is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">\n  <div style="background:#e7f6ec;border-radius:12px;padding:22px 28px;display:inline-block;min-width:200px;">\n    <p style="margin:0;font-size:11px;font-weight:600;color:#0a7a3b;letter-spacing:1px;text-transform:uppercase;">Status</p>\n    <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0a7a3b;letter-spacing:-0.3px;">Ready</p>\n  </div>\n</td></tr></table>\n\nCome by the IT desk whenever you''re ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_ready';
