import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, PlayCircle, UserRound } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import { AutoThumbnail } from '../../components/public/AutoThumbnail'
import { Spinner } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { SECTIONS, getPlatform, isPublicVideo, thumbnailForVideo } from '../../lib/constants'
import { attachCreators, creditPath, creditRoleLabel, visibleCredits } from '../../lib/creators'
import { storyPath, runtimeToIso8601 } from '../../lib/videoRoutes'
import { useSeoMeta } from '../../lib/seo'

const SECTION_LABELS = Object.fromEntries(SECTIONS.map(section => [section.value, section.label]))

function youtubeId(url = '') {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || ''
}

export default function StoryPage() {
  const { id } = useParams()
  const [video, setVideo] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('videos').select('*').eq('id', id).maybeSingle()
      const [enriched] = await attachCreators(data ? [data] : [])
      const publicVideo = enriched && isPublicVideo(enriched) ? enriched : null
      setVideo(publicVideo)

      if (publicVideo?.section) {
        const relatedResult = await supabase.from('videos').select('*')
          .eq('published', true)
          .eq('section', publicVideo.section)
          .neq('id', publicVideo.id)
          .order('display_order')
          .order('created_at', { ascending: false })
          .limit(4)
        setRelated((await attachCreators(relatedResult.data || [])).filter(isPublicVideo).slice(0, 3))
      } else {
        setRelated([])
      }
      setLoading(false)
    }
    load()
  }, [id])

  const credits = visibleCredits(video)
  const thumb = thumbnailForVideo(video)
  const platform = getPlatform(video?.href)
  const yt = youtubeId(video?.href)
  const sectionLabel = SECTION_LABELS[video?.section] || video?.section || 'Video'
  const pageDescription = video?.dek || `Watch ${video?.title || 'this TNN story'} from Tech News Network, Brooklyn Tech's student-run video newsroom.`
  const jsonLd = useMemo(() => video ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: pageDescription,
    thumbnailUrl: thumb ? [thumb] : undefined,
    uploadDate: video.created_at,
    duration: runtimeToIso8601(video.runtime),
    url: `${window.location.origin}${storyPath(video)}`,
    contentUrl: video.href && video.href !== '#pending-upload' ? video.href : undefined,
    embedUrl: yt ? `https://www.youtube.com/embed/${yt}` : undefined,
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: 'Tech News Network',
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/tnn-logo.png`,
      },
    },
    author: credits.map(credit => ({
      '@type': 'Person',
      name: credit.name,
      jobTitle: creditRoleLabel(credit) || undefined,
    })),
  } : null, [video, pageDescription, thumb, yt, credits])

  useSeoMeta({
    title: video ? `${video.title} | TNN` : 'Story | TNN',
    description: pageDescription,
    path: video ? storyPath(video) : `/videos/story/${id}/`,
    type: 'article',
    keywords: video ? `${video.title}, TNN, Tech News Network, Brooklyn Tech, ${sectionLabel}, ${credits.map(credit => credit.name).join(', ')}` : 'TNN video story',
    image: thumb,
    noindex: !loading && !video,
    jsonLd,
  })

  return (
    <PublicLayout>
      {loading ? (
        <div className="public-loading"><Spinner size={8} /></div>
      ) : !video ? (
        <main className="story-page">
          <Link to="/videos/" className="creator-back"><ArrowLeft size={15} /> All videos</Link>
          <section className="story-empty">
            <h1>Story not available</h1>
            <p>This story may be unpublished, scheduled for later, or archived.</p>
          </section>
        </main>
      ) : (
        <main className="story-page">
          <Link to="/videos/" className="creator-back"><ArrowLeft size={15} /> All videos</Link>

          <article className="story-article">
            <header className="story-header">
              <span>{sectionLabel}</span>
              <h1>{video.title}</h1>
              {video.dek && <p>{video.dek}</p>}
              <div className="story-meta">
                {video.date && <span>{video.date}</span>}
                {video.runtime && <span>{video.runtime}</span>}
                {platform && <span>{platform}</span>}
              </div>
            </header>

            <section className="story-media">
              {yt ? (
                <iframe
                  src={`https://www.youtube.com/embed/${yt}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <a href={video.href} target="_blank" rel="noopener noreferrer" className="story-thumbnail-link">
                  <AutoThumbnail video={video} alt={video.title} fallback={<div className="story-thumb-placeholder">TNN</div>} />
                  <span><PlayCircle size={24} /> Watch Story</span>
                </a>
              )}
            </section>

            <section className="story-body-grid">
              <div className="story-copy">
                <h2>About This Story</h2>
                <p>{video.dek || 'This public TNN story is part of Brooklyn Tech’s student-run video newsroom coverage.'}</p>
                {video.href && video.href !== '#pending-upload' && (
                  <a href={video.href} target="_blank" rel="noopener noreferrer" className="story-watch-button">
                    Watch on {platform || 'original platform'} <ExternalLink size={15} />
                  </a>
                )}
              </div>

              <aside className="story-credits">
                <h2>Credits</h2>
                {credits.length ? credits.map((credit, index) => {
                  const path = creditPath(credit)
                  return (
                    <div key={`${credit.profile_id || credit.name}-${index}`} className="story-credit-row">
                      <UserRound size={16} />
                      <div>
                        {path ? <Link to={path}>{credit.name}</Link> : <strong>{credit.name}</strong>}
                        {creditRoleLabel(credit) && <span>{creditRoleLabel(credit)}</span>}
                      </div>
                    </div>
                  )
                }) : (
                  <p>No public credits listed yet.</p>
                )}
              </aside>
            </section>
          </article>

          {related.length > 0 && (
            <section className="story-related">
              <div className="section-rule">
                <span className="section-rule-label">More {sectionLabel}</span>
                <div className="section-rule-line" />
              </div>
              <div className="story-related-grid">
                {related.map(item => (
                  <Link key={item.id} to={storyPath(item)} className="story-related-card">
                    <AutoThumbnail video={item} alt="" fallback={null} />
                    <span>{SECTION_LABELS[item.section] || item.section}</span>
                    <h3>{item.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      )}
    </PublicLayout>
  )
}
