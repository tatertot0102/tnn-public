import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { Modal, Field, SectionBadge, Spinner } from '../../components/ui'
import { AutoThumbnail } from '../../components/public/AutoThumbnail'
import {
  SECTIONS,
  PLACEMENTS,
  PUBLISH_STATUSES,
  getInstagramThumbnailEmbedUrl,
  getYoutubeThumbnail,
  hasPlacement,
  isTemporaryInstagramCdnUrl,
  isInstagramUrl,
  normalizePlacements,
  primaryPlacement,
  publishStatusForVideo,
} from '../../lib/constants'
import { Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff, ImageDown, Upload } from 'lucide-react'

const THUMBNAIL_BUCKET = 'video-thumbnails'
const THUMBNAIL_MAX_WIDTH = 1280
const THUMBNAIL_MAX_HEIGHT = 720

const EMPTY = {
  section: '', placement: 'section-item', title: '', href: '',
  thumbnail: '', dek: '', byline: '', runtime: '', date: '',
  display_order: 0, published: true, hero_variant: 'mosaic',
  segment_id: '', segment_title: '', upload_status: 'published',
  publish_status: 'published', scheduled_at: '',
  creator_id: '', credits: [], placements: [],
}

const PLACEMENT_LABELS = Object.fromEntries(PLACEMENTS.map(placement => [placement.value, placement.label]))

const CREDIT_ROLES = [
  'Reporter',
  'Anchor',
  'Producer',
  'Editor',
  'Camera',
  'Writer',
  'Designer',
  'Contributor',
]

function parseCredits(rawCredits) {
  if (!rawCredits) return []
  if (Array.isArray(rawCredits)) return rawCredits
  if (typeof rawCredits === 'string') {
    try {
      const parsed = JSON.parse(rawCredits)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function normalizeRoles(credit) {
  if (Array.isArray(credit?.roles)) return credit.roles.filter(Boolean)
  if (credit?.role) return [credit.role]
  return []
}

function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function slugify(value = 'thumbnail') {
  return String(value || 'thumbnail')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'thumbnail'
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function imageToElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image file.'))
    }
    image.src = url
  })
}

async function prepareThumbnailUpload(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Choose a JPG, PNG, or WebP image.')
  }

  const image = await imageToElement(file)
  const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / image.width, THUMBNAIL_MAX_HEIGHT / image.height)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, width, height)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.84))
  if (!blob) {
    return {
      body: file,
      extension: file.name?.split('.').pop() || 'jpg',
      contentType: file.type || 'image/jpeg',
    }
  }

  return {
    body: blob,
    extension: 'webp',
    contentType: 'image/webp',
  }
}

export default function VideoCMSPage() {
  const { profile } = useAuth()
  const isExec = profile?.role === 'exec'
  const [searchParams, setSearchParams] = useSearchParams()
  const [videos, setVideos] = useState([])
  const [segments, setSegments] = useState([])
  const [profiles, setProfiles] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterPlacement, setFilterPlacement] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [thumbnailLoading, setThumbnailLoading] = useState(false)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [thumbnailMessage, setThumbnailMessage] = useState('')
  const [bulkThumbnailRefreshing, setBulkThumbnailRefreshing] = useState(false)
  const [bulkThumbnailMessage, setBulkThumbnailMessage] = useState('')
  const profileMap = useMemo(() => new Map(profiles.map(profile => [profile.id, profile])), [profiles])

  useEffect(() => {
    loadVideos()
    loadSegments()
    loadProfiles()
  }, [])

  useEffect(() => {
    if (loading || !isExec) return
    const editId = searchParams.get('edit')
    const segmentId = searchParams.get('segment_id')
    const segmentTitle = searchParams.get('segment_title')

    if (editId) {
      const existing = videos.find(video => video.id === editId)
      if (existing) {
        openEdit(existing)
        setSearchParams({})
      }
      return
    }

    if (segmentId || segmentTitle) {
      openAdd({
        title: segmentTitle || '',
        segment_id: segmentId || '',
        segment_title: segmentTitle || '',
        upload_status: 'planned',
        published: false,
        href: '',
      })
      setSearchParams({})
    }
  }, [loading, isExec, searchParams, setSearchParams, videos])

  useEffect(() => {
    let v = [...videos]
    if (search) v = v.filter(x => x.title?.toLowerCase().includes(search.toLowerCase()) || x.href?.includes(search))
    if (filterSection) v = v.filter(x => x.section === filterSection)
    if (filterPlacement) v = v.filter(x => hasPlacement(x, filterPlacement))
    if (filterStatus) v = v.filter(x => publishStatusForVideo(x) === filterStatus)
    setFiltered(v)
  }, [videos, search, filterSection, filterPlacement, filterStatus])

  async function loadVideos() {
    setLoading(true)
    const { data } = await supabase.from('videos').select('*').order('display_order').order('created_at', { ascending: false })
    setVideos(data || [])
    setLoading(false)
  }

  async function loadSegments() {
    const { data } = await supabase.from('segments').select('id, title').order('created_at', { ascending: false }).limit(100)
    setSegments(data || [])
  }

  async function loadProfiles() {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    setProfiles(data || [])
  }

  function normalizeCreditRows(rawCredits) {
    return parseCredits(rawCredits).map(credit => {
      const profileId = credit.profile_id || credit.creator_id || credit.id || ''
      const profile = profileId ? profileMap.get(profileId) : null
      return {
        profile_id: profileId,
        name: profile?.full_name || credit.name || credit.full_name || '',
        roles: normalizeRoles(credit),
        role: normalizeRoles(credit).join(', '),
        show: credit.show !== false,
      }
    }).filter(credit => credit.profile_id || credit.name || credit.role)
  }

  function visibleCreditRows(rawCredits) {
    return normalizeCreditRows(rawCredits).filter(credit => credit.show !== false && (credit.name || credit.profile_id))
  }

  function openAdd(prefill = {}) {
    if (!isExec) return
    setForm({
      ...EMPTY,
      ...prefill,
      credits: normalizeCreditRows(prefill.credits),
      placements: normalizePlacements(prefill),
      placement: primaryPlacement(prefill),
    })
    setSaveError('')
    setThumbnailMessage('')
    setModalOpen(true)
  }

  function openEdit(v) {
    if (!isExec) return
    const credits = normalizeCreditRows(v.credits)
    const legacyProfile = v.creator_id ? profileMap.get(v.creator_id) : null
    const mergedCredits = credits.length || !v.creator_id
      ? credits
      : [{
        profile_id: v.creator_id,
        name: legacyProfile?.full_name || v.byline || '',
        role: '',
        show: true,
      }]
    setForm({
      ...EMPTY,
      ...v,
      publish_status: publishStatusForVideo(v),
      scheduled_at: toDateTimeLocal(v.scheduled_at),
      credits: mergedCredits,
      placements: normalizePlacements(v),
      placement: primaryPlacement(v),
    })
    setSaveError('')
    setThumbnailMessage('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!isExec) {
      setSaveError('Only exec users can change Video Publishing records.')
      return
    }
    const publishStatus = form.publish_status || (form.published ? 'published' : 'draft')
    const isUploaded = (form.upload_status || 'published') === 'published'
    const isPublicStatus = publishStatus === 'published' || publishStatus === 'scheduled'
    setSaveError('')
    if (!form.title || !form.section) {
      setSaveError('Add a title and choose a section before saving.')
      return
    }
    if (isUploaded && !form.href) {
      setSaveError('Add a video link, or change Upload Status to Draft/Planned upload.')
      return
    }
    if (publishStatus === 'scheduled' && !form.scheduled_at) {
      setSaveError('Choose a scheduled publish date/time, or change Status to Draft/Published.')
      return
    }
    setSaving(true)
    const credits = normalizeCreditRows(form.credits)
    const placements = normalizePlacements(form.placements)
    const publicCredits = credits.filter(credit => credit.show !== false && (credit.name || credit.profile_id))
    const primaryCredit = publicCredits.find(credit => credit.profile_id) || credits.find(credit => credit.profile_id)
    const payload = {
      ...form,
      credits,
      placements,
      href: form.href || '#pending-upload',
      published: isUploaded && isPublicStatus,
      segment_id: form.segment_id || null,
      segment_title: form.segment_title || '',
      upload_status: form.upload_status || (form.published ? 'published' : 'draft'),
      publish_status: publishStatus,
      scheduled_at: publishStatus === 'scheduled' && form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      creator_id: primaryCredit?.profile_id || null,
      placement: primaryPlacement(placements),
      byline: form.byline || publicCredits.map(credit => credit.name).filter(Boolean).join(', '),
    }
    if (!payload.thumbnail && payload.href) {
      payload.thumbnail = getYoutubeThumbnail(payload.href) || ''
    }
    if (payload.id) {
      const result = await supabase.from('videos').update(payload).eq('id', payload.id)
      if (result.error) {
        console.error('Video update failed', { error: result.error, payload })
        setSaveError(`The video could not be saved: ${result.error.message}. If this mentions credits or placements, rerun the Supabase videos migration.`)
        setSaving(false)
        return
      }
    } else {
      delete payload.id
      const result = await supabase.from('videos').insert(payload)
      if (result.error) {
        console.error('Video insert failed', { error: result.error, payload })
        setSaveError(`The video could not be saved: ${result.error.message}. If this mentions credits or placements, rerun the Supabase videos migration.`)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setModalOpen(false)
    await loadVideos()
  }

  async function handleDelete(id) {
    if (!isExec) return
    if (!confirm('Delete this video?')) return
    await supabase.from('videos').delete().eq('id', id)
    setVideos(v => v.filter(x => x.id !== id))
  }

  async function togglePublished(video) {
    if (!isExec) return
    const nextStatus = publishStatusForVideo(video) === 'published' ? 'draft' : 'published'
    const nextPublished = nextStatus === 'published'
    await supabase.from('videos').update({ published: nextPublished, publish_status: nextStatus, scheduled_at: null }).eq('id', video.id)
    setVideos(v => v.map(x => x.id === video.id ? { ...x, published: nextPublished, publish_status: nextStatus, scheduled_at: null } : x))
  }

  function set(key, val) {
    if (!isExec) return
    setForm(f => ({ ...f, [key]: val }))
  }

  function setSegment(segmentId) {
    if (!isExec) return
    const segment = segments.find(item => item.id === segmentId)
    setForm(f => ({
      ...f,
      segment_id: segmentId,
      segment_title: segment?.title || f.segment_title,
      title: f.title || segment?.title || '',
    }))
  }

  async function pullThumbnailFromLink(url = form.href) {
    if (!isExec) return
    setThumbnailMessage('')
    const youtubeThumb = getYoutubeThumbnail(url)
    if (youtubeThumb) {
      set('thumbnail', youtubeThumb)
      setThumbnailMessage('YouTube thumbnail added.')
      return
    }

    if (!isInstagramUrl(url)) {
      setThumbnailMessage('Paste a YouTube or Instagram Reel link first.')
      return
    }

    setThumbnailLoading(true)
    try {
      const instagramThumb = await persistInstagramThumbnail({
        href: url,
        thumbnail: form.thumbnail,
        title: form.title,
      })
      if (instagramThumb) {
        set('thumbnail', instagramThumb)
        setThumbnailMessage('Instagram thumbnail copied into stable TNN storage.')
      } else {
        setThumbnailMessage('Instagram did not expose a usable thumbnail. Upload a still image instead.')
      }
    } catch (error) {
      console.error('Instagram thumbnail lookup failed', error)
      setThumbnailMessage('Could not pull the Instagram thumbnail. Paste the thumbnail URL manually if needed.')
    } finally {
      setThumbnailLoading(false)
    }
  }

  async function uploadThumbnailFile(file) {
    if (!isExec) return
    if (!file) return
    setThumbnailMessage('')
    setThumbnailUploading(true)
    try {
      const prepared = await prepareThumbnailUpload(file)
      const publicUrl = await storePreparedThumbnail(prepared, form.title)
      set('thumbnail', publicUrl)
      setThumbnailMessage('Thumbnail uploaded to Supabase Storage and saved as the thumbnail URL.')
    } catch (error) {
      console.error('Thumbnail upload failed', error)
      setThumbnailMessage(`Thumbnail upload failed: ${error.message}. Make sure the “${THUMBNAIL_BUCKET}” bucket exists and allows authenticated uploads.`)
    } finally {
      setThumbnailUploading(false)
    }
  }

  async function storePreparedThumbnail(prepared, title) {
    const folder = new Date().toISOString().slice(0, 10)
    const path = `${folder}/${slugify(title)}-${randomId()}.${prepared.extension}`
    const { data, error } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(path, prepared.body, {
        cacheControl: '31536000',
        contentType: prepared.contentType,
        upsert: false,
      })

    if (error) throw error

    const { data: publicData } = supabase.storage
      .from(THUMBNAIL_BUCKET)
      .getPublicUrl(data.path)

    return publicData.publicUrl
  }

  async function persistInstagramThumbnail(video) {
    const sourceUrls = [
      isTemporaryInstagramCdnUrl(video.thumbnail) ? video.thumbnail : '',
      getInstagramThumbnailEmbedUrl(video.href),
    ].filter(Boolean)

    let lastError = null
    for (const sourceUrl of sourceUrls) {
      try {
        const response = await fetch(sourceUrl, { referrerPolicy: 'no-referrer' })
        if (!response.ok) throw new Error(`Thumbnail request returned ${response.status}.`)

        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) throw new Error('Thumbnail source did not return an image.')

        const file = new File([blob], `${slugify(video.title)}.jpg`, { type: blob.type })
        const prepared = await prepareThumbnailUpload(file)
        return await storePreparedThumbnail(prepared, video.title)
      } catch (error) {
        lastError = error
      }
    }

    if (lastError) throw lastError
    return ''
  }

  async function refreshStaleInstagramThumbnails() {
    if (!isExec || bulkThumbnailRefreshing) return
    const staleInstagramVideos = videos.filter(video => (
      isInstagramUrl(video.href) &&
      (!video.thumbnail || isTemporaryInstagramCdnUrl(video.thumbnail))
    ))

    if (!staleInstagramVideos.length) {
      setBulkThumbnailMessage('No stale Instagram thumbnails found.')
      return
    }

    setBulkThumbnailRefreshing(true)
    setBulkThumbnailMessage(`Refreshing ${staleInstagramVideos.length} Instagram thumbnail${staleInstagramVideos.length === 1 ? '' : 's'}...`)

    let updated = 0
    let skipped = 0

    for (const video of staleInstagramVideos) {
      try {
        const refreshedThumbnail = await persistInstagramThumbnail(video)
        if (!refreshedThumbnail) {
          skipped += 1
          continue
        }

        const { error } = await supabase
          .from('videos')
          .update({ thumbnail: refreshedThumbnail })
          .eq('id', video.id)

        if (error) throw error
        updated += 1
      } catch (error) {
        skipped += 1
        console.error('Instagram thumbnail refresh failed', { videoId: video.id, error })
      }
    }

    setBulkThumbnailRefreshing(false)
    setBulkThumbnailMessage(`Instagram thumbnail refresh complete: ${updated} updated, ${skipped} skipped.`)
    if (updated > 0) await loadVideos()
  }

  function setThumbnailUrl(url) {
    if (!isExec) return
    set('thumbnail', url)
    if (isTemporaryInstagramCdnUrl(url)) {
      setThumbnailMessage('Heads up: Instagram CDN thumbnail URLs are temporary and may break. Prefer pasting the Reel link above and using Pull Thumbnail, or host a stable thumbnail URL.')
    } else if (thumbnailMessage?.includes('Instagram CDN')) {
      setThumbnailMessage('')
    }
  }

  function addCredit() {
    if (!isExec) return
    setForm(f => ({
      ...f,
      credits: [
        ...normalizeCreditRows(f.credits),
        { profile_id: '', name: '', roles: ['Reporter'], role: 'Reporter', show: true },
      ],
    }))
  }

  function updateCredit(index, patch) {
    if (!isExec) return
    setForm(f => {
      const credits = normalizeCreditRows(f.credits)
      const current = credits[index] || { profile_id: '', name: '', role: '', show: true }
      const next = { ...current, ...patch }
      if (Object.prototype.hasOwnProperty.call(patch, 'profile_id')) {
        const profile = profileMap.get(patch.profile_id)
        next.name = profile?.full_name || ''
      }
      credits[index] = next
      return { ...f, credits }
    })
  }

  function toggleCreditRole(index, role) {
    if (!isExec) return
    setForm(f => {
      const credits = normalizeCreditRows(f.credits)
      const current = credits[index] || { profile_id: '', name: '', roles: [], show: true }
      const roles = current.roles?.includes(role)
        ? current.roles.filter(item => item !== role)
        : [...(current.roles || []), role]
      credits[index] = { ...current, roles, role: roles.join(', ') }
      return { ...f, credits }
    })
  }

  function removeCredit(index) {
    if (!isExec) return
    setForm(f => ({
      ...f,
      credits: normalizeCreditRows(f.credits).filter((_, creditIndex) => creditIndex !== index),
    }))
  }

  function togglePlacement(placement) {
    if (!isExec) return
    setForm(f => {
      const placements = normalizePlacements(f.placements)
      const next = placements.includes(placement)
        ? placements.filter(item => item !== placement)
        : [...placements, placement]
      return {
        ...f,
        placements: next,
        placement: primaryPlacement(next),
      }
    })
  }

  const placementCounts = PLACEMENTS.map(placement => ({
    ...placement,
    count: videos.filter(video => hasPlacement(video, placement.value)).length,
  }))
  const breakingVideos = videos
    .filter(video => hasPlacement(video, 'breaking-panel'))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 4)
  const trendingVideos = videos
    .filter(video => hasPlacement(video, 'trending'))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 10)
  const catalogVideos = videos
    .filter(video => hasPlacement(video, 'homepage-catalog'))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 4)
  const catalogCount = videos.filter(video => video.published && hasPlacement(video, 'homepage-catalog')).length

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--adm-text)' }}>Video Publishing</h1>
          <p style={{ color: 'var(--adm-muted)', fontSize: 13, marginTop: 3 }}>
            {isExec
              ? 'Manage public videos, homepage slots, breaking panel, thumbnails, and credits.'
              : 'View-only. Only exec users can change public videos, placements, thumbnails, and credits.'}
          </p>
        </div>
        {isExec && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={refreshStaleInstagramThumbnails}
              className="adm-btn"
              disabled={bulkThumbnailRefreshing}
            >
              {bulkThumbnailRefreshing ? <Spinner size={4} /> : <ImageDown size={15} />}
              Refresh Instagram Thumbnails
            </button>
            <button onClick={() => openAdd()} className="adm-btn primary"><Plus size={15} /> Add Video</button>
          </div>
        )}
      </div>
      {bulkThumbnailMessage && (
        <div className="adm-info-box" style={{ marginBottom: 16 }}>
          {bulkThumbnailMessage}
        </div>
      )}

      <section className="video-cms-overview">
        <div className="video-cms-guide">
          <span>Publishing Order</span>
          <strong>Placement decides where a video appears. Display Order decides its position.</strong>
          <p>Lower numbers show first. Use “Trending” to manually choose and rank the public leaderboard. Catalog and Breaking Panel are capped at 4.</p>
        </div>
        <div className="slot-summary-grid">
          {placementCounts.map(placement => (
            <button
              key={placement.value}
              type="button"
              className={`slot-summary-card ${filterPlacement === placement.value ? 'active' : ''}`}
              onClick={() => setFilterPlacement(filterPlacement === placement.value ? '' : placement.value)}
            >
              <span>{placement.label}</span>
              <strong>{placement.count}</strong>
            </button>
          ))}
        </div>
        <div className="homepage-slot-stack">
          <div className="breaking-editor-panel">
            <div>
              <span>Trending</span>
              <strong>{trendingVideos.length}/10 selected</strong>
            </div>
            <ol>
              {trendingVideos.length ? trendingVideos.map(video => (
                <li key={video.id}>
                  <span>{video.display_order || 0}</span>
                  {video.title}
                </li>
              )) : <li className="empty">Choose placement “Trending” on videos to manually control the leaderboard.</li>}
            </ol>
          </div>
          <div className="breaking-editor-panel">
            <div>
              <span>Breaking Panel</span>
              <strong>{breakingVideos.length}/4 selected</strong>
            </div>
            <ol>
              {breakingVideos.length ? breakingVideos.map(video => (
                <li key={video.id}>
                  <span>{video.display_order || 0}</span>
                  {video.title}
                </li>
              )) : <li className="empty">Choose placement “Breaking Panel” on a video.</li>}
            </ol>
          </div>
          <div className="breaking-editor-panel">
            <div>
              <span>Homepage Catalog</span>
              <strong>{catalogVideos.length}/4 selected</strong>
            </div>
            <ol>
              {catalogVideos.length ? catalogVideos.map(video => (
                <li key={video.id}>
                  <span>{video.display_order || 0}</span>
                  {video.title}
                </li>
              )) : <li className="empty">Choose placement “Homepage Catalog” on a video.</li>}
            </ol>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="adm-input" style={{ maxWidth: 280 }} placeholder="🔍 Search title or link..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="adm-input" style={{ maxWidth: 160 }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
          <option value="">All sections</option>
          {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="adm-input" style={{ maxWidth: 180 }} value={filterPlacement} onChange={e => setFilterPlacement(e.target.value)}>
          <option value="">All placements</option>
          {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select className="adm-input" style={{ maxWidth: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PUBLISH_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
        <span className="video-cms-filter-note">{filtered.length} shown · {catalogCount}/4 homepage catalog slots filled</span>
      </div>

      {/* Table */}
      <div className="adm-card video-table-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={6} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--adm-muted)', fontSize: 13 }}>No videos found.</div>
        ) : (
          <table className="video-cms-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--adm-border)' }}>
                {['Thumbnail', 'Title', 'Credits', 'Production Segment', 'Section', 'Placement / Order', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase', color: 'var(--adm-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--adm-border)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ width: 64, height: 36, background: '#1a1a2a', overflow: 'hidden', borderRadius: 4 }}>
                      <AutoThumbnail
                        video={v}
                        alt=""
                        fallback={<span className="video-cms-thumb-fallback">TNN</span>}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 280 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                    {v.byline && <p style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 2 }}>{v.byline}</p>}
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 180 }}>
                    {(() => {
                      const credits = normalizeCreditRows(v.credits)
                      const publicCredits = visibleCreditRows(v.credits)
                      const hiddenCount = credits.filter(credit => credit.show === false).length
                      const fallbackName = profiles.find(profile => profile.id === v.creator_id)?.full_name || v.byline

                      if (!publicCredits.length && !fallbackName) {
                        return <p style={{ fontSize: 12, color: 'var(--adm-muted)' }}>No public credits</p>
                      }

                      return (
                        <div style={{ display: 'grid', gap: 4 }}>
                          {(publicCredits.length ? publicCredits : [{ name: fallbackName, role: '' }]).slice(0, 3).map((credit, creditIndex) => (
                            <p key={`${credit.profile_id || credit.name}-${creditIndex}`} style={{ fontSize: 12, color: 'var(--adm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {credit.name}
                              {credit.roles?.length > 0 && <span style={{ color: 'var(--adm-muted)' }}> · {credit.roles.join(', ')}</span>}
                            </p>
                          ))}
                          {hiddenCount > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--adm-muted)' }}>{hiddenCount} hidden from public byline</span>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                    <p style={{ fontSize: 12, color: v.segment_title ? 'var(--adm-text)' : 'var(--adm-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.segment_title || 'Not linked'}
                    </p>
                    {(v.upload_status === 'planned' || v.href === '#pending-upload') && (
                      <span style={{ display: 'inline-flex', marginTop: 4, fontSize: 10, color: '#fbbf24', background: '#3b2800', padding: '2px 6px', borderRadius: 4 }}>
                        Planned upload
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}><SectionBadge value={v.section} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--adm-muted)' }}>
                    <strong style={{ display: 'block', color: 'var(--adm-text)', fontSize: 12 }}>
                      {normalizePlacements(v).map(item => PLACEMENT_LABELS[item] || item).join(', ') || 'Regular Item'}
                    </strong>
                    <span>Order {v.display_order || 0}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {(() => {
                      const status = publishStatusForVideo(v)
                      const scheduledLabel = status === 'scheduled' && v.scheduled_at
                        ? new Date(v.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                        : ''
                      const statusClass = `video-status-pill ${status}`
                      return (
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span className={statusClass}>{PUBLISH_STATUSES.find(item => item.value === status)?.label || status}</span>
                          {scheduledLabel && <small style={{ color: 'var(--adm-muted)', fontSize: 10 }}>{scheduledLabel}</small>}
                        </div>
                      )
                    })()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {v.href && v.href !== '#pending-upload' && (
                        <a href={v.href} target="_blank" rel="noopener noreferrer" className="adm-btn" style={{ padding: '4px 8px' }} title="Open link">
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {isExec && <>
                        <button onClick={() => togglePublished(v)} className="adm-btn" style={{ padding: '4px 8px' }} title={v.published ? 'Unpublish' : 'Publish'}>
                          {v.published ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => openEdit(v)} className="adm-btn" style={{ padding: '4px 8px' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(v.id)} className="adm-btn danger" style={{ padding: '4px 8px' }}>
                          <Trash2 size={13} />
                        </button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Edit Video' : 'Add Video'} size="lg">
        <div className="video-form-section">
          <div className="video-form-section-head">
            <span>Publishing Setup</span>
            <p>Choose where this video belongs and when the public should see it.</p>
          </div>
          <div className="video-form-grid workflow">
          <Field label="Linked Production Segment" hint="The segment is managed in the Production Platform. This CMS controls only public publishing.">
            <select className="adm-input" value={form.segment_id || ''} onChange={e => setSegment(e.target.value)}>
              <option value="">No linked segment</option>
              {segments.map(segment => <option key={segment.id} value={segment.id}>{segment.title}</option>)}
            </select>
          </Field>
          <Field label="Upload Status">
            <select className="adm-input" value={form.upload_status || 'published'} onChange={e => {
              set('upload_status', e.target.value)
              if (e.target.value !== 'published') {
                setForm(current => ({ ...current, upload_status: e.target.value, published: false, publish_status: 'draft' }))
              }
            }}>
              <option value="published">Ready / Uploaded</option>
              <option value="draft">Draft</option>
              <option value="planned">Planned upload</option>
            </select>
          </Field>
          <Field label="Public Status" hint="Scheduled videos appear automatically after the selected time. Archived videos stay hidden.">
            <select className="adm-input" value={form.publish_status || 'published'} onChange={e => {
              const status = e.target.value
              setForm(current => ({
                ...current,
                publish_status: status,
                published: status === 'published' || status === 'scheduled',
                scheduled_at: status === 'scheduled' ? current.scheduled_at : '',
              }))
            }}>
              {PUBLISH_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </Field>
          <Field label="Scheduled Publish Time" hint="Only used when Public Status is Scheduled.">
            <input
              className="adm-input"
              type="datetime-local"
              value={form.scheduled_at || ''}
              disabled={(form.publish_status || 'published') !== 'scheduled'}
              onChange={e => set('scheduled_at', e.target.value)}
            />
          </Field>
          <Field label="Section *">
            <select className="adm-input" value={form.section} onChange={e => set('section', e.target.value)} required>
              <option value="">Select section...</option>
              {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Homepage / Feature Slots" hint="A video can appear in multiple places. Leave all unchecked for a regular section item.">
            <div className="placement-check-grid">
              {PLACEMENTS.map(placement => {
                const selected = normalizePlacements(form.placements).includes(placement.value)
                return (
                  <label key={placement.value} className={`placement-check ${selected ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePlacement(placement.value)}
                    />
                    <span>{placement.label}</span>
                  </label>
                )
              })}
            </div>
          </Field>
          </div>
        </div>

        {saveError && (
          <div className="adm-error-box">
            {saveError}
          </div>
        )}

        <div className="video-form-section">
          <div className="video-form-section-head">
            <span>Video Details</span>
            <p>Public title, link, thumbnail, and description.</p>
          </div>

          <Field label="Title *">
            <input className="adm-input video-title-input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </Field>

          <Field label={form.upload_status === 'published' ? 'Video Link * (YouTube, Instagram, etc.)' : 'Video Link (add later)'}>
            <div className="video-link-tools">
              <input className="adm-input" value={form.href} onChange={e => {
                set('href', e.target.value)
                const autoThumb = getYoutubeThumbnail(e.target.value)
                if (autoThumb && !form.thumbnail) {
                  set('thumbnail', autoThumb)
                  setThumbnailMessage('YouTube thumbnail added.')
                }
              }} onBlur={e => {
                if (isInstagramUrl(e.target.value) && !form.thumbnail) pullThumbnailFromLink(e.target.value)
              }} placeholder="https://youtube.com/watch?v=... or https://instagram.com/reel/..." required={form.upload_status === 'published'} />
              <button type="button" className="adm-btn" onClick={() => pullThumbnailFromLink()} disabled={thumbnailLoading || !form.href}>
                {thumbnailLoading ? <Spinner size={4} /> : <ImageDown size={14} />} Pull Thumbnail
              </button>
            </div>
          </Field>

          <Field label="Thumbnail" hint="Keep a normal URL for YouTube, or upload a stable image to Supabase for Instagram videos. Existing thumbnails are not changed unless you replace this value.">
            <div className="thumbnail-layout">
              <div>
                <div className="thumbnail-tools">
                  <input className="adm-input" value={form.thumbnail} onChange={e => setThumbnailUrl(e.target.value)} placeholder="Auto-detected from YouTube, uploaded to Supabase, or pasted URL" />
                  <label className={`adm-btn thumbnail-upload-btn ${thumbnailUploading ? 'disabled' : ''}`}>
                    {thumbnailUploading ? <Spinner size={4} /> : <Upload size={14} />}
                    Upload Image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={thumbnailUploading}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        uploadThumbnailFile(file)
                      }}
                    />
                  </label>
                </div>
                {thumbnailMessage && <p className="thumbnail-message">{thumbnailMessage}</p>}
              </div>
              {form.thumbnail && (
                <img
                  src={form.thumbnail}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setThumbnailMessage('That thumbnail URL could not be loaded here. Instagram CDN links often expire or block hotlinking; use Pull Thumbnail from the Reel URL or a stable hosted image.')}
                  className="thumbnail-preview"
                />
              )}
            </div>
          </Field>

          <Field label="Description (Dek)">
            <textarea className="adm-input video-description-input" rows={3} value={form.dek} onChange={e => set('dek', e.target.value)} placeholder="Video description..." />
          </Field>
        </div>

        <div className="video-form-section">
          <div className="video-form-section-head">
            <span>Credits</span>
            <p>Public byline credits appear on video cards and staff profile pages.</p>
          </div>

          <Field label="Public Credits" hint="Add everyone who worked on the video. Turn off Show for people who should stay internal.">
            <div className="credit-editor">
              {normalizeCreditRows(form.credits).length === 0 ? (
                <div className="credit-empty">No public credits yet. Add a profile to make names clickable on the site.</div>
              ) : (
                normalizeCreditRows(form.credits).map((credit, index) => (
                  <div className="credit-row" key={`${credit.profile_id || credit.name}-${index}`}>
                    <select className="adm-input" value={credit.profile_id || ''} onChange={e => updateCredit(index, { profile_id: e.target.value })}>
                      <option value="">Choose profile...</option>
                      {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}
                    </select>
                    <input
                      className="adm-input"
                      value={credit.name || ''}
                      onChange={e => updateCredit(index, { name: e.target.value })}
                      placeholder="Display name"
                    />
                    <label className="credit-show-toggle">
                      <input type="checkbox" checked={credit.show !== false} onChange={e => updateCredit(index, { show: e.target.checked })} />
                      Show
                    </label>
                    <button type="button" className="adm-btn danger credit-remove-btn" onClick={() => removeCredit(index)}>Remove</button>
