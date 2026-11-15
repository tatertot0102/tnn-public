# One-time SHSAT static patch — C1

Claude's original commit 041b3f3 was found in its worktree and preserved on remote branch claude/hotfix-shsat-story. Follow-up eb26a75 uses the current read-only story row, whose headline is now 11/14 SHSAT Postponed. No database content was edited here.

Relative to live gh-pages 7155a07, exactly four files change: rss.xml, sitemap.xml, the legacy 11-14-shsat-canceled story index, and the current 11-14-shsat-postponed index under videos/story/bf62c27a-fd91-4f89-9801-b64d2f0c976e/. Both indexes contain the current headline and canonicalize to the postponed URL. The old URL remains available for inbound links. All 18 existing RSS items link to TNN story pages; GUIDs are explicitly non-permalinks. This limited hotfix does not regenerate every other stale page/feed entry.

Both XML documents parse, JSON-LD parses, and current headline/canonical links were checked. The exact patch is stored outside Git at /Users/zanewolf/.codex/tnn-audit/2026-11-15/shsat-hotfix-exact.diff. No JavaScript, CSS or other asset is changed. The source branch is pushed for review only. gh-pages remains 7155a07; merging/pushing this patch there is a production deployment and still requires explicit approval after reviewing the exact diff.

The original generator truncates descriptions at 320 characters; this historic behavior remains a known limitation pending Phase E. No article description or other story content was invented or rewritten.
