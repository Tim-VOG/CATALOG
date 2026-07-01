-- ============================================
-- MIGRATION 046: Simplified Status System
-- 3 statuses only: pending, in_progress, ready
-- 6 email templates, tracking token, cleanup
-- ============================================

-- ─── 1. Add tracking_token to loan_requests ──────────────────
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT uuid_generate_v4();
CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_requests_tracking_token ON loan_requests(tracking_token);

-- Backfill existing rows that don't have a tracking token
UPDATE loan_requests SET tracking_token = uuid_generate_v4() WHERE tracking_token IS NULL;

-- ─── 2. Migrate loan_requests statuses ───────────────────────
UPDATE loan_requests SET status = 'pending' WHERE status IN ('draft', 'cancelled', 'rejected', 'expired');
UPDATE loan_requests SET status = 'in_progress' WHERE status IN ('approved', 'reserved', 'picked_up', 'overdue');
UPDATE loan_requests SET status = 'ready' WHERE status IN ('returned', 'closed');

-- Drop old constraint and add new one
ALTER TABLE loan_requests DROP CONSTRAINT IF EXISTS loan_requests_status_check;
ALTER TABLE loan_requests ADD CONSTRAINT loan_requests_status_check
    CHECK (status IN ('pending', 'in_progress', 'ready'));

-- ─── 3. Migrate mailbox_requests statuses ────────────────────
UPDATE mailbox_requests SET status = 'pending' WHERE status IN ('pending', 'rejected', 'cancelled');
UPDATE mailbox_requests SET status = 'in_progress' WHERE status = 'approved';
UPDATE mailbox_requests SET status = 'ready' WHERE status = 'completed';

ALTER TABLE mailbox_requests DROP CONSTRAINT IF EXISTS mailbox_requests_status_check;
ALTER TABLE mailbox_requests ADD CONSTRAINT mailbox_requests_status_check
    CHECK (status IN ('pending', 'in_progress', 'ready'));

-- ─── 4. Deactivate ALL old email templates ───────────────────
UPDATE email_templates SET is_active = false;

-- Re-enable user_invitation (not request-related)
UPDATE email_templates SET is_active = true WHERE template_key = 'user_invitation';

-- ─── 5. Insert 6 new email templates ─────────────────────────

-- Email 1: Confirmation (on submit)
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_confirmed',
    'Request Confirmed',
    'Your {{request_type}} request has been received',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">Request received</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Your <strong>{{request_type}}</strong> request has been received and will be processed by the IT team.</p>
<div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#94a3b8;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#f59e0b;">Pending</p>
</div>
<p style="color:#64748b;font-size:14px;">Track your request anytime:</p>
<p><a href="{{tracking_url}}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#3b82f6;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">Track My Request</a></p>
</div>',
    'Sent immediately when a request is submitted',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 2: In Progress
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_in_progress',
    'Request In Progress',
    'Your {{request_type}} request is being prepared',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">We''re on it</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Your <strong>{{request_type}}</strong> request is now being prepared by the IT team.</p>
<div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#94a3b8;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#3b82f6;">In Progress</p>
</div>
<p><a href="{{tracking_url}}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#3b82f6;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">Track My Request</a></p>
</div>',
    'Sent when an admin starts processing the request',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 3: Ready
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_ready',
    'Request Ready',
    'Your {{request_type}} request is ready',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">Your request is ready!</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Your <strong>{{request_type}}</strong> request has been completed. Your equipment is ready for pickup at the IT desk.</p>
<div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#86efac;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#22c55e;">Ready</p>
</div>
<p><a href="{{tracking_url}}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#22c55e;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">View Details</a></p>
</div>',
    'Sent when the request is completed and equipment is ready',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 4: Return Reminder (3 days before)
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_return_reminder',
    'Return Reminder',
    'Reminder: {{product_name}} due back on {{return_date}}',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">Return reminder</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;">This is a friendly reminder that <strong>{{product_name}}</strong> is due for return on <strong>{{return_date}}</strong>.</p>
<div style="background:#fffbeb;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#fbbf24;">RETURN DATE</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#f59e0b;">{{return_date}}</p>
</div>
<p style="color:#64748b;font-size:14px;">Please bring the equipment to the IT desk.</p>
</div>',
    'Sent 3 days before the expected return date (automated cron)',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 5: Overdue (1 day after)
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_overdue',
    'Equipment Overdue',
    'Action required: {{product_name}} is overdue',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#ef4444;margin-bottom:8px;">Equipment overdue</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;"><strong>{{product_name}}</strong> was due for return on <strong>{{return_date}}</strong> and has not been returned.</p>
<div style="background:#fef2f2;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#fca5a5;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ef4444;">Overdue</p>
</div>
<p style="color:#64748b;font-size:14px;">Please return the equipment to the IT desk as soon as possible.</p>
</div>',
    'Sent 1 day after the expected return date if not returned (automated cron)',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- Email 6: Return Confirmed
INSERT INTO email_templates (template_key, name, subject, body, description, format, is_active) VALUES
(
    'request_return_confirmed',
    'Return Confirmed',
    '{{product_name}} has been returned — thank you',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;">
<h2 style="color:#1e293b;margin-bottom:8px;">Return confirmed</h2>
<p style="color:#64748b;font-size:15px;line-height:1.6;">Hi {{requester_name}},</p>
<p style="color:#64748b;font-size:15px;line-height:1.6;"><strong>{{product_name}}</strong> has been returned and checked in by the IT team.</p>
<div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0;font-size:13px;color:#86efac;">STATUS</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#22c55e;">Returned</p>
</div>
<p style="color:#64748b;font-size:14px;">Thank you for returning the equipment on time.</p>
</div>',
    'Sent when equipment is returned via QR scan',
    'html',
    true
)
ON CONFLICT (template_key) DO UPDATE SET
    name = EXCLUDED.name, subject = EXCLUDED.subject, body = EXCLUDED.body,
    description = EXCLUDED.description, format = EXCLUDED.format, is_active = true;

-- ─── 6. Update loan_requests RLS for public tracking ─────────
CREATE POLICY "Public tracking by token" ON loan_requests
    FOR SELECT USING (tracking_token IS NOT NULL);
