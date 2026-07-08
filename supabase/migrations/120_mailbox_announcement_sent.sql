-- Track the "access granted" announcement email for shared mailboxes,
-- so the admin can see at a glance which mailboxes have already been
-- announced (and still re-send if needed).
ALTER TABLE mailbox_requests
  ADD COLUMN IF NOT EXISTS announcement_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS announcement_sent_count integer NOT NULL DEFAULT 0;
