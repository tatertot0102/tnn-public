// Shared public-site configuration: one canonical section list and the
// homepage rules (hero staleness, breaking window). Used by the React app;
// scripts/generate-seo.js keeps a CommonJS copy of SECTION_LABELS in sync.

// Canonical sections. `nav: false` keeps the route working but hides the
// section from primary navigation. Documentaries and Opinion have no
// published stories yet; set `nav: true` once they do.
export const SECTIONS = [
  { slug: 'breaking', label: 'Breaking', nav: true },
  { slug: 'hardnews', label: 'Hard News', nav: true },
  { slug: 'features', label: 'Features', nav: true },
  { slug: 'weather', label: 'Weather', nav: true },
  { slug: 'sports', label: 'Sports', nav: true },
  { slug: 'docs', label: 'Documentaries', nav: false },
  { slug: 'opinion', label: 'Opinion', nav: false },
  { slug: 'promo', label: 'From TNN', nav: false },
]

export const NAV_SECTIONS = SECTIONS.filter(section => section.nav)

export function sectionLabel(slug) {
  return SECTIONS.find(section => section.slug === slug)?.label || slug || 'Video'
}

// {{TODO: confirm hero staleness window with editors}} (plan example: 14 days)
export const HERO_MAX_AGE_DAYS = 14
// {{TODO: confirm breaking window with editors}} (plan range: 48–72 hours)
export const BREAKING_WINDOW_HOURS = 72

const DAY_MS = 24 * 60 * 60 * 1000

function hasTag(video, tag) {
  const placements = Array.isArray(video?.placements) ? video.placements : []
  return placements.includes(tag) || video?.placement === tag
}

// The CMS stores `date` as free text ("Nov 14, 2026"); fall back to created_at.
export function publishedTime(video) {
  const parsed = Date.parse(video?.date || '')
  const created = Date.parse(video?.created_at || '')
  // Same calendar day as created_at: use the precise timestamp.
  if (Number.isFinite(parsed) && Number.isFinite(created) && Math.abs(created - parsed) < 36 * 60 * 60 * 1000 && created >= parsed) return created
  if (Number.isFinite(parsed)) return parsed
  return Number.isFinite(created) ? created : 0
}

export function formatPublished(video) {
  const time = publishedTime(video)
  if (!time) return ''
  return new Date(time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function relativeTime(time, now = Date.now()) {
  const minutes = Math.max(1, Math.round((now - time) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

const newestFirst = (a, b) => publishedTime(b) - publishedTime(a)

// Editor-tagged hero wins unless it is Promo or older than HERO_MAX_AGE_DAYS;
// then fall back to the newest Breaking or Hard News story.
export function pickHero(videos, now = Date.now()) {
  const tagged = videos.find(video => hasTag(video, 'hero'))
  const fresh = tagged && tagged.section !== 'promo' && now - publishedTime(tagged) <= HERO_MAX_AGE_DAYS * DAY_MS
  if (fresh) return { video: tagged, reason: 'editor' }
  const news = videos.filter(video => ['breaking', 'hardnews'].includes(video.section)).sort(newestFirst)[0]
  if (news) return { video: news, reason: 'fallback' }
  return { video: tagged || [...videos].sort(newestFirst)[0] || null, reason: 'fallback' }
}

// Breaking stories published within BREAKING_WINDOW_HOURS, newest first.
export function recentBreaking(videos, now = Date.now()) {
  return videos
    .filter(video => video.section === 'breaking' || hasTag(video, 'breaking-panel'))
    .filter(video => {
      const time = publishedTime(video)
      return time && now - time <= BREAKING_WINDOW_HOURS * 60 * 60 * 1000 && time <= now + DAY_MS
    })
    .sort(newestFirst)
    .slice(0, 4)
}

export const JOIN_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdRQMvmPiVj1bT_l-Nh0IaplpyygUQgfHKp90AErUf2gKIqcQ/viewform?usp=header'

// Press coverage of TNN. Facts supplied by TNN leadership (2026-11-15).
export const PRESS_MENTIONS = [
  {
    outlet: 'New York Daily News',
    author: 'Cayla Bamberger',
    date: '2026-11-14',
    title: 'NYC specialized high schools admissions test plagued by technical issues',
    note: "Embedded TNN's SHSAT report.",
    url: 'https://www.nydailynews.com/2026/11/14/nyc-specialized-high-schools-admissions-test-technical-issues/',
  },
]
