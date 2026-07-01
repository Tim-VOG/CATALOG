# VO Hub — Runbook

Operational playbook for the on-call human (currently: Nadir).
Update each section as you actually run the drill, otherwise nobody
trusts what's in here when prod is on fire.

---

## 1. Backup posture

### What's backed up

| Source                              | Where it lives                                       | Frequency        | Retention       |
|-------------------------------------|------------------------------------------------------|------------------|-----------------|
| **Supabase Postgres** (everything)  | Supabase Dashboard → Database → Backups              | Daily (Free/Pro) | 7 days (Free) / 30 days (Pro) |
| **Supabase Storage** (avatars, logos) | Same project, separate object store                | (no automatic backup) | n/a       |
| **Repository code**                 | GitHub (`Tim-VOG/CATALOG`)                            | every push       | infinite        |
| **Vercel artefacts** (built bundles) | Vercel Dashboard → Deployments                       | every deploy     | 30 days         |

### What's **not** backed up

- The Resend send history is not backed up (we don't own it). If
  Resend has an outage and we lose access to past email events, we
  can replay from `loan_requests / it_requests / mailbox_requests`
  timelines.
- The Supabase Storage buckets (`avatars`, `logos`) have no automatic
  backup. To protect them we'd have to download them periodically;
  for now we accept the loss risk because both are reconstructible
  (avatars re-uploaded by users, logo re-uploaded by admin).

### Upgrading to Point-in-Time Recovery (PITR)

The Free tier ships daily backups with 7 days retention. The Pro tier
($25/month) adds **Point-in-Time Recovery**: any second within the
last 7 days. If we ever run a destructive SQL by mistake (`DELETE
FROM loan_requests` without a WHERE) we can rewind to the second
before. Recommended whenever VO Hub is treated as anything more than
a sandbox.

---

## 2. Restore drill — Supabase Postgres

We **must** run this drill at least once a year on a side project so
the procedure stays in muscle memory. Last drill date: _never_ — to
update once we do it.

### 2a. Restore to a NEW Supabase project (the safe way)

Used when prod is salvageable but we want to recover a single missing
row or table without touching live data.

1. Supabase Dashboard → top-left project switcher → **New project**.
   Name it `vo-hub-restore-YYYYMMDD`, same region as prod (Brussels /
   `eu-central-1`).
2. Once the new project is ready, open the prod project → Database →
   Backups → click the backup row you want → **Download**. You'll
   get a `.dump.gz` file.
3. On your laptop:
   ```bash
   gunzip vo-hub-prod-2026-MM-DD.dump.gz
   PG_URL='postgresql://postgres:<NEW_PROJECT_PASSWORD>@db.<NEW_PROJECT_REF>.supabase.co:5432/postgres'
   pg_restore --no-owner --no-acl --clean --if-exists -d "$PG_URL" vo-hub-prod-2026-MM-DD.dump
   ```
4. Connect to the restore project's SQL Editor and **read** the rows
   you need (`SELECT * FROM loan_requests WHERE id = '<the lost row>'`).
5. Copy the rows back to prod via `INSERT INTO ... VALUES (...)` from
   prod's SQL Editor.
6. Delete the restore project once finished.

### 2b. Restore the prod project itself (full rewind, scary)

Used when prod data is corrupted beyond a single row — e.g. a
runaway script truncated several tables. **Causes user-visible
downtime while the rewind runs (≈ 10–30 minutes).**

> ⚠ Tell the team on Teams before doing this. Anything users
>   submitted **after** the backup timestamp will be lost forever.

1. Vercel Dashboard → freeze a maintenance banner (or just deploy a
   "We'll be back shortly" branch) so users stop writing.
2. Supabase Dashboard → prod project → Database → Backups → choose
   the backup row → **Restore**. Confirm twice.
3. Wait for the green check. The DB is now back at that point.
4. Run `NOTIFY pgrst, 'reload schema';` once to force PostgREST to
   pick up the schema (otherwise the Edge Functions get 500s for a
   few minutes).
5. Smoke test the live URL — log in, open a request, hit `/admin`.
   If all good, unfreeze Vercel.

### 2c. Restore an Edge Function or a migration

Edge Functions and SQL migrations live in git. Just `git checkout`
the version we want and redeploy with `supabase functions deploy
<fn>` (Edge Functions) or paste the migration in SQL Editor (DB).

---

## 3. Rollback after a bad deploy

Vercel deploys are immutable — every push to `main` produces a
new immutable deployment URL. Promote the previous one back to
production:

1. Vercel Dashboard → project `catalog` → Deployments tab.
2. Find the last green deployment **before** the broken one.
3. Click ··· → **Promote to Production**. Takes ~10 seconds.
4. Confirm on https://catalog-mu-sage.vercel.app that the fix is in.
5. Open a new branch from `main` with the bad commit reverted
   (`git revert <sha>`), so the next deploy from `main` doesn't
   ship the broken code again.

---

## 4. Common incidents

### "The hub shows a blank page"

Usually a stale lazy chunk after a redeploy. Hard-refresh
(Ctrl+Shift+R) clears it. If multiple users report it, the
auto-recover in `src/main.jsx` will reload them at most three
times. Past that they see the **Refresh page** CTA from
`ErrorBoundary`.

If it persists past two minutes of the deploy completing, suspect
the asset hashes diverged: rebuild via Vercel Dashboard → Deploy →
**Redeploy** (clear build cache) on the latest commit.

### "Emails aren't going out"

Check, in order:

1. **Resend dashboard** → API keys are valid; sender domain is
   verified. If the domain went into review (low reputation),
   send-email returns 200 but Resend silently drops the message.
2. **Edge Function logs** (Supabase → Edge Functions → send-email →
   Logs) for `Resend API error` lines.
3. **Rate limit table** (since migration 090):
   ```sql
   SELECT user_id, COUNT(*) FROM edge_function_calls
   WHERE function_name = 'send-email'
     AND called_at > NOW() - INTERVAL '1 hour'
   GROUP BY user_id ORDER BY 2 DESC;
   ```
   If a user is hitting 50/h, the function legitimately refuses
   them with HTTP 429. Investigate the front-end loop that's
   firing.

### "The daily reminder didn't go out"

Check:

1. `SELECT * FROM cron.job WHERE jobname = 'daily-reminders';` —
   job still scheduled?
2. `SELECT * FROM cron.job_run_details WHERE jobid = <id>
   ORDER BY start_time DESC LIMIT 5;` — last 5 runs.
3. `SELECT * FROM edge_function_calls
   WHERE function_name = 'daily-reminders'
   ORDER BY called_at DESC LIMIT 5;` — successful runs.
4. **Edge Function logs** in Supabase for stack traces. The 23 h
   rate limit returns 200 with `{ok:true, skipped:true}`; that's
   normal, not an error.

### "QR code shows assigned but shouldn't"

Check the audit trail:

```sql
SELECT id, code, status, assigned_to_name, assigned_at,
       loan_request_id, loan_request_item_id
FROM qr_codes WHERE code = 'VO-XXX-NNN';
```

Unassign with the atomic helper (preferred, releases the stock
back too):

```sql
SELECT increment_product_stock(product_id) FROM qr_codes
WHERE code = 'VO-XXX-NNN';

UPDATE qr_codes SET
  status = 'available',
  assigned_to = NULL,
  assigned_to_name = NULL,
  assigned_to_email = NULL,
  assigned_at = NULL,
  loan_request_id = NULL,
  loan_request_item_id = NULL
WHERE code = 'VO-XXX-NNN';
```

---

## 5. Secret rotation

Rotate when a secret leaks (chat, log, screenshot, terminated
employee) or every 6 months.

### `RESEND_API_KEY`

1. Resend Dashboard → API Keys → **Create API key**. Give it the
   same scope as the previous one ("Sending access").
2. Supabase Dashboard → Edge Functions → Secrets → edit
   `RESEND_API_KEY` → paste new value → Save.
3. Send a test email through the hub to confirm it works.
4. Resend Dashboard → revoke the old key.

### `REMINDER_TOKEN`

1. `openssl rand -hex 32` → new value.
2. Supabase Dashboard → Edge Functions → Secrets → edit
   `REMINDER_TOKEN` → paste new value.
3. SQL Editor:
   ```sql
   SELECT cron.unschedule('daily-reminders');
   SELECT cron.schedule(
     'daily-reminders', '0 8 * * *',
     $$SELECT net.http_post(
       url := 'https://<PROJECT_REF>.functions.supabase.co/daily-reminders',
       headers := jsonb_build_object(
         'Content-Type','application/json',
         'Authorization','Bearer <NEW_TOKEN>'),
       body := '{}'::jsonb)$$);
   ```
4. Manually trigger once to validate:
   ```sql
   SELECT net.http_post(... same body as above ...);
   SELECT status_code, content FROM net._http_response ORDER BY id DESC LIMIT 1;
   ```
   Expect `200` with `{"ok":true,...}`.

### `FROM_EMAIL`

Same as RESEND_API_KEY but for the `FROM_EMAIL` secret. Update,
test, no revocation needed.

### Supabase service-role key

This one is **never** rotated lightly — it's set when the project
is created. If we suspect it leaked: Supabase Dashboard → Project
Settings → API → **Reset service role key**. This breaks every
Edge Function and the `daily-reminders` cron until they're
redeployed with the new key. Do it during a planned window.

---

## 6. Who to call

| What broke                     | Owner          | Channel              |
|--------------------------------|----------------|----------------------|
| Hub down / 5xx                 | Nadir + Tim    | Teams DM             |
| Supabase outage                | Nadir + Tim    | Teams + status.supabase.com |
| Vercel outage                  | Nadir + Tim    | Teams + vercel-status.com |
| Resend / email delivery        | Nadir + Tim    | Teams + resend.com/status |
| Microsoft SSO down             | Nadir + Tim    | Teams + Office 365 status |
| Data loss / suspected breach   | Nadir + Tim    | Teams (ASAP) |

Bus factor is 2. Either Nadir or Tim can drive an incident; loop the
other one in on Teams so they're aware. If both are out and the hub
falls over, whoever's covering can:

1. Promote the last known-good Vercel deployment (see §3).
2. Disable the `daily-reminders` cron so it stops nagging users:
   `SELECT cron.unschedule('daily-reminders');`.
3. Park it until Nadir or Tim is back.
