-- ================================================================
-- REMINDER NOTIFICATIONS
-- Migration: 038_reminder_notification.sql
-- Adds a table to track sent reminders (avoid duplicates)
-- ================================================================

CREATE TABLE IF NOT EXISTS qr_reminders_sent (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scan_log_id UUID REFERENCES qr_scan_logs(id) ON DELETE CASCADE NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- 'day_before', 'overdue_1d', 'overdue_3d'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_to VARCHAR(255),
    UNIQUE(scan_log_id, reminder_type)
);

ALTER TABLE qr_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reminders" ON qr_reminders_sent
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert reminders" ON qr_reminders_sent
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- View: items due for return tomorrow that haven't been reminded yet
CREATE OR REPLACE VIEW qr_upcoming_returns_unremnded AS
SELECT sl.*,
    p.name AS product_name,
    p.image_url AS product_image
FROM qr_scan_logs sl
JOIN products p ON sl.product_id = p.id
WHERE sl.action = 'take'
  AND sl.expected_return_date = CURRENT_DATE + 1
  AND NOT EXISTS (
    SELECT 1 FROM qr_reminders_sent r
    WHERE r.scan_log_id = sl.id AND r.reminder_type = 'day_before'
  );
