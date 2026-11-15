# Phase A live evidence — 2026-11-15

Project: `jqquxpfmaczfmqvfoqfy` (CLI reports production). Captured at `2026-11-15T21:06:00.391338+00:00` using Supabase CLI 3.1.0 `db query --remote --read-only`, as `supabase_read_only_user`. The exact capture query is `capture-catalog.sql`; results are stored as sorted JSON in `live-catalog-2026-11-15.json`.

SHA-256: `6b63a482f8b0f428ebf0c7a12ac5ed1482b009bb8bdec1b46a9e30ddc5505821`.

This is live catalog evidence, not reconstructed bundle SQL. It contains 79 relations, 731 columns, 73 policies, 67 non-extension functions, 33 non-internal triggers, constraints, indexes, views and visible grants. Seven webhook trigger definitions contain JWTs whose decoded role is `anon`, not a privileged service key. No story rows or auth accounts were exported.

## Limits and remaining baseline work

{{TODO: obtain and commit a complete schema-only pg_dump once Docker/disk capacity is repaired}}. The attempted `db dump --remote` could not download its Postgres image: Docker reported input/output errors and npm reported ENOSPC. The download retries were stopped. The catalog evidence is not a complete restore artifact: e.g. sequence state, user-defined type definitions, schema privileges, and full role membership are not captured. Grant views may be limited by the read-only account. Do not mark A1 complete from this catalog alone.

Command from the linked platform checkout (schema only by default):

```sh
npx supabase db dump --remote --file /path/outside-git/tnn-live-schema.sql
```

Supabase excludes managed schemas by default. Capture custom auth/storage objects too and compare with this catalog, which includes the `auth.users` signup trigger. Review the export before committing; never commit credentials or intrusion-check results. CLI semantics: https://supabase.com/docs/reference/cli/supabase-issue-bug

`intrusion-checks.sql` is for the owner to run privately (A2). Its selected public-table columns were verified against this live catalog. It cannot recover old headlines or identify an editor without an independent audit log. {{TODO: confirm whether a historical edit log exists outside these tables}}.
