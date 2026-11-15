export const SECTIONS = [
  { value: 'hardnews', label: 'Hard News' },
  { value: 'features', label: 'Features' },
  { value: 'breaking', label: 'Breaking' },
  { value: 'docs', label: 'Docs' },
  { value: 'weather', label: 'Weather' },
  { value: 'sports', label: 'Sports' },
  { value: 'promo', label: 'Promo' },
  { value: 'catalog', label: 'Catalog' },
]

export const PLACEMENTS = [
  { value: 'hero', label: 'Hero' },
  { value: 'trending', label: 'Trending' },
  { value: 'breaking-panel', label: 'Breaking Panel' },
  { value: 'homepage-catalog', label: 'Homepage Catalog' },
  { value: 'section-featured', label: 'Section Featured' },
]

export const DEFAULT_PLACEMENT = 'section-item'

export const PUBLISH_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export const SECTION_COLORS = {
  hardnews: '#0047AB',
  features: '#2563eb',
  breaking: '#003a8c',
  docs: '#0f766e',
  opinion: '#7c3aed',
  sports: '#f59e0b',
  promo: '#9333ea',
  catalog: '#64748b',
}

export const PRIMARY_ROLES = ['Reporter', 'Anchor', 'Camera Op', 'Editor']
export const SECONDARY_ROLES = ['Graphic Designer', 'Producer', 'Sound', 'Director', 'Script Writer']

export function parseJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function normalizePlacements(videoOrPlacements) {
  const rawPlacements = Array.isArray(videoOrPlacements) || typeof videoOrPlacements === 'string'
    ? videoOrPlacements
    : videoOrPlacements?.placements
  const placements = parseJsonArray(rawPlacements).filter(Boolean)
  const legacyPlacement = typeof videoOrPlacements === 'object' ? videoOrPlacements?.placement : ''
  const all = [...placements, legacyPlacement].filter(value => value && value !== DEFAULT_PLACEMENT)
  return [...new Set(all)]
}

export function hasPlacement(video, placement) {
  return normalizePlacements(video).includes(placement)
}

export function primaryPlacement(placements) {
  return normalizePlacements(placements)[0] || DEFAULT_PLACEMENT
}

export const PRIORITIES = {
  low: { label: 'Low', color: 'bg-slate-800 text-slate-300' },
  medium: { label: 'Medium', color: 'bg-yellow-900 text-yellow-300' },
  high: { label: 'High', color: 'bg-red-900 text-red-300' },
}

export const STATUSES = {
  pitch: { label: 'Pitch', color: 'bg-slate-800 text-slate-300' },
  preproduction: { label: 'Pre-production', color: 'bg-blue-900 text-blue-300' },
  production: { label: 'Production', color: 'bg-yellow-900 text-yellow-300' },
  postproduction: { label: 'Post-production', color: 'bg-orange-900 text-orange-300' },
  review: { label: 'In Review', color: 'bg-purple-900 text-purple-300' },
  done: { label: 'Done', color: 'bg-green-900 text-green-300' },
}

export const DEPARTMENTS = {
  video: { label: 'Video', color: 'bg-blue-900 text-blue-300' },
  writing: { label: 'Writing', color: 'bg-purple-900 text-purple-300' },
  design: { label: 'Design', color: 'bg-pink-900 text-pink-300' },
  audio: { label: 'Audio', color: 'bg-orange-900 text-orange-300' },
  social: { label: 'Social', color: 'bg-green-900 text-green-300' },
}

export function getPlatform(url) {
  if (!url) return null
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
  if (url.includes('instagram.com')) return 'Instagram'
  return 'Web'
}

export function getYoutubeVideoId(url) {
  if (!url) return ''

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || ''
    if (host.endsWith('youtube.com')) {
      if (parsed.searchParams.get('v')) return parsed.searchParams.get('v')
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1] || ''
    }
  } catch {
    const match = String(url).match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/)
    return match?.[1] || ''
  }

  return ''
}

export function getYoutubeThumbnailCandidates(url) {
  const id = getYoutubeVideoId(url)
  if (!id) return []

  return [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  ]
}

export function getYoutubeThumbnail(url) {
  const candidates = getYoutubeThumbnailCandidates(url)
  return candidates[2] || null
}

export function isInstagramUrl(url) {
  return Boolean(url?.includes('instagram.com'))
}

export function isTemporaryInstagramCdnUrl(url) {
  if (!url) return false
  const value = String(url).toLowerCase()
  return value.includes('cdninstagram.com') || value.includes('fbcdn.net')
}

export function safeThumbnailUrl(url) {
  if (!url) return ''
  if (isTemporaryInstagramCdnUrl(url)) return ''
  return url
}

export function thumbnailForVideo(video) {
  return (
    safeThumbnailUrl(video?.thumbnail) ||
    getYoutubeThumbnail(video?.href) ||
    getInstagramThumbnailEmbedUrl(video?.href) ||
    ''
  )
}

export function getInstagramThumbnailEmbedUrl(url) {
  if (!isInstagramUrl(url)) return ''
  const params = new URLSearchParams({
    url,
    embed: 'image.url',
    screenshot: 'false',
    video: 'false',
    audio: 'false',
  })
  return `https://api.microlink.io/?${params.toString()}`
}

export function thumbnailCandidatesForVideo(video) {
  const candidates = []
  const savedThumbnail = safeThumbnailUrl(video?.thumbnail)
  if (savedThumbnail) candidates.push(savedThumbnail)

  candidates.push(...getYoutubeThumbnailCandidates(video?.href))

  const instagramFallback = getInstagramThumbnailEmbedUrl(video?.href)
  if (instagramFallback) candidates.push(instagramFallback)

  return [...new Set(candidates.filter(Boolean))]
}

const MONTHS = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
}

export function parseVideoDisplayDate(value) {
  if (!value || typeof value !== 'string') return null
  const clean = value.trim()
  const namedMonth = clean.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)

  if (namedMonth) {
    const month = MONTHS[namedMonth[1].toLowerCase()]
    const day = Number(namedMonth[2])
    const year = Number(namedMonth[3])
    if (month === undefined || day < 1 || day > 31 || year < 1900) return null

    const date = new Date(Date.UTC(year, month, day))
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month ||
      date.getUTCDate() !== day
    ) {
      return null
    }
    return date.getTime()
  }

  const fallback = Date.parse(clean)
  return Number.isNaN(fallback) ? null : fallback
}

function parseStoredTimestamp(value) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

export function videoDisplayTimestamp(video) {
  return (
    parseVideoDisplayDate(video?.date) ??
    parseStoredTimestamp(video?.created_at) ??
    parseStoredTimestamp(video?.scheduled_at) ??
    0
  )
}

export function compareVideosByDisplayDate(a, b) {
  return videoDisplayTimestamp(b) - videoDisplayTimestamp(a)
}

export function compareVideosByCmsDate(a, b) {
  const aTime = parseVideoDisplayDate(a?.date)
  const bTime = parseVideoDisplayDate(b?.date)

  if (aTime !== null && bTime !== null && aTime !== bTime) return bTime - aTime
  if (aTime !== null && bTime === null) return -1
  if (aTime === null && bTime !== null) return 1

  return String(a?.title || '').localeCompare(String(b?.title || ''))
}

export function publishStatusForVideo(video) {
  if (video?.publish_status) return video.publish_status
  if (video?.upload_status === 'planned') return 'scheduled'
  return video?.published ? 'published' : 'draft'
}

export function isPublicVideo(video, now = new Date()) {
  if (!video?.published) return false
  const status = publishStatusForVideo(video)
  if (status === 'draft' || status === 'archived') return false
  if (status === 'scheduled' && video.scheduled_at) {
    return new Date(video.scheduled_at) <= now
  }
  return status === 'published' || status === 'scheduled'
}

export async function getInstagramThumbnail(url) {
  if (!isInstagramUrl(url)) return null

  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=false&video=false&audio=false`
  const response = await fetch(endpoint)
  if (!response.ok) return null

  const result = await response.json()
  const imageUrl = result?.data?.image?.url || null
  if (
    !imageUrl ||
    imageUrl.includes('instagram.com/static/images/ico') ||
    imageUrl.includes('glyph-logo') ||
    isTemporaryInstagramCdnUrl(imageUrl)
  ) {
    return null
  }
  return imageUrl
}
