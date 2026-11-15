import { supabase } from './supabase'
import { parseJsonArray } from './constants'

function parseCredits(rawCredits) {
  return parseJsonArray(rawCredits)
}

export function staffSlug(value = 'staff') {
  const source = typeof value === 'string'
    ? value
    : value?.full_name || value?.name || value?.id || 'staff'

  return String(source || 'staff')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'staff'
}

export function staffPath(profileOrCredit) {
  const slugSource = profileOrCredit?.full_name || profileOrCredit?.name || profileOrCredit?.id || profileOrCredit
  const slug = staffSlug(slugSource)
  return slug ? `/staff/${slug}/` : ''
}

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function creditRoles(credit) {
  const roles = parseJsonArray(credit?.roles).filter(Boolean)
  if (roles.length) return roles
  return credit?.role ? [credit.role] : []
}

export function creditRoleLabel(credit) {
  return creditRoles(credit).join(', ')
}

export function normalizeCredits(rawCredits = [], profiles = new Map()) {
  return parseCredits(rawCredits)
    .map(credit => {
      const profileId = credit.profile_id || credit.creator_id || credit.id || ''
      const profile = profileId ? profiles.get(profileId) : null
      const name = profile?.full_name || credit.name || credit.full_name || ''

      return {
        profile_id: profileId,
        name,
        slug: staffSlug(name || profileId),
        roles: creditRoles(credit),
        role: creditRoleLabel(credit),
        show: credit.show !== false,
      }
    })
    .filter(credit => credit.profile_id || credit.name || credit.role)
}

export function visibleCredits(video) {
  const credits = normalizeCredits(video?.credits)
    .filter(credit => credit.show !== false && (credit.name || credit.profile_id))

  if (credits.length) return credits

  const fallbackName = video?.creator?.full_name || video?.creator_name || video?.byline || ''
  if (!fallbackName && !video?.creator_id) return []

  return [{
    profile_id: video?.creator_id || '',
    name: fallbackName,
    role: '',
    show: true,
  }]
}

export function creatorName(video) {
  return visibleCredits(video).map(credit => credit.name).filter(Boolean).join(', ')
}

export function creatorPath(videoOrId) {
  if (typeof videoOrId === 'string') return staffPath(videoOrId)
  const credit = visibleCredits(videoOrId).find(item => item.profile_id || item.name)
  return credit ? staffPath(credit) : ''
}

export function creditPath(credit) {
  return credit?.profile_id || credit?.name ? staffPath(credit) : ''
}

export async function fetchCreatorsByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (!uniqueIds.length) return new Map()

  let data = null
  const publicResult = await supabase
    .from('public_profiles')
    .select('*')
    .in('id', uniqueIds)

  if (!publicResult.error) {
    data = publicResult.data
  } else {
    const fallbackResult = await supabase
      .from('profiles')
      .select('*')
      .in('id', uniqueIds)
    if (!fallbackResult.error) data = fallbackResult.data
  }

  return new Map((data || []).map(profile => [profile.id, profile]))
}

function profileIdsForVideos(videos) {
  return (videos || []).flatMap(video => [
    video.creator_id,
    ...parseCredits(video.credits).map(credit => credit.profile_id || credit.creator_id || credit.id),
  ])
}

export async function attachCreators(videos) {
  const map = await fetchCreatorsByIds(profileIdsForVideos(videos))
  return (videos || []).map(video => ({
    ...video,
    creator: video.creator_id ? map.get(video.creator_id) || null : null,
    credits: normalizeCredits(video.credits, map),
  }))
}

async function fetchProfileTableBySlug(table, slug) {
  const result = await supabase
    .from(table)
    .select('*')

  if (result.error) return null
  return (result.data || []).find(profile => staffSlug(profile) === slug) || null
}

export async function fetchCreatorById(idOrSlug) {
  if (!idOrSlug) return null

  const lookup = String(idOrSlug)

  if (!isUuid(lookup)) {
    const publicBySlug = await fetchProfileTableBySlug('public_profiles', staffSlug(lookup))
    if (publicBySlug) return publicBySlug

    const fallbackBySlug = await fetchProfileTableBySlug('profiles', staffSlug(lookup))
    return fallbackBySlug
  }

  const publicResult = await supabase
    .from('public_profiles')
    .select('*')
    .eq('id', lookup)
    .single()

  if (!publicResult.error) return publicResult.data

  const fallbackResult = await supabase
    .from('profiles')
    .select('*')
    .eq('id', lookup)
    .single()

  return fallbackResult.error ? null : fallbackResult.data
}
