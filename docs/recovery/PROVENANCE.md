# Recovery provenance — B1 preservation checkpoint

Baseline: main `31439fa`. Recovery source: `rollout-2026-09-27T18-56-47-01a0e515-d1c9-7340-96ad-f034d16e085c.jsonl`. SHA-256: `0f82a993801451be1a955884be5e0f80547027629e18d639fbbe7d5fd9c36195`. Logs remain private; only source and provenance are committed.

Verification on 2026-11-15: all seven captured read artifacts matched original tool outputs byte-for-byte after trimming surrounding whitespace. Read outputs: call_9yiTx15rgrQRdjy9g3PnNlUe, call_pyubE8CViYnBBaQZKMJZ8hnG, call_YnzGwMYxpgfHpm0QEiOVCKv7, call_2Y85RpBPNHnIPe5JxM2pq4aj, call_38bOMezycl6H2yldQM4GDBZ0, call_eJFKTNBoTlTdXSNxF7Lb9EZo, call_zS1UjcnS3DZTHltmeWY3738n. The successful Sep 27 patch sequence was replayed in a fresh private directory; the six recovered source files and partial snapshot matched the staged recovery files byte-for-byte. Relevant hunks replayed without failures.

This establishes reproducibility from logged material, not visual or behavior parity with production. The earlier literal-presence check against the bundle is insufficient to establish parity. No inferred or reconstructed code is introduced in this commit.

| File | Classification | SHA-256 |
| --- | --- | --- |
| `src/pages/public/InfoPage.jsx` | exact logged replacement + replayed patches | `7c6da307d4c0189f66dda9f6f92d5253bf0bd63e8b0fd5bc25986d73d4d2325c` |
| `src/components/public/AutoThumbnail.jsx` | recovery + replayed patches | `e5ad2b2f5a09b144c459170d1a03174d5910a9bcbde2143b19765eea59943f2c` |
| `src/lib/constants.js` | recovery + replayed patches | `1b62652e369d7e0672cada15c2429790236dc7267e358a41bffc4c82d6e8126b` |
| `src/lib/creators.js` | recovery + replayed patches | `1f75c8ad41463f803c5fabdbbb7797b2c967ce0789f59855042b55111f9d5b76` |
| `src/pages/newsroom/TeamPage.jsx` | recovery + replayed patches | `9b2ecd9efb60df093138c486f5017d3291cf7c15089b042ae97f73a951ef3c9b` |
| `src/pages/public/CreatorPage.jsx` | recovery + replayed patches | `6d535f027d1098f4a0708361edc36e8576f1aa44241f920072412d7255eec594` |
| `docs/recovery/partial/VideoCMSPage.first-980-lines.jsx` | PARTIAL recovery + replayed patches; NOT deployable source | `4f34daaa0903a2820772870c5485bbe3aec26961b33a5dca62ea8c07751829c7` |

## Unchanged source files from main

- `index.html`: unchanged from main at this checkpoint.
- `package-lock.json`: unchanged from main at this checkpoint.
- `package.json`: unchanged from main at this checkpoint.
- `scripts/copy-legacy-assets.js`: unchanged from main at this checkpoint.
- `scripts/generate-seo.js`: unchanged from main at this checkpoint.
- `src/App.jsx`: unchanged from main at this checkpoint.
- `src/assets/tnn-logo.png`: unchanged from main at this checkpoint.
- `src/components/ProtectedRoute.jsx`: unchanged from main at this checkpoint.
- `src/components/admin/AdminLayout.jsx`: unchanged from main at this checkpoint.
- `src/components/public/PublicLayout.jsx`: unchanged from main at this checkpoint.
- `src/components/public/VideoCard.jsx`: unchanged from main at this checkpoint.
- `src/components/ui/index.jsx`: unchanged from main at this checkpoint.
- `src/context/AuthContext.jsx`: unchanged from main at this checkpoint.
- `src/lib/seo.js`: unchanged from main at this checkpoint.
- `src/lib/supabase.js`: unchanged from main at this checkpoint.
- `src/lib/videoRoutes.js`: unchanged from main at this checkpoint.
- `src/main.jsx`: unchanged from main at this checkpoint.
- `src/pages/admin/LoginPage.jsx`: unchanged from main at this checkpoint.
- `src/pages/newsroom/DashboardPage.jsx`: unchanged from main at this checkpoint.
- `src/pages/newsroom/SegmentDetailPage.jsx`: unchanged from main at this checkpoint.
- `src/pages/newsroom/SegmentsPage.jsx`: unchanged from main at this checkpoint.
- `src/pages/newsroom/TasksPage.jsx`: unchanged from main at this checkpoint.
- `src/pages/newsroom/VideoCMSPage.jsx`: unchanged from main at this checkpoint.
- `src/pages/public/HomePage.jsx`: unchanged from main at this checkpoint.
- `src/pages/public/StoryPage.jsx`: unchanged from main at this checkpoint.
- `src/pages/public/VideosPage.jsx`: unchanged from main at this checkpoint.
- `src/styles/global.css`: unchanged from main at this checkpoint.
- `vite.config.js`: unchanged from main at this checkpoint.

## Incomplete recovery and phase gates

VideoCMS snapshot ends mid-component and has 1,019 lines after replay despite its first-980-lines filename. The original read was truncated. The active src/pages/newsroom/VideoCMSPage.jsx is still the old main version. {{TODO: recover the missing source or explicitly reconstruct it from bundle under B2, with inferred behavior recorded}}.

AuthContext, ProtectedRoute, LoginPage, AdminLayout, CSS, assets, routing and SEO parity have NOT been recovered or verified here; unchanged from main does not imply matching the live bundle. {{TODO: B2–B5 with per-page screenshots at 390/768/1440, build/route/prerender/sitemap/base-path/asset diff, and B3 auth behavior audit}}. No B6 merge is approved.

The source preservation branch contains no deploy workflow. Pushing recovered-sep27 preserves B1 only; it does not push gh-pages, merge main, or authorize a production deployment.
