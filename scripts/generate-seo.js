const fs = require('node:fs/promises')
const path = require('node:path')

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, 'public')
const SITE_URL = (process.env.VITE_SITE_URL || 'https://bthstnn.org').replace(/\/$/, '')
const BASE_ROUTES = ['/', '/about', '/videos', '/videos/breaking', '/videos/hardnews', '/videos/features', '/videos/weather', '/videos/sports', '/join', '/press']

function videoSlug(title = 'story') {
  return String(title || 'story')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'story'
}

function staffSlug(name = 'staff') {
  return String(name || 'staff')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'staff'
}

function readEnvFile() {
  return fs.readFile(path.join(ROOT, '.env'), 'utf8')
    .then(text => Object.fromEntries(text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })))
    .catch(() => ({}))
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function routeUrl(route) {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`
  const finalRoute = cleanRoute === '/' || cleanRoute.endsWith('/') ? cleanRoute : `${cleanRoute}/`
  return `${SITE_URL}${finalRoute}`
}

function youtubeId(url = '') {
  const match = String(url || '').match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || ''
}

function youtubeThumb(url) {
  const id = youtubeId(url)
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : ''
}

function thumbnailForVideo(video) {
  if (!video) return ''
  if (video.thumbnail && /^https?:\/\//i.test(video.thumbnail)) return video.thumbnail
  return youtubeThumb(video.href)
}

function runtimeToIso(runtime) {
  if (!runtime) return ''
  const str = String(runtime).trim()
  if (/^PT/i.test(str)) return str.toUpperCase()
  const parts = str.split(':').map(p => parseInt(p, 10))
  if (parts.some(Number.isNaN)) return ''
  let h = 0, m = 0, s = 0
  if (parts.length === 3) [h, m, s] = parts
  else if (parts.length === 2) [m, s] = parts
  else if (parts.length === 1) [s] = parts
  else return ''
  let iso = 'PT'
  if (h) iso += `${h}H`
  if (m) iso += `${m}M`
  if (s) iso += `${s}S`
  return iso === 'PT' ? '' : iso
}

function runtimeToSeconds(runtime) {
  if (!runtime) return ''
  const parts = String(runtime).split(':').map(p => parseInt(p, 10))
  if (parts.some(Number.isNaN)) return ''
  let h = 0, m = 0, s = 0
  if (parts.length === 3) [h, m, s] = parts
  else if (parts.length === 2) [m, s] = parts
  else if (parts.length === 1) [s] = parts
  return h * 3600 + m * 60 + s || ''
}

function isPublicVideo(video, now = new Date()) {
  if (!video?.published) return false
  const status = video.publish_status || (video.published ? 'published' : 'draft')
  if (status === 'draft' || status === 'archived') return false
  if (status === 'scheduled' && video.scheduled_at) return new Date(video.scheduled_at) <= now
  return status === 'published' || status === 'scheduled'
}

async function fetchPublicRows(table, query) {
  const env = { ...await readEnvFile(), ...process.env }
  const supabaseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey || typeof fetch !== 'function') throw new Error('Supabase configuration is required for a complete build')

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?${query}`
  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  })
  if (!response.ok) throw new Error(`Supabase returned ${response.status} for ${table}`)
  return response.json()
}

async function loadSeoData() {
  if (process.env.TNN_SEO_FIXTURE) {
    if (process.env.CI) throw new Error('Fixture SEO builds are forbidden in CI')
    const snapshot = JSON.parse(await fs.readFile(process.env.TNN_SEO_FIXTURE, 'utf8'))
    if (!Array.isArray(snapshot.videos) || !Array.isArray(snapshot.public_profiles)) throw new Error('Invalid local verification snapshot')
    return { videos: snapshot.videos.filter(isPublicVideo), profiles: snapshot.public_profiles }
  }
  try {
    const [videos, profiles] = await Promise.all([
      fetchPublicRows('videos', 'select=*&published=eq.true&order=display_order.asc,created_at.desc'),
      fetchPublicRows('public_profiles', 'select=id,full_name,public_role,public_title,public_description,public_headshot_url,public_socials,public_visible,public_order&order=public_order.asc,full_name.asc'),
    ])
    return {
      videos: (videos || []).filter(isPublicVideo),
      profiles: profiles || [],
    }
  } catch (error) {
    throw new Error(`Refusing an incomplete SEO build: ${error.message}`)
  }
}

function buildSitemap({ videos, profiles }) {
  const today = new Date().toISOString()
  const baseEntries = BASE_ROUTES.map(route => ({
    loc: routeUrl(route),
    priority: route === '/' ? '1.0' : '0.8',
    lastmod: today,
    extras: '',
  }))
  const profileEntries = profiles.map(profile => ({
    loc: routeUrl(`/staff/${staffSlug(profile.full_name || profile.id)}`),
    priority: '0.7',
    lastmod: today,
    extras: '',
  }))
  const videoEntries = videos.map(video => {
    const thumb = thumbnailForVideo(video)
    const description = (video.dek || `Watch ${video.title} from Tech News Network.`).slice(0, 2048)
    const duration = runtimeToSeconds(video.runtime)
    const publishedAt = video.scheduled_at || video.created_at || today
    const yt = youtubeId(video.href)
    const playerLoc = yt ? `https://www.youtube.com/embed/${yt}` : ''
    const contentLoc = (video.href && video.href !== '#pending-upload' && !playerLoc) ? video.href : ''
    const videoXml = (thumb && (contentLoc || playerLoc)) ? `
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumb)}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title || 'TNN Video')}</video:title>
      <video:description>${escapeXml(description)}</video:description>
      ${contentLoc ? `<video:content_loc>${escapeXml(contentLoc)}</video:content_loc>` : ''}
      ${playerLoc ? `<video:player_loc>${escapeXml(playerLoc)}</video:player_loc>` : ''}
      ${duration ? `<video:duration>${duration}</video:duration>` : ''}
      <video:publication_date>${escapeXml(new Date(publishedAt).toISOString())}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:live>no</video:live>
    </video:video>` : ''
    const imageXml = thumb ? `
    <image:image>
      <image:loc>${escapeXml(thumb)}</image:loc>
      <image:title>${escapeXml(video.title || 'TNN Video')}</image:title>
    </image:image>` : ''
    return {
      loc: routeUrl(`/videos/story/${video.id}/${videoSlug(video.title)}`),
      priority: '0.85',
      lastmod: video.updated_at || video.created_at || today,
      extras: `${imageXml}${videoXml}`,
    }
  })

  const entries = [...baseEntries, ...profileEntries, ...videoEntries]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.map(entry => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
    <priority>${entry.priority}</priority>${entry.extras}
  </url>`).join('\n')}
</urlset>
`
}

function buildRss({ videos }) {
  const items = [...videos].sort((a, b) => publishedTime(b) - publishedTime(a)).map(video => {
    const pubDate = publishedIso(video) || video.created_at || new Date().toISOString()
    const link = routeUrl(storyPath(video))
    return `    <item>
      <title>${escapeXml(video.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(video.id || link)}</guid>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      <description>${escapeXml(video.dek || video.title || '')}</description>
    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tech News Network Videos</title>
    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />
    <link>${escapeXml(SITE_URL)}</link>
    <description>Student-produced video journalism from Tech News Network at Brooklyn Tech.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items || `    <item>
      <title>Tech News Network</title>
      <link>${escapeXml(routeUrl('/videos'))}</link>
      <guid isPermaLink="false">tnn-videos</guid>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <description>Watch public videos from Tech News Network.</description>
    </item>`}
  </channel>
</rss>
`
}

// ---- Phase E prerender: real content in #root for crawlers and link previews ----
const SECTION_LABELS = { breaking: 'Breaking', hardnews: 'Hard News', features: 'Features', weather: 'Weather', sports: 'Sports', docs: 'Documentaries', opinion: 'Opinion', promo: 'From TNN' }
const NAV_SECTION_SLUGS = ['breaking', 'hardnews', 'features', 'weather', 'sports']
const TITLE_SUFFIX = ' | Tech News Network (TNN) — Brooklyn Tech'
const ORG_ID = `${SITE_URL}/#organization`
const ORG = { '@type': 'NewsMediaOrganization', '@id': ORG_ID, name: 'Tech News Network', logo: { '@type': 'ImageObject', url: `${SITE_URL}/tnn-logo.png` } }

function sectionName(slug) { return SECTION_LABELS[slug] || slug || 'Video' }
function storyPath(video) { return `/videos/story/${video.id}/${videoSlug(video.title)}/` }
function staffPathFor(profile) { return `/staff/${staffSlug(profile.full_name || profile.id)}/` }
function publishedTime(video) {
  const parsed = Date.parse(video?.date || '')
  const created = Date.parse(video?.created_at || '')
  // Same calendar day as created_at: use the precise timestamp.
  if (Number.isFinite(parsed) && Number.isFinite(created) && Math.abs(created - parsed) < 36 * 60 * 60 * 1000 && created >= parsed) return created
  if (Number.isFinite(parsed)) return parsed
  return Number.isFinite(created) ? created : 0
}
function publishedIso(video) { const t = publishedTime(video); return t ? new Date(t).toISOString() : undefined }
function publishedLabel(video) { const t = publishedTime(video); return t ? new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }) : '' }
function parseList(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') { try { const v = JSON.parse(value); return Array.isArray(v) ? v : [] } catch { return [] } }
  return []
}
function creditsFor(video, profilesById) {
  return parseList(video.credits)
    .filter(credit => credit && credit.show !== false && (credit.name || credit.profile_id))
    .map(credit => {
      const profile = credit.profile_id ? profilesById.get(credit.profile_id) : null
      const roles = [...new Set([...(Array.isArray(credit.roles) ? credit.roles : []), credit.role].filter(Boolean))]
      return { name: credit.name || profile?.full_name || 'TNN staff', roles, profile }
    })
}
function pageShell(baseHtml, { title, description, url, image, type = 'website', jsonLd, body }) {
  const img = image || `${SITE_URL}/og-image.jpg`
  const head = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${escapeHtml(type)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(img)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(img)}" />
    ${jsonLd ? `<script type="application/ld+json" data-prerender="page">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
  `
  const nav = `<header class="prerender-header"><a href="/">Tech News Network</a><nav aria-label="Primary navigation"><a href="/videos/">Videos</a> <a href="/about/">About</a> <a href="/join/">Join</a> <a href="/press/">In the News</a></nav><nav aria-label="Sections">${NAV_SECTION_SLUGS.map(s => `<a href="/videos/${s}/">${escapeHtml(sectionName(s))}</a>`).join(' ')}</nav></header>`
  const footer = `<footer class="prerender-footer"><p>Tech News Network, Brooklyn Technical High School</p><p><a href="/about/#staff">Masthead</a> · <a href="/press/">TNN in the News</a> · <a href="/join/">Join TNN</a> · <a href="/rss.xml">RSS</a></p></footer>`
  const cleaned = baseHtml
    .replace(/\s*<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace(/\s*<link rel="canonical"[^>]*>/, '')
    .replace(/\s*<meta name="robots"[^>]*>/, '')
    .replace(/\s*<meta (?:property="og:[a-z:_]+"|name="twitter:[a-z:]+")[^>]*>/g, '')
  return cleaned
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root"><div class="prerender">${nav}<main>${body}</main>${footer}</div></div>`)
}
function storyListHtml(videos, limit = 60) {
  return `<ol class="prerender-list">${videos.slice(0, limit).map(v => `<li><a href="${escapeHtml(storyPath(v))}">${escapeHtml(v.title)}</a> <span>${escapeHtml(sectionName(v.section))}${publishedLabel(v) ? ` · ${escapeHtml(publishedLabel(v))}` : ''}</span></li>`).join('')}</ol>`
}
const newestFirst = (a, b) => publishedTime(b) - publishedTime(a)

function buildStoryPrerender(baseHtml, video, ctx) {
  const url = routeUrl(storyPath(video))
  const description = (video.dek || `Watch ${video.title || 'this TNN story'} from Tech News Network, Brooklyn Tech's student-run video newsroom.`).slice(0, 320)
  const thumb = thumbnailForVideo(video) || `${SITE_URL}/og-image.jpg`
  const yt = youtubeId(video.href)
  const contentUrl = video.href && video.href !== '#pending-upload' ? video.href : ''
  const credits = creditsFor(video, ctx.profilesById)
  const authors = credits.map(c => ({ '@type': 'Person', name: c.name, jobTitle: c.roles.join(', ') || undefined, url: c.profile ? routeUrl(staffPathFor(c.profile)) : undefined }))
  const datePublished = publishedIso(video)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'VideoObject', name: video.title, description, thumbnailUrl: [thumb], uploadDate: datePublished || video.created_at, duration: runtimeToIso(video.runtime) || undefined, url, contentUrl: contentUrl || undefined, embedUrl: yt ? `https://www.youtube.com/embed/${yt}` : undefined, transcript: video.transcript || undefined, publisher: ORG },
      { '@type': 'NewsArticle', headline: video.title, description, image: [thumb], datePublished, dateModified: video.updated_at || datePublished, mainEntityOfPage: url, author: authors.length ? authors : [ORG], publisher: ORG },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Videos', item: routeUrl('/videos/') },
        { '@type': 'ListItem', position: 2, name: sectionName(video.section), item: routeUrl(`/videos/${video.section}/`) },
        { '@type': 'ListItem', position: 3, name: video.title, item: url },
      ] },
    ],
  }
  const related = ctx.videos.filter(v => v.section === video.section && v.id !== video.id).sort(newestFirst).slice(0, 3)
  const body = `<article class="prerender-story">
    <nav aria-label="Breadcrumb"><a href="/videos/">Videos</a> › <a href="/videos/${escapeHtml(video.section)}/">${escapeHtml(sectionName(video.section))}</a></nav>
    <p class="prerender-kicker">${escapeHtml(sectionName(video.section))}</p>
    <h1>${escapeHtml(video.title || 'TNN Story')}</h1>
    ${video.dek ? `<p class="prerender-dek">${escapeHtml(video.dek)}</p>` : ''}
    <p class="prerender-meta">${datePublished ? `Published <time datetime="${escapeHtml(datePublished)}">${escapeHtml(publishedLabel(video))}</time>` : ''}${video.runtime ? ` · ${escapeHtml(video.runtime)}` : ''}</p>
    <img src="${escapeHtml(thumb)}" alt="${escapeHtml(video.thumbnail_alt || '')}" width="720" height="900" />
    ${contentUrl ? `<p><a href="${escapeHtml(contentUrl)}" rel="noopener">Watch on ${/instagram\.com/.test(contentUrl) ? 'Instagram' : /youtu/.test(contentUrl) ? 'YouTube' : 'the original platform'}</a></p>` : ''}
    <section aria-labelledby="credits-h"><h2 id="credits-h">Credits</h2>${credits.length ? `<ul>${credits.map(c => `<li>${c.profile ? `<a href="${escapeHtml(staffPathFor(c.profile))}">${escapeHtml(c.name)}</a>` : escapeHtml(c.name)}${c.roles.length ? ` — ${escapeHtml(c.roles.join(', '))}` : ''}</li>`).join('')}</ul>` : '<p>No public credits listed yet.</p>'}</section>
    ${video.transcript ? `<details><summary>Transcript</summary><p>${escapeHtml(video.transcript)}</p></details>` : ''}
    ${related.length ? `<section aria-labelledby="related-h"><h2 id="related-h">More ${escapeHtml(sectionName(video.section))}</h2>${storyListHtml(related)}</section>` : ''}
  </article>`
  return pageShell(baseHtml, { title: `${video.title || 'TNN Story'}${TITLE_SUFFIX}`, description, url, image: thumb, type: 'video.other', jsonLd, body })
}

function staffRole(profile) {
  return profile.public_title || ({ exec: 'Executive', associate: 'Junior Executive', member: 'Member' }[profile.public_role]) || 'Member'
}

function buildStaffPrerender(baseHtml, profile, ctx) {
  const name = profile.full_name || 'TNN Staff'
  const url = routeUrl(staffPathFor(profile))
  const role = staffRole(profile)
  const description = (profile.public_description || `${name} is part of Tech News Network, Brooklyn Tech's student-run video newsroom.`).slice(0, 320)
  const socials = profile.public_socials && typeof profile.public_socials === 'object' ? Object.values(profile.public_socials).filter(v => typeof v === 'string' && /^https?:\/\//.test(v)) : []
  const stories = ctx.videos.filter(v => parseList(v.credits).some(c => c && c.profile_id === profile.id && c.show !== false)).sort(newestFirst)
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Person', name, jobTitle: role, url, description: profile.public_description || undefined, image: profile.public_headshot_url || undefined, sameAs: socials.length ? socials : undefined, worksFor: ORG, mainEntityOfPage: url }
  const body = `<article><p><a href="/about/#staff">All staff</a></p><h1>${escapeHtml(name)}</h1><p><strong>${escapeHtml(role)}</strong></p>${profile.public_description ? `<p>${escapeHtml(profile.public_description)}</p>` : ''}
    <section><h2>Stories by ${escapeHtml(name)}</h2>${stories.length ? storyListHtml(stories) : '<p>No public stories yet.</p>'}</section></article>`
  return pageShell(baseHtml, { title: `${name} — TNN Staff${TITLE_SUFFIX}`, description, url, image: profile.public_headshot_url, type: 'profile', jsonLd, body })
}

function buildHomePrerender(baseHtml, ctx) {
  const latest = [...ctx.videos].sort(newestFirst)
  const body = `<h1>Tech News Network</h1><p>Brooklyn Tech's student-run video newsroom.</p>
    <section><h2>Latest stories</h2>${storyListHtml(latest, 12)}</section>
    <section><h2>Stories by section</h2><ul>${NAV_SECTION_SLUGS.map(s => `<li><a href="/videos/${s}/">${escapeHtml(sectionName(s))}</a></li>`).join('')}</ul></section>`
  return pageShell(baseHtml, { title: 'Tech News Network (TNN) — Brooklyn Tech student video newsroom', description: "Student-produced video journalism from Tech News Network, Brooklyn Technical High School's student-run newsroom.", url: routeUrl('/'), body, jsonLd: ctx.orgJsonLd })
}

function buildVideosPrerender(baseHtml, ctx, section) {
  const list = ctx.videos.filter(v => !section || v.section === section).sort(newestFirst)
  const name = section ? sectionName(section) : 'All Videos'
  const path = section ? `/videos/${section}/` : '/videos/'
  const jsonLd = { '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: routeUrl(path), isPartOf: { '@id': ORG_ID }, mainEntity: { '@type': 'ItemList', itemListElement: list.slice(0, 50).map((v, i) => ({ '@type': 'ListItem', position: i + 1, url: routeUrl(storyPath(v)), name: v.title })) } }
  const body = `<h1>${escapeHtml(name)}</h1><nav aria-label="Filter by section"><a href="/videos/">All</a> ${NAV_SECTION_SLUGS.map(s => `<a href="/videos/${s}/">${escapeHtml(sectionName(s))}</a>`).join(' ')}</nav><p>${list.length} video${list.length === 1 ? '' : 's'}</p>${list.length ? storyListHtml(list, 200) : '<p>No stories in this section yet.</p>'}`
  return pageShell(baseHtml, { title: `${name}${TITLE_SUFFIX}`, description: section ? `${name} videos from Tech News Network, Brooklyn Tech's student-run newsroom.` : "Every public video from Tech News Network, Brooklyn Tech's student-run newsroom.", url: routeUrl(path), body, jsonLd })
}

function buildAboutPrerender(baseHtml, ctx) {
  const groups = [['exec', 'Executives'], ['associate', 'Junior Executives'], ['member', 'Members']]
  const staffHtml = groups.map(([role, label]) => {
    const people = ctx.profiles.filter(p => (p.public_role || 'member') === role)
    return people.length ? `<section><h3>${label}</h3><ul class="prerender-staff">${people.map(p => `<li><a href="${escapeHtml(staffPathFor(p))}">${escapeHtml(p.full_name)}</a> — ${escapeHtml(staffRole(p))}</li>`).join('')}</ul></section>` : ''
  }).join('')
  const body = `<h1>Tech News Network</h1><p>TNN is Brooklyn Tech's student-run broadcast newsroom. Student journalists produce each story from the first pitch through final publication.</p>
    <section><h2>Partnered with</h2><ul><li><a href="https://journalism.columbia.edu/">Columbia University Graduate School of Journalism</a></li><li><a href="https://surveybths.com/">The Survey, Brooklyn Tech's student newspaper</a></li></ul></section>
    <section id="staff"><h2>TNN staff</h2>${staffHtml}</section>
    <p><a href="mailto:bthstnn@gmail.com">Contact TNN</a> · <a href="/join/">Join TNN</a></p>`
  const jsonLd = { '@context': 'https://schema.org', '@type': 'AboutPage', url: routeUrl('/about/'), mainEntity: { '@id': ORG_ID }, about: ctx.orgJsonLd }
  return pageShell(baseHtml, { title: `About TNN${TITLE_SUFFIX}`, description: "Who runs Tech News Network, Brooklyn Tech's student-run video newsroom: executives, junior executives and members.", url: routeUrl('/about/'), body, jsonLd })
}

function buildJoinPrerender(baseHtml) {
  const body = `<h1>Join TNN</h1><p>Tech News Network is run by students. Students pitch, report, film, edit, and publish TNN's coverage.</p><ul><li>Pre-production: pitches, research, scripts, scheduling.</li><li>Production: anchoring, interviews, camera work, directing.</li><li>Post-production: editing, graphics, audio, publishing.</li></ul><p><a href="https://docs.google.com/forms/d/e/1FAIpQLSdRQMvmPiVj1bT_l-Nh0IaplpyygUQgfHKp90AErUf2gKIqcQ/viewform?usp=header">Open the TNN interest form</a></p>`
  return pageShell(baseHtml, { title: `Join TNN${TITLE_SUFFIX}`, description: "How Brooklyn Tech students can join Tech News Network, the school's student-run video newsroom.", url: routeUrl('/join/'), body })
}

function buildPressPrerender(baseHtml) {
  const press = [{ outlet: 'New York Daily News', author: 'Cayla Bamberger', date: '2026-11-14', label: 'November 14, 2026', title: 'NYC specialized high schools admissions test plagued by technical issues', url: 'https://www.nydailynews.com/2026/11/14/nyc-specialized-high-schools-admissions-test-technical-issues/' }]
  const body = `<h1>TNN in the news</h1><ol>${press.map(p => `<li><strong>${escapeHtml(p.outlet)}</strong>: <a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a> — ${escapeHtml(p.author)}, <time datetime="${p.date}">${p.label}</time>. Embedded TNN's SHSAT report.</li>`).join('')}</ol>`
  return pageShell(baseHtml, { title: `TNN in the News${TITLE_SUFFIX}`, description: "News coverage that has cited or embedded Tech News Network's reporting.", url: routeUrl('/press/'), body })
}

function buildOrgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    '@id': ORG_ID,
    name: 'Tech News Network',
    alternateName: ['TNN', 'Brooklyn Tech News Network'],
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/tnn-logo.png` },
    sameAs: ['https://www.youtube.com/@tnn_bths', 'https://www.instagram.com/tnn_bths/'],
    parentOrganization: { '@type': 'EducationalOrganization', name: 'Brooklyn Technical High School' },
    masthead: `${SITE_URL}/about/#staff`,
    // publishingPrinciples / correctionsPolicy / ethicsPolicy -> /standards once adviser-approved and published.
    // foundingDate: {{TODO: founding date}}
  }
}

async function writePage(distDir, route, html) {
  const dir = path.join(distDir, ...route.split('/').filter(Boolean))
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'index.html'), html)
}

async function writePrerenders({ videos, profiles }) {
  const distDir = path.join(ROOT, 'dist')
  const distExists = await fs.stat(distDir).then(() => true).catch(() => false)
  if (!distExists) {
    console.log('[seo] dist/ not built yet — skipping prerenders (postbuild will handle them)')
    return { story: 0, staff: 0, pages: 0 }
  }
  const baseHtml = await fs.readFile(path.join(distDir, 'index.html'), 'utf8').catch(() => '')
  if (!baseHtml) throw new Error('dist/index.html not found')
  const visibleProfiles = profiles.filter(p => p.public_visible !== false && p.full_name)
  const ctx = { videos, profiles: visibleProfiles, profilesById: new Map(visibleProfiles.map(p => [p.id, p])), orgJsonLd: buildOrgJsonLd() }

  let story = 0
  for (const video of videos) {
    const html = buildStoryPrerender(baseHtml, video, ctx)
    await writePage(distDir, storyPath(video), html)
    // Inbound URL from the one-time C1 hotfix (story was retitled).
    if (video.id === 'bf62c27a-fd91-4f89-9801-b64d2f0c976e') await writePage(distDir, `/videos/story/${video.id}/11-14-shsat-canceled/`, html)
    story += 1
  }
  let staff = 0
  for (const profile of visibleProfiles) {
    await writePage(distDir, staffPathFor(profile), buildStaffPrerender(baseHtml, profile, ctx))
    staff += 1
  }
  const pages = [
    ['/', buildHomePrerender(baseHtml, ctx)],
    ['/about/', buildAboutPrerender(baseHtml, ctx)],
    ['/videos/', buildVideosPrerender(baseHtml, ctx, '')],
    ...Object.keys(SECTION_LABELS).map(s => [`/videos/${s}/`, buildVideosPrerender(baseHtml, ctx, s)]),
    ['/join/', buildJoinPrerender(baseHtml)],
    ['/press/', buildPressPrerender(baseHtml)],
  ]
  for (const [route, html] of pages) {
    if (route === '/') await fs.writeFile(path.join(distDir, 'index.html'), html)
    else await writePage(distDir, route, html)
  }
  return { story, staff, pages: pages.length }
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true })
  const data = await loadSeoData()
  await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), buildSitemap(data))
  await fs.writeFile(path.join(PUBLIC_DIR, 'rss.xml'), buildRss(data))
  await fs.writeFile(path.join(PUBLIC_DIR, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /login
Disallow: /newsroom
Disallow: /cms

Sitemap: ${SITE_URL}/sitemap.xml
`)
  const counts = await writePrerenders(data)
  console.log(`[seo] sitemap/RSS/robots written (${data.videos.length} videos, ${data.profiles.length} profiles); prerendered ${counts.story} story + ${counts.staff} staff + ${counts.pages} section/static pages`)
}

main().catch(error => {
  console.error(`[seo] Failed to generate SEO files: ${error.message}`)
  process.exitCode = 1
})
