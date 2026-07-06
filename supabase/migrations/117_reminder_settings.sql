-- =============================================================
-- Migration 117 — Configurable reminder timing.
--
-- Lets admins tune the equipment return reminders (read by the
-- daily-reminders edge function) instead of hard-coded 3 / 1 days.
-- =============================================================

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS reminder_before_days     INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS reminder_overdue_days    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reminder_before_enabled  BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_overdue_enabled BOOLEAN DEFAULT TRUE;
