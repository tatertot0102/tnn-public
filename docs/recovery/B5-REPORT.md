# Phase B verification and approval checkpoint

## Recovery complete for review

The complete active VideoCMS implementation, including the missing tail, is recovered from the deployed bundle. The archived logged snapshot remains partial, accurately labeled. Original variable names and JSX were unavailable, so compiled names/runtime calls are retained with a reproducible AST-based extraction script. No guessed authentication behavior is introduced. B1 commit c8d3acb and remote recovered-sep27 remain intact.

Current branch recovery/complete-source contains the Phase A review package, B1 preservation, complete bundle-derived application, exact live CSS/assets, and Claude's manual CI workflow with stricter approval/build guards. Nothing is merged to main or deployed. See PROVENANCE.md, AUTH-BEHAVIOR.md, ASSETS.json and BUILD-DIFF.json.

## Browser verification

54 public routes (home, About, all section/catalog routes, 21 story instances and 21 public staff pages) plus seven login/CMS routes were compared at 390/768/1440: 183 pairs / 366 final screenshots. Each pair has identical body text/headings, no uncaught browser errors, no horizontal overflow, and document heights equal to within one pixel. The screenshot gallery is outside Git at /Users/zanewolf/.codex/tnn-audit/2026-11-15/matrix/index.html. Some initial screenshots were repeated after directly observed image-size, staff-label and VideoCard differences were fixed.

Both sides use the same read-only public-data snapshot to isolate rendering from changing content. CMS tests use an explicitly synthetic local session/profile; all API writes and auth requests are intercepted/denied. These tests do not establish production authentication, RLS or email acceptance. Gallery review is still appropriate before B6 approval; automated text/geometry comparison is not a claim of pixel-perfect identity of dynamic external video embeds.

A separate fresh, unmocked Chrome visit to production returned 200 for videos/public_profiles and showed the current SHSAT Postponed headline. Node fetch also returned 200 with the published public key. Earlier Python/urllib gateway probes returned 401; those probes do NOT establish a live outage or invalid browser configuration. No key was changed. CHECKPOINT-2.md's API-access concern is superseded by this result.

## Build verification

- Clean npm ci and full npm run build passed in an isolated copy with a local read-only snapshot, verifying the repaired lockfile. The clean dependency directory was removed afterward to reclaim task-created disk usage; logs remain.
- Full npm run build also passed against actual public Supabase reads, producing 21 story prerenders, 21 staff prerenders, a 21-item RSS feed and sitemap. No database writes occurred.
- All 45 old deployed route indexes remain present; seven newly published story/staff indexes plus the SHSAT legacy alias appear, for 53 total. BUILD-DIFF.json lists them. Every sitemap route has a generated index. Root base path in vite.config.js remains unchanged and verified by the output paths.
- Existing/current JS/CSS asset aliases are retained so cached HTML continues to load. Public partner/logo assets and exact CSS are hash-recorded.
- RSS links now target TNN story pages, include all published rows without a 30-item cap, and declare atom:self. XML parses; every item link is on bthstnn.org.
- Build fetch failures now fail instead of silently generating an empty feed/sitemap. CI explicitly refuses local snapshot builds. Both failure modes were tested with mocked reads.
- npm run deploy exits without deploying. Its build prehook and gh-pages dependency were retired. Only the approved Git workflow may deploy.
- Workflow YAML parses and action tag SHAs were checked against upstream repositories. The workflow is manual/main-only, requires a configured production review environment, and fails closed if the reviewer preflight fails. Only github-pages currently exists; production reviewers still need owner configuration.
- Existing performance concern: the recovered client bundle is about 512 KB before gzip and emits Vite's chunk-size warning. No SSR/performance completion claim is made.

## Gate

B2–B5 are prepared for review; B6 merge requires the owner's approval under the consolidated plan. Authenticated Supabase integration/email tests remain necessary before security deployment. Phases D–I have not been implemented or deployed from this recovery branch: advancing them requires the phase gate and must not silently discard recovered features or invent missing facts. See docs/audit/PLAN-STATUS.md for the complete remaining plan and owner actions.

C1 compatibility follow-up: full builds retain the legacy SHSAT canceled-slug static URL with the current headline/canonical, so a later approved build does not erase the hotfix alias. The future SSR phase still needs the ID-based 301 behavior.
