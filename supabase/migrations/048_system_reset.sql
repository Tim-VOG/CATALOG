-- ============================================
-- MIGRATION 048: System Reset & Cleanup
-- Clears all request data, removes kit system,
-- keeps only 3 email templates
-- ============================================

-- ─── 1. Clear all request data ───────────────────────────────
TRUNCATE TABLE loan_request_items CASCADE;
TRUNCATE TABLE loan_requests CASCADE;
TRUNCATE TABLE it_requests CASCADE;
TRUNCATE TABLE mailbox_requests CASCADE;
TRUNCATE TABLE cart_items CASCADE;
TRUNCATE TABLE user_equipment CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE extension_requests CASCADE;
TRUNCATE TABLE qr_scan_logs CASCADE;

-- ─── 2. Remove kit system ────────────────────────────────────
-- Remove kit references from qr_codes
ALTER TABLE qr_codes DROP COLUMN IF EXISTS kit_id;

-- Drop kit tables
DROP TABLE IF EXISTS qr_kit_items CASCADE;
DROP TABLE IF EXISTS qr_kits CASCADE;

-- ─── 3. Clean email templates — keep only 3 active ──────────
UPDATE email_templates SET is_active = false;

-- Ensure the 3 templates exist and are active
INSERT INTO email_templates (template_key, name, subject, body, format, is_active) VALUES
('request_confirmed', 'Request Confirmed',
 'Your request has been received',
 '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;">Request received</h2>
<p style="color:#64748b;font-size:15px;">Hi {{name}},</p>
<p style="color:#64748b;font-size:15px;">Your <strong>{{type}}</strong> request has been received and will be processed by the IT team.</p>
<div style="background:#fffbeb;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
<p style="margin:0;font-size:13px;color:#fbbf24;">STATUS</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#f59e0b;">Pending</p>
</div>
<p style="color:#94a3b8;font-size:13px;">You can track the status of your request on the IT Hub.</p>
</div>', 'html', true),

('request_in_progress', 'Request In Progress',
 'Your request is being prepared',
 '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;">We''re on it</h2>
<p style="color:#64748b;font-size:15px;">Hi {{name}},</p>
<p style="color:#64748b;font-size:15px;">Your <strong>{{type}}</strong> request is now being prepared by the IT team.</p>
<div style="background:#eff6ff;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
<p style="margin:0;font-size:13px;color:#93c5fd;">STATUS</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#3b82f6;">In Progress</p>
</div>
<p style="color:#94a3b8;font-size:13px;">You can track the status of your request on the IT Hub.</p>
</div>', 'html', true),

('request_ready', 'Request Ready',
 'Your request is ready',
 '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;">Your request is ready!</h2>
<p style="color:#64748b;font-size:15px;">Hi {{name}},</p>
<p style="color:#64748b;font-size:15px;">Your <strong>{{type}}</strong> request has been completed.</p>
<div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
<p style="margin:0;font-size:13px;color:#86efac;">STATUS</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#22c55e;">Ready</p>
</div>
<p style="color:#94a3b8;font-size:13px;">Please come to the IT desk to collect your equipment.</p>
</div>', 'html', true)

ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name, subject = EXCLUDED.subject,
  body = EXCLUDED.body, format = EXCLUDED.format, is_active = true;

-- Keep user_invitation active
UPDATE email_templates SET is_active = true WHERE template_key = 'user_invitation';
