import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PublicLayout from '../../components/public/PublicLayout'
import { VideoCard } from '../../components/public/VideoCard'
import { Spinner } from '../../components/ui'
import { SECTIONS } from '../../lib/constants'
import { attachCreators } from '../../lib/creators'

const FILTERS = ['All Videos', 'YouTube', 'Instagram', 'Most Recent']

export default function VideosPage() {
  const { section } = useParams()
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All Videos')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase.from('videos').select('*').eq('published', true)
        .order('display_order').order('created_at', { ascending: false })
      if (section) q = q.eq('section', section)
      const { data } = await q
      setVideos(await attachCreators(data || []))
      setLoading(false)
    }
    load()
  }, [section])

  const sectionLabel = section ? SECTIONS.find(s => s.value === section)?.label || section : null

  const filtered = videos
    .filter(v => {
      if (searchQuery) return v.title?.toLowerCase().includes(searchQuery.toLowerCase())
      return true
    })
    .filter(v => {
      if (filter === 'YouTube')   return v.href?.includes('youtube') || v.href?.includes('youtu.be')
      if (filter === 'Instagram') return v.href?.includes('instagram')
      return true
    })
    .sort((a, b) => {
      if (filter === 'Most Recent') return new Date(b.created_at) - new Date(a.created_at)
      return 0
    })

  const igVideos = videos.filter(v => v.href?.includes('instagram'))

  return (
    <PublicLayout>

      {/* ── Page header band ── */}
      <div style={{
        background: 'var(--pub-bg)',
        padding: '38px 24px 24px',
        borderBottom: '2px solid var(--pub-dark)',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <h1 className="anim-fade-up" style={{
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32,
            color: 'var(--pub-text)', letterSpacing: 0, lineHeight: 1,
            marginBottom: 6,
          }}>
            {sectionLabel || searchQuery ? (sectionLabel || `"${searchQuery}"`) : 'All Videos'}
          </h1>
          {!sectionLabel && !searchQuery && (
            <p className="anim-fade-up anim-delay-1" style={{ fontSize: 13, color: 'var(--pub-muted)', marginTop: 6 }}>
              Every video from Brooklyn Tech's student newsroom
            </p>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        borderBottom: '1px solid var(--pub-border)',
        padding: '12px 24px',
        display: 'flex', gap: 8, alignItems: 'center',
        overflowX: 'auto', scrollbarWidth: 'none',
        background: 'var(--pub-bg)',
      }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`pub-chip ${filter === f ? 'active' : ''}`}>
            {f}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--pub-muted)', flexShrink: 0 }}>
          {filtered.length} video{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Grid ── */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Spinner size={8} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            color: 'var(--pub-muted)', fontSize: 14,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            No videos found{searchQuery ? ` for "${searchQuery}"` : ''}.
          </div>
        ) : (
          <>
            <div className="section-rule" style={{ paddingTop: 24 }}>
              <span className="section-rule-label">{sectionLabel || 'All Videos'}</span>
              <div className="section-rule-line" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '32px 24px', paddingBottom: 48 }}>
              {filtered.map((v, i) => <VideoCard key={v.id} video={v} animDelay={Math.min(i, 5) * 0.06} />)}
            </div>

            {/* Instagram square row */}
            {!section && igVideos.length > 0 && filter === 'All Videos' && !searchQuery && (
              <div style={{ borderTop: '1px solid var(--pub-border)', paddingTop: 0, paddingBottom: 48 }}>
                <div className="section-rule">
                  <span className="section-rule-label">From Instagram</span>
                  <div className="section-rule-line" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                  {igVideos.slice(0, 10).map((v, i) => (
                    <a key={v.id} href={v.href} target="_blank" rel="noopener noreferrer"
                      className={`pub-video-card anim-fade-up`}
                      style={{ textDecoration: 'none', color: 'inherit', animationDelay: `${i * 0.05}s` }}>
                      <div className="pub-thumb-wrap" style={{ aspectRatio: '1/1', background: '#0a1a3a', marginBottom: 7 }}>
                        {v.thumbnail ? (
                          <img src={v.thumbnail} alt={v.title} className="pub-thumb-img"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{
                            width: '100%', height: '100%',
                            background: 'var(--pub-surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase' }}>IG</span>
                          </div>
                        )}
                        {v.runtime && (
                          <div style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 5px' }}>
                            {v.runtime}
                          </div>
                        )}
                        <div className="platform-pill" style={{ position: 'absolute', bottom: 5, left: 5 }}>
                          <span className="platform-dot-ig" /> IG
                        </div>
                      </div>
                      <div className="pub-card-title" style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--pub-text)' }}>
                        {v.title}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  )
}
