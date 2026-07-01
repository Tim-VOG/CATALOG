-- ============================================
-- MIGRATION 075: Make the 2nd card row dynamic per request type
-- The "Request: equipment" row becomes "{{subject_label}}: {{subject_name}}"
-- where the code resolves it per type:
--   onboarding  → "New hire: <name>"
--   offboarding → "Person leaving: <name>"
--   mailbox     → "Mailbox: <email>"
--   equipment   → "Project: <name>" (or fallback "Request: Equipment")
-- ============================================

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been received and will be processed by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Pending</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">{{subject_label}}</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{subject_name}}</div>\n  </td></tr>\n</table>\n\nYou can track your request anytime in the hub.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_confirmed';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request is now being prepared by the IT team.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">In Progress</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">{{subject_label}}</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{subject_name}}</div>\n  </td></tr>\n</table>\n\nWe''ll let you know as soon as it''s ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_in_progress';

UPDATE email_templates SET
    body = E'Hi {{requester_name}},\n\nYour **{{request_type}}** request has been completed and is ready for pickup at the IT desk.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Status</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">Ready</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">{{subject_label}}</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{subject_name}}</div>\n  </td></tr>\n</table>\n\nCome by the IT desk whenever you''re ready.\n\nBest,\nThe VO Hub Team'
WHERE template_key = 'request_ready';
