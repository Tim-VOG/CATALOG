-- ============================================
-- MIGRATION 072: Restructure mailbox_confirmation
-- Replace markdown "**label** value" lines with a proper HTML
-- details card matching the canonical email design used by every
-- other template (request_confirmed, request_ready, etc.).
-- ============================================

UPDATE email_templates SET
    subject = 'Your functional mailbox has been created',
    body = E'Hi {{requester_name}},\n\nYour functional mailbox has been created and is ready to use.\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Mailbox</div>\n    <div style="font-weight:700;color:#0a2540;font-size:17px;letter-spacing:-0.2px;">{{mailbox_email}}</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;border-bottom:1px solid #eef2f7;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Project</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{project_name}}</div>\n  </td></tr>\n  <tr><td style="padding:18px 22px;">\n    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">Display name</div>\n    <div style="font-weight:600;color:#0a2540;font-size:15px;">{{display_name}}</div>\n  </td></tr>\n</table>\n\n{{onepassword_section}}\n\nIf you have any questions, just reply to this email — we''re here to help.\n\nBest,\nThe VO Hub Team',
    format = 'html',
    is_active = true
WHERE template_key = 'mailbox_confirmation';
