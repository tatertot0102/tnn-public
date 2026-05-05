export const SECTIONS = [
  { value: 'hardnews', label: 'Hard News' },
  { value: 'features', label: 'Features' },
  { value: 'breaking', label: 'Breaking' },
  { value: 'docs', label: 'Docs' },
  { value: 'opinion', label: 'Opinion' },
  { value: 'sports', label: 'Sports' },
  { value: 'promo', label: 'Promo' },
  { value: 'catalog', label: 'Catalog' },
]

export const PLACEMENTS = [
  { value: 'hero', label: 'Hero' },
  { value: 'breaking-panel', label: 'Breaking Panel' },
  { value: 'homepage-catalog', label: 'Homepage Catalog' },
  { value: 'section-featured', label: 'Section Featured' },
]

export const DEFAULT_PLACEMENT = 'section-item'

export const SECTION_COLORS = {
  hardnews: '#c0392b',
  features: '#2563eb',
  breaking: '#c0392b',
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

export function getYoutubeThumbnail(url) {
  if (!url) return null
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  return null
}

export function isInstagramUrl(url) {
  return Boolean(url?.includes('instagram.com'))
}

export async function getInstagramThumbnail(url) {
  if (!isInstagramUrl(url)) return null

  const endpoint = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=false&video=false&audio=false`
  const response = await fetch(endpoint)
  if (!response.ok) return null

  const result = await response.json()
  return result?.data?.image?.url || result?.data?.logo?.url || null
}
