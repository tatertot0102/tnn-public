import { supabase } from './supabase'
import { parseJsonArray } from './constants'

function parseCredits(rawCredits) {
  return parseJsonArray(rawCredits)
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
  const id = typeof videoOrId === 'string'
    ? videoOrId
    : visibleCredits(videoOrId).find(credit => credit.profile_id)?.profile_id || videoOrId?.creator_id
  return id ? `/creators/${id}` : ''
}

export function creditPath(credit) {
  return credit?.profile_id ? `/creators/${credit.profile_id}` : ''
}

export async function fetchCreatorsByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (!uniqueIds.length) return new Map()

  let data = null
  const publicResult = await supabase
    .from('public_profiles')
    .select('id, full_name, role')
    .in('id', uniqueIds)

  if (!publicResult.error) {
    data = publicResult.data
  } else {
    const fallbackResult = await supabase
      .from('profiles')
      .select('id, full_name, role')
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

export async function fetchCreatorById(id) {
  if (!id) return null

  const publicResult = await supabase
    .from('public_profiles')
    .select('id, full_name, role')
    .eq('id', id)
    .single()

  if (!publicResult.error) return publicResult.data

  const fallbackResult = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', id)
    .single()

  return fallbackResult.error ? null : fallbackResult.data
}
