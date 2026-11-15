# Phase A / B1 checkpoint 2 — 2026-11-15

This is the current report. Earlier checkpoint TODOs concerning obtaining the dump, running intrusion queries, and preserving B1 are superseded here. Phase A's immediate mitigation code is reviewable, but its full integration and workflow review is not complete. Phase B reconstruction/parity is not complete. No migration, deploy, DNS change, account/invitation action or story-content edit was performed. CLI temporary login initialization is its normal schema-export authentication step. Source branches were pushed; main and gh-pages were not changed.

## Completed

- **A1**: Full native schema-only pg_dump captured successfully, committed with exact bytes and provenance (FULL-DUMP.md). It includes managed auth/storage schemas and all custom triggers, functions, policies and visible grants. Seven JWTs in webhook definitions decode to the anon role. The dump contains no story/auth rows or password clauses. Cluster-level role membership/passwords are not part of a schema-only pg_dump; no roles were altered by the security proposal.
- **A2**: Read-only queries executed successfully for 23 accounts, ten privileged profiles (nine exec, one admin), 21 story rows and one SHSAT row. Account details/results remain private outside Git. No account was created after 2026-10-19 01:07:55 UTC in this snapshot. This does not establish whether existing accounts or edits are legitimate. SHSAT row timestamps are 2026-11-14 21:57:26.533342 UTC created and 21:58:24.351036 UTC updated. Prior headlines and editor identity cannot be established from these timestamps. The owner must review staff identities privately.
- **A3 proposals**: Admin-only profile role guard plus immutable profile IDs; restrictive identity policy across 18 internal public tables; matching rollback; all-public policy audit and all-schema table inventory. These close the missing-auth policy paths on tasks and DM insertion as well as direct self-role escalation if applied. Other approval-workflow grants remain broad and are documented.
- **A3 invitation server code**: New invite-staff Edge Function verifies the session and current database role, permits exec/admin only, accepts only email/name, and lets the existing signup trigger use the member default. Request-supplied roles and redirects are rejected. Server key never enters a browser bundle. It is not deployed or wired to a CMS yet.
- **A4**: .env, node_modules and dist are untracked and ignored on the audit branch; local files preserved. .env.example contains explicit placeholders. Existing history is unchanged.
- **B1**: c8d3acb committed and pushed to recovered-sep27. Original read outputs were matched to the raw Sep 27 rollout; patch replay in a fresh directory matched six recovered source files plus the partial VideoCMS snapshot byte-for-byte. PROVENANCE.md records hashes and exact limits. No reconstructed code was introduced and no merge/deploy was performed. VideoCMS remains truncated at 1,019 lines after replay.

## Verification

- 16 isolated PostgreSQL policy/trigger/rollback checks pass, using catalog-derived policies for profiles/tasks/channels and reduced fixture tables.
- 18 Node invitation-handler tests pass; injected adapters never send email or contact production.
- `npx deno check --no-lock --node-modules-dir=none supabase/functions/invite-staff/index.ts` passes. This is type checking, not a deployed Supabase integration test.
- recovered-sep27 passes direct Vite bundle build (1,566 modules). Full npm prebuild/postbuild/SEO and per-page visual parity were not run. The June main/audit source still lacks AutoThumbnail; the recovery branch includes it. A successful bundle build is not B5 approval.
- `git diff main --check` passes on the audit branch. The exact pg_dump has a file-specific whitespace attribute to preserve its original generated whitespace.
- No public UI changed in the audit branch; no before/after screenshots were required for that backend/hygiene work. All B5 screenshots at 390/768/1440 remain pending.
- Public auth settings reported signup disabled. API gateway probes are failing with 401 using both the published legacy public key and a currently listed publishable key. This is an observed client-access concern, not a reason to expose service credentials. No key was rotated or changed.

## Local tools and preservation

Installed native libpq@17 through Homebrew to bypass Docker (client tools, not a database server), including its dependencies; Homebrew upgraded ca-certificates and linked OpenSSL 4. Deno and PGlite were cached externally for validation. Docker remains unavailable and disk space remains limited. No unrelated files, containers or volumes were deleted. Temporary schema-export credential script was deleted after use. Original public/platform uncommitted work remains untouched. See the first checkpoint for checkout paths.

## Review package and gates

Exact proposed production SQL: proposals/001-security.up.sql. Exact rollback: proposals/001-security.down.sql. Files are outside the automatic migration runner. Applying or rolling back affects authorization only; neither file updates story rows. Rollback restores the old vulnerabilities. An authenticated admin is required for role changes under the trigger, including maintenance callers; an admin exists in the snapshot but its legitimacy needs owner review.

{{TODO: owner approval of exact SQL before production application}}. The consolidated plan explicitly says to show SQL before applying and forbids production data changes/deploys without approval. Generic continuation instructions have not been treated as approval of SQL the owner has not reviewed.

{{TODO: confirm active publishing CMS and onboarding redirect before client integration/deployment}}. Code evidence: platform SegmentDetail links to bthstnn.org/#/newsroom/videos; current usage is not proven. The endpoint supports calls from either CMS. See INVITATIONS.md for runtime configuration, client contract, and remaining acceptance/rate-limit tests. Do not deploy an invitation workflow until the receiving app can accept its sessions.

{{TODO: owner roster review of private intrusion results; inspect independent historical edit logs if available}}. Private report: /Users/zanewolf/.codex/tnn-audit/2026-11-15/INTRUSION-REVIEW.private.md. Do not commit it.

{{TODO: gateway/API access investigation and managed-schema effective-access review}}. See ALL-TABLES.md and api-schema-check JSON evidence. No public-client key/config fix has been made.

{{TODO: define approval-gate/approver/deliverable authorization and validate full Supabase integration before claiming A3 complete}}. See TABLE-AUDIT.md. Existing broad staff grants have not been silently redesigned.

{{TODO: B2 missing VideoCMS source and remaining reconstruction; B3 auth behavior evidence; B4 complete final provenance; B5 screenshots/build-output parity; B6 approval before merge}}. B1 preservation does not bypass these gates. Stop at this checkpoint before reconstruction or production changes.
