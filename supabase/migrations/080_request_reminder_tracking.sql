-- Reminder tracking columns for the daily-reminders edge function.
--   onboarding_reminder_sent_at: timestamp the 2-days-before reminder
--   was emailed to the IT admin (one-shot per request).
--   offboarding_reminder_last_sent_at: timestamp of the last daily
--   pre-departure nudge sent to the onboarding's original requester
--   (used to avoid sending more than once per UTC day).

ALTER TABLE it_requests
  ADD COLUMN IF NOT EXISTS onboarding_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offboarding_reminder_last_sent_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
