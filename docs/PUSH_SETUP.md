# Push notifications — one-time setup

The code is shipped; push stays dormant until these steps are done.
Until then the in-app bell keeps working and the profile toggle hides
itself (no VAPID key = nothing to enable).

## 1. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Note the **public** and **private** keys.

## 2. Client env var (Vercel)

Vercel → project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `VITE_VAPID_PUBLIC_KEY` | the public key from step 1 |

Redeploy so the bundle picks it up.

## 3. Edge function secrets (Supabase)

```bash
supabase secrets set VAPID_PUBLIC_KEY=<public>
supabase secrets set VAPID_PRIVATE_KEY=<private>
supabase secrets set VAPID_SUBJECT=mailto:it@vo-group.be
```

## 4. Deploy the function

```bash
supabase functions deploy send-push
```

## 5. Wire the DB trigger to the function

So a new in-app notification also fires a push. In the SQL editor:

```sql
ALTER DATABASE postgres SET app.push_function_url =
  'https://<project-ref>.functions.supabase.co/send-push';
ALTER DATABASE postgres SET app.push_service_key =
  '<service-role-key>';
```

(`pg_net` must be enabled — Database → Extensions → enable `pg_net`.)

## 6. Try it

- Open VO Hub on a phone. On iPhone: Share → **Add to Home Screen**
  first (iOS only allows web push for installed PWAs).
- Profile → Notifications → **Turn on** → accept the prompt.
- Trigger any action that creates a notification (e.g. submit a
  request) — the push should land on the lock screen.

Dead subscriptions (uninstalled apps) are pruned automatically the
next time a push to them returns 404/410.
