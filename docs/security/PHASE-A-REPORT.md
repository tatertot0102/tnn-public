# Phase A checkpoint — 2026-11-15

Phase A is incomplete. This checkpoint contains local reviewable commits only. No production migration, deploy, DNS change, story-content edit, account creation or role edit was performed. Supabase CLI schema export initialized its normal temporary login role; catalog queries explicitly used `--read-only` and returned `supabase_read_only_user`. No content data was exported. No changes were pushed or merged.

## Changes and evidence

- `e8e3e27`: live catalog evidence and capture SQL; owner-run intrusion checks. See BASELINE.md for provenance and capture limits.
- `5c723bf`: all-public-table policy inventory and reversible security proposal. It prevents non-admin role changes, prevents profile identity reassignment, and requires an identity on the 18 internal tables. Proposals are under docs/security/proposals, outside the automatic migration path.
- `791a1e1`: .gitignore and .env.example; removed .env, 11,122 dependency files and four dist files from the index. Local files are preserved. History is unchanged. No application source was changed.
- This report and public auth settings evidence are a separate documentation commit.

The live public `/auth/v1/settings` endpoint returned `disable_signup: true` at this checkpoint. This resolves the signup-toggle status placeholder as of the check, but does not establish whether older unwanted accounts exist. No signup or write request was sent.

## Security findings

Live policy/trigger definitions confirm unprotected self-profile role changes and anonymous non-exec task reads. The table review also found anonymous DM-channel insertion permitted by policy. The proposal addresses these three gaps. It deliberately leaves published-video reads, the public profile view, and token-based sharing RPC unchanged.

Additional concerns include broad authenticated approval-gate, gate-approver and deliverable modification permissions, and video policies that accept exec but not admin. See TABLE-AUDIT.md. These require workflow decisions and integration tests; do not describe the proposal as a complete security audit or a finished invite-only system.

## Verification

- 16 isolated PostgreSQL/PGlite checks passed using PostgreSQL policies taken directly from the catalog for profiles, tasks and channels, with reduced fixture tables. The fixture reproduces the anonymous leaks, verifies the guard and identity restrictions, checks member/exec/admin behavior, and executes the rollback. It never connects to production. Other internal tables use reduced fixture schemas; this is not a full Supabase integration test.
- Re-run: install `@electric-sql/pglite` in an external temporary directory, then run `node scripts/test-security-proposal.mjs /absolute/path/to/node_modules/@electric-sql/pglite/dist/index.js`.
- `git diff --check` passes.
- `git ls-files .env 'node_modules/**' 'dist/**'` returns no tracked paths after cleanup. `git check-ignore` confirms all three are ignored.
- Source bundle check: `node node_modules/vite/bin/vite.js build --outDir /absolute/path/outside-repo/build-output` failed with missing `src/components/public/AutoThumbnail.jsx`, imported by StoryPage.jsx. The file is absent from main at 31439fa; this predates the audit commits. Full npm prebuild/postbuild and SEO generation were not run. Do not deploy this source.
- No UI was changed; before/after screenshots at 390/768/1440 are not applicable to this checkpoint. Phase B visual parity is unverified.

## Recovery and other worktrees preserved

The configured Downloads/tnn-platform 4 path is absent. The matching public repository is `/Users/zanewolf/Documents/bthstnn-site`; the platform repository is `/Users/zanewolf/Documents/tnn-platform`. Audit changes are isolated on `audit/phase-a-baseline` at `/Users/zanewolf/Documents/bthstnn-phase-a`. The app could not create a managed worktree because the configured workspace points to the absent Downloads path; a regular Git worktree was used.

At inspection, `recovered-sep27` was still at 31439fa, identical to main, with seven staged files and no remote branch. Its staged diff was 2,173 insertions and 237 deletions: AutoThumbnail, constants, creators, TeamPage, CreatorPage, InfoPage, and the partial VideoCMS snapshot. The snapshot contains 1,019 lines despite its first-980-lines filename and ends mid-component. It is not a runnable complete VideoCMS recovery. No recovery changes were committed or unstaged by this checkpoint. Exact-recovery claims still need independent verification before B1 can be completed.

Other work remains untouched: main dependency-cache modifications and untracked docs; substantial platform source/SQL changes; local SHSAT hotfix 041b3f3; local deploy workflow 2ac2ddd. Neither hotfix nor workflow was merged or pushed here.

## Remaining TODOs and owner actions

1. **A1** — Repair Docker/disk capacity and provide a complete schema-only dump, including managed-schema customizations, then review and commit it. Docker failed with input/output errors while pulling its Postgres image, npm reported ENOSPC, and Docker was subsequently unavailable. Catalog evidence is not a complete restore artifact. See BASELINE.md for exact capture command and omissions.
2. **A2** — Run intrusion-checks.sql privately and provide reviewed results. Never commit account results. Current video timestamps do not identify an editor or establish prior content. {{TODO: locate independent historical edit/audit logs if available}}.
3. **A3** — Review draft SQL and its rollback. {{TODO: verify an existing legitimate admin can manage roles}}. Only an authenticated admin can change roles under the proposal, including maintenance clients; there is no service-role exception to that trigger.
4. **A3** — {{TODO: confirm which CMS editors publish from}}. Then implement authenticated exec-checked server-side invitations with new staff forced to member; service credentials must stay on the server. Existing browser auth-admin calls are not a secure invitation implementation.
5. **A3** — Resolve the per-table workflow and RPC/grant TODOs in TABLE-AUDIT.md; test on a disposable Supabase environment with the full baseline before production approval.
6. **A4** — Complete locally. A clean checkout needs dependencies installed and browser-safe environment values populated. .env.example has two explicit TODO placeholders for these values.
7. **B1/B2** — {{TODO: verify original log recovery/provenance; commit and push the exactly verified B1 material before reconstruction; recover the missing VideoCMS tail}}. Do not merge recovery or claim parity until the Phase B checks and approval gate are satisfied.

All TODO markers introduced by this checkpoint live in BASELINE.md, TABLE-AUDIT.md, this report, and .env.example. The consolidated plan's later-phase TODOs are not resolved here. Production application of SQL requires explicit owner approval under the consolidated plan. No approval is being inferred from Keychain access.
