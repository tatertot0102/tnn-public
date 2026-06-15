const fs = require('node:fs/promises')
const path = require('node:path')

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, 'public')
const SITE_URL = (process.env.VITE_SITE_URL || 'https://bthstnn.org').replace(/\/$/, '')
const BASE_ROUTES = ['/', '/about', '/videos', '/videos/hardnews', '/videos/features', '/videos/breaking', '/videos/docs', '/videos/opinion', '/videos/sports']

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
  if (!supabaseUrl || !anonKey || typeof fetch !== 'function') return []

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
  try {
    const [videos, profiles] = await Promise.all([
      fetchPublicRows('videos', 'select=*&published=eq.true&order=display_order.asc,created_at.desc'),
      fetchPublicRows('public_profiles', 'select=id,full_name,public_role,public_title,public_description,public_order&order=public_order.asc,full_name.asc'),
    ])
    return {
      videos: (videos || []).filter(isPublicVideo),
      profiles: profiles || [],
    }
  } catch (error) {
    console.warn(`[seo] Using fallback sitemap/RSS: ${error.message}`)
    return { videos: [], profiles: [] }
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
  const items = videos.slice(0, 30).map(video => {
    const pubDate = video.scheduled_at || video.created_at || new Date().toISOString()
    const link = video.href || routeUrl('/videos')
    return `    <item>
      <title>${escapeXml(video.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(video.id || link)}</guid>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      <description>${escapeXml(video.dek || video.title || '')}</description>
    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tech News Network Videos</title>
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

function buildStoryPrerender(baseHtml, video) {
  if (!baseHtml) return ''
  const url = routeUrl(`/videos/story/${video.id}/${videoSlug(video.title)}`)
  const title = `${video.title || 'TNN Story'} | TNN`
  const description = (video.dek || `Watch ${video.title || 'this TNN story'} from Tech News Network, Brooklyn Tech's student-run video newsroom.`).slice(0, 320)
  const thumb = thumbnailForVideo(video) || `${SITE_URL}/og-image.jpg`
  const yt = youtubeId(video.href)
  const contentUrl = video.href && video.href !== '#pending-upload' ? video.href : ''
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description,
    thumbnailUrl: [thumb],
    uploadDate: video.created_at || new Date().toISOString(),
    duration: runtimeToIso(video.runtime) || undefined,
    url,
    contentUrl: contentUrl || undefined,
    embedUrl: yt ? `https://www.youtube.com/embed/${yt}` : undefined,
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: 'Tech News Network',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/tnn-logo.png` },
    },
  }
  const head = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="video.other" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(thumb)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(thumb)}" />
    <script type="application/ld+json" data-prerender="story">${JSON.stringify(jsonLd)}</script>
  `
  const noscript = `
    <noscript>
      <article>
        <h1>${escapeHtml(video.title || 'TNN Story')}</h1>
        <p>${escapeHtml(description)}</p>
        ${contentUrl ? `<p><a href="${escapeHtml(contentUrl)}">Watch this story</a></p>` : ''}
        ${thumb ? `<p><img src="${escapeHtml(thumb)}" alt="${escapeHtml(video.title || 'TNN Story')}" width="1200" height="675" /></p>` : ''}
      </article>
    </noscript>
  `
  return baseHtml
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${noscript}</div>`)
}

function buildStaffPrerender(baseHtml, profile) {
  if (!baseHtml) return ''
  const name = profile.full_name || 'TNN Staff'
  const url = routeUrl(`/staff/${staffSlug(profile.full_name || profile.id)}`)
  const title = `${name} | TNN Staff Profile | Brooklyn Tech`
  const description = (profile.public_description || `${name} is part of Tech News Network, Brooklyn Tech's student-run video newsroom.`).slice(0, 320)
  const role = profile.public_title || profile.public_role || 'TNN Contributor'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: role,
    url,
    worksFor: { '@type': 'NewsMediaOrganization', name: 'Tech News Network' },
    mainEntityOfPage: url,
  }
  const head = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <script type="application/ld+json" data-prerender="staff">${JSON.stringify(jsonLd)}</script>
  `
  const noscript = `
    <noscript>
      <article>
        <h1>${escapeHtml(name)}</h1>
        <p><strong>${escapeHtml(role)}</strong></p>
        <p>${escapeHtml(description)}</p>
      </article>
    </noscript>
  `
  return baseHtml
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${noscript}</div>`)
}

async function writePrerenders({ videos, profiles }) {
  const distDir = path.join(ROOT, 'dist')
  const distExists = await fs.stat(distDir).then(() => true).catch(() => false)
  if (!distExists) {
    console.log('[seo] dist/ not built yet — skipping prerenders (postbuild will handle them)')
    return { story: 0, staff: 0 }
  }
  const baseHtml = await fs.readFile(path.join(distDir, 'index.html'), 'utf8').catch(() => '')
  if (!baseHtml) {
    console.warn('[seo] dist/index.html not found — skipping prerenders')
    return { story: 0, staff: 0 }
  }

  let story = 0
  for (const video of videos) {
    const dir = path.join(distDir, 'videos', 'story', String(video.id), videoSlug(video.title))
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'index.html'), buildStoryPrerender(baseHtml, video))
    story += 1
  }

  let staff = 0
  for (const profile of profiles) {
    const slug = staffSlug(profile.full_name || profile.id)
    const dir = path.join(distDir, 'staff', slug)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'index.html'), buildStaffPrerender(baseHtml, profile))
    staff += 1
  }

  return { story, staff }
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
  console.log(`[seo] sitemap/RSS/robots written (${data.videos.length} videos, ${data.profiles.length} profiles); prerendered ${counts.story} story + ${counts.staff} staff pages`)
}

main().catch(error => {
  console.warn(`[seo] Failed to generate SEO files: ${error.message}`)
})
