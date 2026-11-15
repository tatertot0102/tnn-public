# Full live schema-only dump

Captured 2026-11-15 from the linked production project `jqquxpfmaczfmqvfoqfy`. Exact native `pg_dump` output, including managed auth/storage schemas and custom triggers; no bundle reconstruction or SQL transformations. No table data or auth account rows were included.

Native client: PostgreSQL 17.12 (installed through Homebrew as keg-only libpq@17; no local database server was installed). The CLI `db dump --remote --dry-run` supplied temporary connection settings, held privately and passed through the child process environment. The native dump used:

```sh
PGSSLMODE=require PGOPTIONS='-c default_transaction_read_only=on' pg_dump --schema-only --quote-all-identifiers --role postgres --no-password
```

Host/user/password/database settings came from the linked CLI session, never from reconstructed SQL. Do not copy private connection settings into Git. The dump succeeded with exit code zero. It is a baseline for review, not an instruction to restore managed Supabase schemas into production. Cluster-level roles/passwords are outside pg_dump's schema-only scope; no passwords were exported. Grant/role coverage should still be reviewed with a disposable Supabase restoration before applying security changes.

Seven embedded JWTs were decoded and all carry the public anon role. Checks found no service JWT, sb_secret token, personal access token, private key, user mapping, or nonempty PASSWORD clause. These checks do not prove the absence of every possible secret.

SHA-256: `c5c3266cbc380e9100fd85fd368f776ee55c854d2d5c38be2fbfde09178eed9a`.

This supersedes the earlier Docker blocker and the A1 full-dump TODO in BASELINE.md and PHASE-A-REPORT.md. Retain those earlier reports as checkpoint history.
