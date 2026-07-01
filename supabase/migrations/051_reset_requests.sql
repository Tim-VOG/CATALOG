-- Reset all request data for fresh start
TRUNCATE TABLE loan_request_items CASCADE;
TRUNCATE TABLE loan_requests CASCADE;
TRUNCATE TABLE it_requests CASCADE;
TRUNCATE TABLE mailbox_requests CASCADE;
TRUNCATE TABLE cart_items CASCADE;
TRUNCATE TABLE user_equipment CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE qr_scan_logs CASCADE;

-- Reset all QR codes to available
UPDATE qr_codes SET status = 'available', assigned_to = NULL, assigned_to_name = NULL, assigned_to_email = NULL, assigned_at = NULL;
