import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from '../../components/admin/AdminLayout'
import { Modal, Field, SectionBadge, Spinner } from '../../components/ui'
import {
  SECTIONS,
  PLACEMENTS,
  getInstagramThumbnail,
  getYoutubeThumbnail,
  hasPlacement,
  isInstagramUrl,
  normalizePlacements,
  primaryPlacement,
} from '../../lib/constants'
import { Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff, ImageDown } from 'lucide-react'

const EMPTY = {
  section: '', placement: 'section-item', title: '', href: '',
  thumbnail: '', dek: '', byline: '', runtime: '', date: '',
  display_order: 0, published: true, hero_variant: 'mosaic',
  segment_id: '', segment_title: '', upload_status: 'published',
  creator_id: '', credits: [], placements: [],
}

const NEW_VIDEO_FIELDS = ['segment_id', 'segment_title', 'upload_status', 'creator_id', 'credits', 'placements']

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

export default function VideoCMSPage() {
  const { isExec } = useAuth()
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
  const [thumbnailMessage, setThumbnailMessage] = useState('')
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
    if (filterStatus === 'published') v = v.filter(x => x.published)
    if (filterStatus === 'draft') v = v.filter(x => !x.published)
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
    setForm({ ...EMPTY, ...v, credits: mergedCredits, placements: normalizePlacements(v), placement: primaryPlacement(v) })
    setSaveError('')
    setThumbnailMessage('')
    setModalOpen(true)
  }

  async function handleSave() {
    const isUploaded = (form.upload_status || 'published') === 'published'
    setSaveError('')
    if (!form.title || !form.section) {
      setSaveError('Add a title and choose a section before saving.')
      return
    }
    if (isUploaded && !form.href) {
      setSaveError('Add a video link, or change Upload Status to Draft/Planned upload.')
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
      published: isUploaded ? form.published : false,
      segment_id: form.segment_id || null,
      segment_title: form.segment_title || '',
      upload_status: form.upload_status || (form.published ? 'published' : 'draft'),
      creator_id: primaryCredit?.profile_id || null,
      placement: primaryPlacement(placements),
      byline: form.byline || publicCredits.map(credit => credit.name).filter(Boolean).join(', '),
    }
    if (!payload.thumbnail && payload.href) {
      payload.thumbnail = getYoutubeThumbnail(payload.href) || ''
    }
    const legacyPayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => !NEW_VIDEO_FIELDS.includes(key))
    )
    let result
    let fallbackResult = null

    if (payload.id) {
      result = await supabase.from('videos').update(payload).eq('id', payload.id)
      if (result.error) fallbackResult = await supabase.from('videos').update(legacyPayload).eq('id', payload.id)
    } else {
      delete payload.id
      delete legacyPayload.id
      result = await supabase.from('videos').insert(payload)
      if (result.error) fallbackResult = await supabase.from('videos').insert(legacyPayload)
    }

    const finalError = fallbackResult?.error || (!fallbackResult && result.error)
    if (finalError) {
      console.error('Video save failed', { error: result.error, fallbackError: fallbackResult?.error, payload, legacyPayload })
      setSaveError(finalError.message || 'The video could not be saved. Check your Supabase permissions and migration.')
      setSaving(false)
      return
    }

    setSaving(false)
    setModalOpen(false)
    await loadVideos()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this video?')) return
    await supabase.from('videos').delete().eq('id', id)
    setVideos(v => v.filter(x => x.id !== id))
  }

  async function togglePublished(video) {
    await supabase.from('videos').update({ published: !video.published }).eq('id', video.id)
    setVideos(v => v.map(x => x.id === video.id ? { ...x, published: !x.published } : x))
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function setSegment(segmentId) {
    const segment = segments.find(item => item.id === segmentId)
    setForm(f => ({
      ...f,
      segment_id: segmentId,
      segment_title: segment?.title || f.segment_title,
      title: f.title || segment?.title || '',
    }))
  }

  async function pullThumbnailFromLink(url = form.href) {
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
      const instagramThumb = await getInstagramThumbnail(url)
      if (instagramThumb) {
        set('thumbnail', instagramThumb)
        setThumbnailMessage('Instagram thumbnail added.')
      } else {
        setThumbnailMessage('Instagram did not return a thumbnail. You can still paste one manually.')
      }
    } catch (error) {
      console.error('Instagram thumbnail lookup failed', error)
      setThumbnailMessage('Could not pull the Instagram thumbnail. Paste the thumbnail URL manually if needed.')
    } finally {
      setThumbnailLoading(false)
    }
  }

  function addCredit() {
    setForm(f => ({
      ...f,
      credits: [
        ...normalizeCreditRows(f.credits),
        { profile_id: '', name: '', roles: ['Reporter'], role: 'Reporter', show: true },
      ],
    }))
  }

  function updateCredit(index, patch) {
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
    setForm(f => ({
      ...f,
      credits: normalizeCreditRows(f.credits).filter((_, creditIndex) => creditIndex !== index),
    }))
  }

  function togglePlacement(placement) {
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
  const catalogVideos = videos
    .filter(video => hasPlacement(video, 'homepage-catalog'))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .slice(0, 4)
  const catalogCount = videos.filter(video => video.published && hasPlacement(video, 'homepage-catalog')).length

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--adm-text)' }}>Video CMS</h1>
          <p style={{ color: 'var(--adm-muted)', fontSize: 13, marginTop: 3 }}>Manage public videos, homepage slots, breaking panel, thumbnails, and credits.</p>
        </div>
        {isExec && (
          <button onClick={() => openAdd()} className="adm-btn primary"><Plus size={15} /> Add Video</button>
        )}
      </div>

      <section className="video-cms-overview">
        <div className="video-cms-guide">
          <span>Publishing Order</span>
          <strong>Placement decides where a video appears. Display Order decides its position.</strong>
          <p>Lower numbers show first. Use “Homepage Catalog” to control the four videos in the public catalog block. Breaking Panel is also capped at 4.</p>
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
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <span className="video-cms-filter-note">{filtered.length} shown · {catalogCount}/4 homepage catalog slots filled</span>
      </div>

      {/* Table */}
      <div className="adm-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={6} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--adm-muted)', fontSize: 13 }}>No videos found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--adm-border)' }}>
                {['Thumbnail', 'Title', 'Credits', 'Linked Segment', 'Section', 'Placement / Order', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase', color: 'var(--adm-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--adm-border)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ width: 64, height: 36, background: '#1a1a2a', overflow: 'hidden', borderRadius: 4 }}>
                      {(v.thumbnail || getYoutubeThumbnail(v.href)) && (
                        <img src={v.thumbnail || getYoutubeThumbnail(v.href)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
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
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: v.published ? '#14532d22' : '#1e293b',
                      color: v.published ? '#4ade80' : '#64748b',
                    }}>
                      {v.published ? '● Published' : '○ Draft'}
                    </span>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Linked Segment" hint="Optional. Connect this public video to a newsroom segment. Segment edits still happen in the hosted newsroom.">
            <select className="adm-input" value={form.segment_id || ''} onChange={e => setSegment(e.target.value)}>
              <option value="">No linked segment</option>
              {segments.map(segment => <option key={segment.id} value={segment.id}>{segment.title}</option>)}
            </select>
          </Field>
          <Field label="Upload Status">
            <select className="adm-input" value={form.upload_status || 'published'} onChange={e => {
              set('upload_status', e.target.value)
              if (e.target.value !== 'published') set('published', false)
            }}>
              <option value="published">Ready / Uploaded</option>
              <option value="draft">Draft</option>
              <option value="planned">Planned upload</option>
            </select>
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

        {saveError && (
          <div className="adm-error-box">
            {saveError}
          </div>
        )}

        <Field label="Title *">
          <input className="adm-input" value={form.title} onChange={e => set('title', e.target.value)} required />
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
          {thumbnailMessage && <p className="thumbnail-message">{thumbnailMessage}</p>}
        </Field>

        <Field label="Thumbnail URL">
          <input className="adm-input" value={form.thumbnail} onChange={e => set('thumbnail', e.target.value)} placeholder="Auto-detected from YouTube, or paste URL" />
          {form.thumbnail && <img src={form.thumbnail} alt="" style={{ marginTop: 8, width: 120, height: 68, objectFit: 'cover', borderRadius: 4 }} />}
        </Field>

        <Field label="Description (Dek)">
          <textarea className="adm-input" rows={3} value={form.dek} onChange={e => set('dek', e.target.value)} placeholder="Video description..." />
        </Field>

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
                  <div className="credit-role-pills">
                    {CREDIT_ROLES.map(role => (
                      <label key={role} className={credit.roles?.includes(role) ? 'active' : ''}>
                        <input
                          type="checkbox"
                          checked={credit.roles?.includes(role) || false}
                          onChange={() => toggleCreditRole(index, role)}
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                  <label className="credit-show-toggle">
                    <input type="checkbox" checked={credit.show !== false} onChange={e => updateCredit(index, { show: e.target.checked })} />
                    Show
                  </label>
                  <button type="button" className="adm-btn danger" onClick={() => removeCredit(index)}>Remove</button>
                </div>
              ))
            )}
            <button type="button" className="adm-btn" onClick={addCredit}>
              <Plus size={14} /> Add Credit
            </button>
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Fallback Byline" hint="Used only when no public credits are set.">
            <input className="adm-input" value={form.byline} onChange={e => set('byline', e.target.value)} placeholder="TNN Staff" />
          </Field>
          <Field label="Runtime">
            <input className="adm-input" value={form.runtime} onChange={e => set('runtime', e.target.value)} placeholder="1:37" />
          </Field>
          <Field label="Date">
            <input className="adm-input" value={form.date} onChange={e => set('date', e.target.value)} placeholder="Jan 27, 2026" />
          </Field>
        </div>

        <div className="video-order-box">
          <div>
            <span>Placement and Order</span>
            <p>Use placement for homepage areas. Use order numbers to control position inside each area. Lower numbers show first.</p>
          </div>
          <Field label="Display Order">
            <input className="adm-input" type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
          </Field>
          <Field label=" ">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, cursor: 'pointer', fontSize: 13, color: 'var(--adm-text)' }}>
              <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} />
              Published
            </label>
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={() => setModalOpen(false)} className="adm-btn">Cancel</button>
          <button onClick={handleSave} className="adm-btn primary" disabled={saving}>
            {saving && <Spinner size={4} />} Save Video
          </button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
