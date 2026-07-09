# VO Hub — working notes

## Conventions

### What's new (user-facing changelog)
Whenever a change touches the **user side** (anything a regular, non-admin
user can see or do), add a matching entry to the changelog in
`src/pages/WhatsNewPage.tsx` — newest first, in the `CHANGELOG` array.
Every entry is trilingual (`fr` / `en` / `nl`) and picks a tag
(`new` | `improved` | `fixed`). Admin-only features do **not** go there.

### i18n
The app is trilingual (FR / NL / EN) and a parity test
(`src/lib/i18n-parity.test.ts`) enforces identical key sets and identical
`{{placeholders}}` across the three languages. Always add new keys to all
three, with matching placeholders.

### Before committing
Run typecheck (`npx tsc --noEmit`), tests (`npx vitest run`, 100 passing)
and a build (`npx vite build`). All three must be green.

### Database
Migrations live in `supabase/migrations/`. Claude writes the SQL; the user
applies it (`supabase db push`). Never require secrets (service_role key,
DB password) in chat.
