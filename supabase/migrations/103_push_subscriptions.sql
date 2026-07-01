-- =============================================================
-- Migration 103 — Web push subscriptions + auto-push on notification.
--
-- Stores each device's push subscription so the send-push edge
-- function can reach it. A trigger on `notifications` INSERT fires a
-- push to the target user's devices via pg_net (if available),
-- mirroring the in-app bell to the phone's lock screen.
--
-- Manual setup required (see PR notes):
--   1. npx web-push generate-vapid-keys
--   2. set VITE_VAPID_PUBLIC_KEY (client) + VAPID_PRIVATE_KEY /
--      VAPID_PUBLIC_KEY / VAPID_SUBJECT (edge function secrets)
--   3. deploy the send-push edge function
--   4. set app_settings-level config for the function URL below
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A user manages only their own subscriptions.
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Auto-push on new in-app notification ────────────────────
-- Uses pg_net to POST to the send-push edge function. Best-effort:
-- wrapped so a missing extension / unset config never blocks the
-- notification insert itself.
CREATE OR REPLACE FUNCTION public.fn_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  -- Function URL + service key are read from GUCs an admin can set:
  --   ALTER DATABASE postgres SET app.push_function_url = 'https://<ref>.functions.supabase.co/send-push';
  --   ALTER DATABASE postgres SET app.push_service_key  = '<service-role-key>';
  v_url := current_setting('app.push_function_url', true);
  v_key := current_setting('app.push_service_key', true);

  IF v_url IS NULL OR v_url = '' THEN
    RETURN NEW; -- not configured yet; in-app notif still works
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_key, '')
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'url', NEW.link,
        'tag', NEW.type
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- pg_net missing or call failed — never block the insert.
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_push_on_notification();

COMMIT;
