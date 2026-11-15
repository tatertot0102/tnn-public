# Consolidated plan status — 2026-11-15

This is the current checkpoint. It supersedes earlier reports where work has since completed. The whole A–I plan is NOT complete. No production SQL, story-data edit, live deploy, DNS change, email invitation or account creation was performed. Branch pushes preserve/review source only.

| Phase | Current state | Gate / remaining work |
| --- | --- | --- |
| A | Live full schema committed, intrusion queries run privately, signup disabled confirmed, all-table inventory and reversible SQL prepared, invite endpoint + tests prepared, repo hygiene complete | Review/apply exact SQL only with approval; review legitimate staff identities; wire invitation UI/acceptance and test on disposable Supabase; decide broad approval-workflow grants. See docs/security. |
| B | B1 pushed; full bundle-derived recovery including VideoCMS complete; exact CSS/assets restored; auth evidence listed; all 61 routes tested at all three widths; full build/output diff passes | Owner review and B6 merge approval. Authenticated production behavior is not claimed from fixture tests. |
| C | Both Claude branches found and pushed safely; SHSAT patch refreshed from corrected headline; 18 RSS links fixed; manual deploy pipeline integrated on review branch; lockfile/build guard fixed | Explicit approval before gh-pages deploy; configure production environment/reviewers. No automatic push trigger until B approval. |
| D | Not implemented | After B approval: RR7 framework SSR on Vercel from Git, <=5min refresh + protected webhook, platform noindex headers, preview review; DNS belongs to owner. |
| E | Full current feed generation now uses TNN links; full SSR/schema/301/dynamic sitemap work remains | Build on approved SSR/data model; founding date and Search Console token remain TODO. |
| F | No redesign shipped; exact identity/parity recovered | Implement requested homepage/nav/story/catalog fixes after recovery approval. Hero/ticker windows require explicit documented defaults or owner values. |
| G | Live baseline available; no story rows changed | Add missing metadata/CMS fields using reversible reviewed migrations; never invent summaries/transcripts; confirm active CMS (code clearly links platform to public CMS, actual usage remains unconfirmed). |
| H | Existing partners preserved and recorded: Columbia University Graduate School of Journalism; The Survey | Adviser/founding/relationship/contact/time-commitment/reach facts remain TODO; standards must stay unpublished until adviser approval; Daily News entry uses supplied facts, not invented copy. |
| I | Recovery browser/build tests and media-server tests completed; source performance/lint concerns recorded | Accessibility/performance/Lighthouse/analytics/error pages after approved implementation. No blanket quality-completion claim. |

## Additional recovered Claude platform work

The original platform checkout contains previously deployed but uncommitted Nov 11 media/browser/upload work. It was copied into an isolated worktree, scanned, committed in three logical groups and pushed to preserve/claude-nov11. Original uncommitted work is intact. 31 media-server tests and platform Vite build pass; existing copied source has 20 ESLint errors and three warnings. This preservation is not a production readiness/merge approval. See the platform branch's docs/recovery/CLAUDE-NOV11.md.

## What requires the owner

- Approve or reject the exact security up/down SQL and the SHSAT four-file production diff; no approval is inferred from a generic request to continue.
- Review recovery screenshots and approve B6 merge before proceeding to the next deployment phase.
- Confirm active editor CMS/onboarding redirect; review private intrusion identities; configure required GitHub production reviewers and build variables.
- Supply remaining factual TODOs: faculty adviser, founding date, relationship to The Survey, verified reach statistic, join time commitment, contact emails, partner confirmation and Search Console token. Standards/adviser sign-off and DNS cutover remain owner actions.

These gates come from the user's consolidated plan, including "Show me the SQL before applying" and "Each phase ends with a report and my approval before the next one deploys anything." No later phase or production action is silently approved by source preservation.
