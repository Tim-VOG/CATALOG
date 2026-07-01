# Migrations

This directory is the single source of truth for the VO Hub database
schema. Files are applied in numeric order: `001_` first, then `002_`,
all the way through to the latest.

## Rules

1. **Never edit a migration after it's been applied to staging or prod.**
   Fix-forward with a new migration instead.
2. **One concern per migration.** A migration that adds a column AND
   rewrites RLS AND backfills data is hard to roll back and hard to
   read in `git log`. Split it.
3. **`IF NOT EXISTS` / `IF EXISTS` everywhere.** Migrations must be
   idempotent — re-running them on a partially-migrated DB must not
   error.
4. **Wrap each migration in `BEGIN; … COMMIT;`** so a failure halfway
   through rolls back cleanly.
5. **Drop-before-create for triggers and policies.** Use
   `DROP POLICY IF EXISTS` / `DROP TRIGGER IF EXISTS` ahead of the
   `CREATE` so re-applying picks up the new definition.

## Numbering

We're at migration 111+ today. There is no hard limit — the numbers
just need to keep climbing. Skipping numbers is fine if you reserved
one for an in-progress branch.

## Rebuilding a baseline (squash)

Once the migration count gets uncomfortably high, the right move is
to dump the current production schema with `pg_dump --schema-only`
and use that as the new `000_baseline.sql`, then delete every
migration that predates the dump.

Don't try to generate the baseline by concatenating the migration
files by hand — backfills, conditional logic, and superseded RLS
policies will leave the result subtly wrong. Always dump from a
known-good environment.

Suggested workflow:

```bash
# Against the environment that's already in the target state.
pg_dump --schema-only --no-owner --no-acl \
        "$DATABASE_URL" \
  > supabase/migrations/000_baseline.sql

# Once the baseline is verified on a fresh local DB, archive the
# old per-migration files (don't delete — keep them in git history).
git rm supabase/migrations/0[0-9][0-9]_*.sql
git rm supabase/migrations/1[0-1][0-9]_*.sql
```

## Audit trigger

Several tables route through `fn_audit()` (defined in 100 and
hardened in 108). Run `supabase/tests/fn_audit_test.sql` against any
target to verify the trigger still produces the expected `action`
labels and compact diffs.

```bash
psql "$DATABASE_URL" -f supabase/tests/fn_audit_test.sql
```

The test wraps everything in `BEGIN … ROLLBACK`, so it never
persists anything.

## `supabase/full_schema.sql`

Stale. Kept for historical reference only — see the header in that
file. Do not use it to provision a new database.

## Historical notes (intentional back-and-forth)

Some migration pairs look like one undoes the other. They are
intentional product changes, not mistakes — documented here so nobody
"fixes" them later:

- **070 → 071 (user cancel → user notes).** Migration 070 added
  DELETE policies letting users cancel their own pending
  loan/it/mailbox requests. Migration 071 immediately dropped those
  policies and instead added a `user_notes` column plus UPDATE
  policies. The product decision changed mid-sprint: rather than let
  users delete requests outright, they now leave a note asking an
  admin to cancel. Both migrations are correct as applied — 071
  supersedes 070 on purpose.
