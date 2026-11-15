# Phases E–I — what shipped in `feat/phase-e-i`

Built on the recovered site on `main` (the code that matches bthstnn.org), not on the
React Router 7 rewrite in `implementation/ssr-vercel`. That branch replaced the public
UI with new markup and CSS, which would break the "keep the visual identity" rule, and
Vercel is out of scope for now. Hosting stays on GitHub Pages; crawler HTML comes from
build-time prerendering in `scripts/generate-seo.js`.

No database schema or data changes. No DNS changes.

## E — SEO, structured data, URLs

- Every public route is prerendered with real content inside `#root` (not `<noscript>`):
  - Story pages: section, `<h1>` headline, dek, "Published <date>", credits linked to
    /staff/, watch link, transcript (when present), related stories.
  - `/about/`: partners and the full staff list grouped Executives / Junior Executives / Members (`#staff`).
  - `/`, `/videos/`, every section page: real story lists with links.
  - Staff pages: role, bio, and their credited stories.
  - `/join/`, `/press/`.
- JSON-LD:
  - Site: NewsMediaOrganization with `alternateName` ["TNN", "Brooklyn Tech News Network"], logo, `sameAs` (YouTube, Instagram), `parentOrganization`, and `masthead` → /about/#staff.
  - Story: `@graph` of VideoObject + NewsArticle (authors = credited Persons) + BreadcrumbList.
  - Staff: Person with `worksFor` and `sameAs` (from public socials).
  - Collections: CollectionPage/ItemList.
- Title pattern: `<Story> | Tech News Network (TNN) — Brooklyn Tech`. Per-story OG/Twitter image and description.
- RSS: newest first, all published stories, links go to bthstnn.org story pages, `atom:link self`.
- Sitemap: adds /join/, /press/, /videos/weather/; story and staff URLs as before.
- A failed Supabase fetch now fails the build instead of shipping an empty site.

**Not done (needs hosting with server redirects):** the `/stories/<yyyy>/<mm>/<slug>/`
URL scheme and server-side 301s. GitHub Pages can't send 301s, so story URLs stay
`/videos/story/<id>/<slug>/` with a canonical tag. The old SHSAT `…/11-14-shsat-canceled/`
URL still serves the page, with its canonical pointing at `…/11-14-shsat-postponed/`.
Search Console verification meta: not added (no token yet).

## F — UI (existing identity kept: cream, navy, serif display)

| # | Change |
|---|---|
| F1 | Hero = editor-tagged hero unless it's Promo or older than 14 days → newest Breaking/Hard News. The kicker now says "Breaking"/"Top Story", not "Highlight". Today the hero is the SHSAT story instead of the Oct 2025 promo. |
| F2 | Ticker only shows Breaking stories from the last 72 h, each a link with "Updated Nh ago". Hidden when nothing qualifies. Respects reduced motion. |
| F3 | "Trending Leaderboard" → "Editors' Picks" ("Latest Stories" if none are tagged). Contained carousel with prev/next buttons, scroll-snap, edge fade, ←/→ keys, equal card heights (308 px). No rank badges. Platform shown as an icon, not the word "Instagram". |
| F4 | Removed "Quick paths into the public video catalog, without exposing internal newsroom tools." and "Showing 4 featured catalog videos"; "Catalog" heading → "Featured". |
| F5 | Removed the orphaned 4th tile (now 1 large + 2 side). Stronger gradient scrim behind tile titles. |
| F6 | Bottom "Latest Videos / Hard News / Features" block → "TNN in the news" strip (→ /press/) + Join TNN call to action. |
| F7 | One canonical section list (`src/lib/site.js`) used by the header, homepage grid, footer and /videos/ filters: Breaking, Hard News, Features, Weather, Sports. "Documentaries" is the one name (was Docs/Documentaries). Documentaries and Opinion have no published stories, so they're hidden from nav (routes work). Promo is out of the news nav; it's in the footer as "From TNN". |
| F8 | "Subscribe" → "Subscribe on YouTube" with YouTube icon (icon-only under 640 px, with an aria-label). |
| F9 | "Join" (header, mobile menu, footer) → on-site `/join/` page, with the Google Form as the button. |
| F10 | Utility bar "Tech News Network" → "Brooklyn Tech's student video newsroom". |
| F11 | No horizontal overflow at 390/768/1440 on home, story, /videos/, /about/ (measured). The existing mobile menu is unchanged. |
| F12 | Story player plays inline: Instagram reels/Shorts in a 9:16 frame (official Instagram `/embed/`), YouTube 16:9 (privacy-enhanced domain). Lazy: the iframe loads only after clicking the poster. "Watch on Instagram" stays as the secondary link. |
| F13 | Description renders once. The "About This Story" section only appears when a separate body exists. |
| F14 | "Published <date>" with `<time>`. "Updated" is **not** shown: `updated_at` changes on any CMS save (e.g. thumbnail refresh) and would mislead readers. Needs the G data field. |
| F15 | Credits already link to /staff/ (kept). |
| F16 | Transcript shows when present (prerender `<details>`). No transcripts exist yet. |
| F17 | Related stories (existing) + share bar: copy link, X, Facebook, email. |
| F19 | /videos/ filter row, sort and count share the 1180 px container. |
| F20 | Platform chips → section chips (real links: `/videos/<section>/`, plus `?section=` alias). Sort is `?sort=recent`. |

**Not done:** F18 "/licensing" line (the page needs adviser approval first).

## G — Data model + CMS: not started

Needs the migration SQL shown to you first (your rule) and the CMS confirmation. Everything
above works with today's columns. Free-text `date` is parsed, with `created_at` used for same-day precision.

## H — Credibility pages

- Shipped: `/press/` (Daily News entry, exactly as you supplied it) and `/join/`. Both are linked from the footer and the homepage.
- `/about/`: the `#staff` anchor exists on the prerender; the live React About page is the recovered original, unchanged.
- Not built: `/standards`, `/licensing` (need adviser sign-off), `/corrections` (needs G data), `/contact` tip form (needs an admin-only table).
- Existing About "Contact" = `mailto:bthstnn@gmail.com`.
- Partners on About, unchanged, for you to verify: Columbia University Graduate School of Journalism (journalism.columbia.edu); The Survey (surveybths.com).

## I — Quality

- Focus-visible outlines on all interactive elements. Carousel and filters are keyboard-usable.
- Small metadata gray darkened: `#666057` was 6.1:1 on cream (already AA); now `#55504a` (7.9:1). Blue `#12316f` is 12.2:1.
- Hero image `fetchpriority=high`; embeds lazy. The prerender replaces the blank-spinner first paint for no-JS/crawler loads.
- Not done: responsive thumbnail sizes, Lighthouse runs, analytics, styled 500 page.

## {{TODO}}s

| TODO | Where |
|---|---|
| Hero staleness window (using 14 days) | `src/lib/site.js` `HERO_MAX_AGE_DAYS` |
| Breaking window (using 72 h) | `src/lib/site.js` `BREAKING_WINDOW_HOURS` |
| Founding date | `scripts/generate-seo.js` `buildOrgJsonLd` |
| /standards URL for publishingPrinciples / correctionsPolicy / ethicsPolicy | same, after adviser approval |
| Join page time commitment (line omitted rather than shown as a placeholder) | `src/pages/public/SitePages.jsx` |
| Search Console token | not added |

## Verify

```bash
curl -s https://bthstnn.org/videos/story/bf62c27a-fd91-4f89-9801-b64d2f0c976e/11-14-shsat-postponed/ | grep -oE '<h1>[^<]*|Published <time[^>]*>[^<]*|"@type":"(VideoObject|NewsArticle|BreadcrumbList)"'
curl -s https://bthstnn.org/about/ | grep -c 'href="/staff/'
curl -s https://bthstnn.org/ | grep -oE '<h1>[^<]*'
curl -s https://bthstnn.org/rss.xml | grep -m3 '<link>'
```

Then run the Rich Results Test and the W3C feed validator (validator.w3.org/feed) on those URLs.

Screenshots: `docs/screenshots/<page>-<width>-<before|after>.png` (before = live site on 2026-11-15).
