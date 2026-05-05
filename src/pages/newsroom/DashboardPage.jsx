import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/admin/AdminLayout'
import { SectionBadge, Spinner } from '../../components/ui'
import { SECTIONS, getYoutubeThumbnail, hasPlacement } from '../../lib/constants'
import {
  ArrowRight, CheckCircle2, ExternalLink, Film, Layers,
  Link2, Plus, RadioTower, UploadCloud
} from 'lucide-react'

const FULL_NEWSROOM_URL = 'https://tatertot0102.github.io/tnn-platform/dashboard'

const SECTION_LABELS = Object.fromEntries(SECTIONS.map(section => [section.value, section.label]))

function cleanTitle(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function getVideoThumb(video) {
  return video?.thumbnail || getYoutubeThumbnail(video?.href) || ''
}

function PublishingStat({ icon: Icon, label, value, tone = 'blue' }) {
  return (
    <div className={`publishing-stat ${tone}`}>
      <Icon size={20} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [videos, setVideos] = useState([])
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [videosResult, segmentsResult] = await Promise.all([
      supabase.from('videos').select('*').order('display_order').order('created_at', { ascending: false }),
      supabase.from('segments').select('id, title, departments').order('created_at', { ascending: false }).limit(12),
    ])

    setVideos(videosResult.data || [])
    setSegments(segmentsResult.data || [])
    setLoading(false)
  }

  const published = videos.filter(video => video.published)
  const drafts = videos.filter(video => !video.published)
  const planned = videos.filter(video => video.upload_status === 'planned' || video.href === '#pending-upload')
  const hero = videos.find(video => hasPlacement(video, 'hero'))
  const catalog = videos.filter(video => hasPlacement(video, 'homepage-catalog')).slice(0, 4)
  const breaking = videos.filter(video => hasPlacement(video, 'breaking-panel')).slice(0, 4)

  const segmentConnections = useMemo(() => segments.map(segment => {
    const titleKey = cleanTitle(segment.title)
    const connected = videos.find(video => {
      const segmentTitleKey = cleanTitle(video.segment_title)
      const videoTitleKey = cleanTitle(video.title)

      return (
        video.segment_id === segment.id ||
        (titleKey && segmentTitleKey === titleKey) ||
        (titleKey && videoTitleKey && videoTitleKey.includes(titleKey)) ||
        (titleKey && videoTitleKey && titleKey.includes(videoTitleKey))
      )
    })

    return {
      segment,
      video: connected,
      status: connected ? (connected.published ? 'Published' : connected.upload_status === 'planned' ? 'Planned Upload' : 'Draft') : 'Needs Video',
    }
  }), [segments, videos])

  const unlinkedCount = segmentConnections.filter(connection => !connection.video).length
  const readyCount = segmentConnections.filter(connection => connection.video?.published).length

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={8} /></div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <section className="publishing-hero">
        <div>
          <span>Publishing Hub</span>
          <h1>Connect newsroom segments to public videos.</h1>
          <p>
            This dashboard is for public video publishing only. Segment planning and task edits still live in the hosted newsroom.
          </p>
          <div className="publishing-actions">
            <Link to="/newsroom/videos" className="adm-btn primary">
              <Plus size={14} /> Add or edit video
            </Link>
            <a href={FULL_NEWSROOM_URL} target="_blank" rel="noopener noreferrer" className="adm-btn">
              Full newsroom <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <div className="publishing-hero-card">
          <span>Hero Slot</span>
          {hero ? (
            <>
              {getVideoThumb(hero) && <img src={getVideoThumb(hero)} alt="" />}
              <strong>{hero.title}</strong>
              <small>{hero.published ? 'Published' : 'Draft'} · {SECTION_LABELS[hero.section] || hero.section}</small>
            </>
          ) : (
            <>
              <div className="publishing-empty-thumb"><Film size={24} /></div>
              <strong>No hero video set</strong>
              <small>Choose placement “Hero” in Video CMS.</small>
            </>
          )}
        </div>
      </section>

      <section className="publishing-stats">
        <PublishingStat icon={RadioTower} label="Published videos" value={published.length} tone="green" />
        <PublishingStat icon={UploadCloud} label="Draft / planned" value={drafts.length + planned.length} tone="amber" />
        <PublishingStat icon={Link2} label="Connected segments" value={readyCount} tone="blue" />
        <PublishingStat icon={Layers} label="Need public video" value={unlinkedCount} tone="red" />
      </section>

      <section className="publishing-grid">
        <div className="publishing-panel">
          <div className="publishing-panel-head">
            <div>
              <span>Segment Connections</span>
              <h2>Match each segment to its public video</h2>
            </div>
            <a href={FULL_NEWSROOM_URL} target="_blank" rel="noopener noreferrer">
              Manage segments elsewhere <ExternalLink size={13} />
            </a>
          </div>

          <div className="connection-list">
            {segmentConnections.length === 0 && (
              <div className="connection-empty">
                No segments were returned from the hosted newsroom.
              </div>
            )}
            {segmentConnections.map(({ segment, video, status }) => (
              <article key={segment.id} className={`connection-row ${video ? 'connected' : ''}`}>
                <div className="connection-main">
                  <div className="connection-icon">
                    {video ? <CheckCircle2 size={18} /> : <Link2 size={18} />}
                  </div>
                  <div>
                    <h3>{segment.title || 'Untitled segment'}</h3>
                    <p>
                      {video ? `Linked to “${video.title}”` : 'No public video has been connected yet.'}
                    </p>
                    <div className="connection-tags">
                      {segment.departments?.slice(0, 3).map(dept => <span key={dept}>{dept}</span>)}
                      <strong>{status}</strong>
                    </div>
                  </div>
                </div>
                <div className="connection-actions">
                  {video ? (
                    <>
                      <Link to={`/newsroom/videos?edit=${video.id}`} className="adm-btn">Edit video</Link>
                      {video.href && video.href !== '#pending-upload' && (
                        <a href={video.href} target="_blank" rel="noopener noreferrer" className="adm-btn">
                          Open <ExternalLink size={13} />
                        </a>
                      )}
                    </>
                  ) : (
                    <Link
                      to={`/newsroom/videos?segment_id=${segment.id}&segment_title=${encodeURIComponent(segment.title || '')}`}
                      className="adm-btn primary"
                    >
                      Create draft <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="publishing-panel sidebar-panel">
          <div className="publishing-panel-head">
            <div>
              <span>Homepage Slots</span>
              <h2>What public visitors see</h2>
            </div>
          </div>
          <div className="slot-list">
            <div className="slot-card">
              <span>Hero</span>
              <strong>{hero?.title || 'Not assigned'}</strong>
              {hero?.section && <SectionBadge value={hero.section} />}
            </div>
            <div className="slot-card">
              <span>Homepage Catalog</span>
              <strong>{catalog.length}/4 filled</strong>
              <small>{catalog.map(video => video.title).join(', ') || 'Choose Homepage Catalog in Video CMS.'}</small>
            </div>
            <div className="slot-card">
              <span>Breaking Panel</span>
              <strong>{breaking.length}/4 filled</strong>
              <small>{breaking.map(video => video.title).join(', ') || 'Hidden until videos are assigned.'}</small>
            </div>
            <div className="slot-card">
              <span>Draft Queue</span>
              <strong>{drafts.length + planned.length} videos</strong>
              <small>Use Video CMS to publish or attach URLs.</small>
            </div>
          </div>
        </aside>
      </section>
    </AdminLayout>
  )
}
