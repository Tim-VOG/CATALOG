-- Migration 003: Notification triggers
-- Auto-create notifications on request status changes

-- Notify user when their request status changes
CREATE OR REPLACE FUNCTION notify_request_status_change()
RETURNS trigger AS $$
DECLARE
  v_title text;
  v_message text;
  v_link text;
BEGIN
  -- Only fire on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_link := '/requests/' || NEW.id;

  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'Request Approved';
      v_message := 'Your request "' || NEW.project_name || '" has been approved. You can pick up your equipment.';
    WHEN 'rejected' THEN
      v_title := 'Request Rejected';
      v_message := 'Your request "' || NEW.project_name || '" has been rejected.';
      IF NEW.rejection_reason IS NOT NULL THEN
        v_message := v_message || ' Reason: ' || NEW.rejection_reason;
      END IF;
    WHEN 'picked_up' THEN
      v_title := 'Equipment Picked Up';
      v_message := 'Equipment for "' || NEW.project_name || '" has been marked as picked up.';
    WHEN 'returned' THEN
      v_title := 'Equipment Returned';
      v_message := 'Equipment for "' || NEW.project_name || '" has been marked as returned.';
    WHEN 'closed' THEN
      v_title := 'Request Closed';
      v_message := 'Your request "' || NEW.project_name || '" has been closed.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (NEW.user_id, 'request_status', v_title, v_message, v_link);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_notify_request_status ON loan_requests;
CREATE TRIGGER trg_notify_request_status
  AFTER UPDATE ON loan_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_status_change();

-- Notify admins when a new request is submitted
CREATE OR REPLACE FUNCTION notify_new_request()
RETURNS trigger AS $$
DECLARE
  v_admin record;
  v_requester_name text;
BEGIN
  -- Get requester name
  SELECT first_name || ' ' || last_name INTO v_requester_name
  FROM profiles WHERE id = NEW.user_id;

  -- Notify all admins
  FOR v_admin IN SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      v_admin.id,
      'new_request',
      'New Equipment Request',
      v_requester_name || ' submitted a request for "' || NEW.project_name || '".',
      '/admin/requests/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_request ON loan_requests;
CREATE TRIGGER trg_notify_new_request
  AFTER INSERT ON loan_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_new_request();
