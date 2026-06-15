export function videoSlug(title = 'story') {
  return String(title || 'story')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'story'
}

export function storyPath(video) {
  if (!video?.id) return '/videos/'
  return `/videos/story/${video.id}/${videoSlug(video.title)}/`
}

export function runtimeToIso8601(runtime) {
  if (!runtime) return undefined
  const str = String(runtime).trim()
  if (/^PT/i.test(str)) return str.toUpperCase()
  const parts = str.split(':').map(p => parseInt(p, 10))
  if (parts.some(Number.isNaN)) return undefined
  let h = 0, m = 0, s = 0
  if (parts.length === 3) [h, m, s] = parts
  else if (parts.length === 2) [m, s] = parts
  else if (parts.length === 1) [s] = parts
  else return undefined
  let iso = 'PT'
  if (h) iso += `${h}H`
  if (m) iso += `${m}M`
  if (s) iso += `${s}S`
  return iso === 'PT' ? undefined : iso
}
