import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Film } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import { VideoCard } from '../../components/public/VideoCard'
import { Spinner } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { attachCreators, fetchCreatorById, visibleCredits } from '../../lib/creators'
import { useSeoMeta } from '../../lib/seo'

const PROFILE_ROLE_LABELS = {
  exec: 'Executive',
  admin: 'Administrator',
  reporter: 'Reporter',
  editor: 'Editor',
  anchor: 'Anchor',
  producer: 'Producer',
  camera: 'Camera Operator',
  camera_op: 'Camera Operator',
}

function displayProfileRole(role) {
  if (!role) return 'TNN Contributor'
  return PROFILE_ROLE_LABELS[role] || role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function CreatorPage() {
  const { id } = useParams()
  const [creator, setCreator] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const creatorName = creator?.full_name || 'TNN Creator'
  const roleLabel = displayProfileRole(creator?.role)
  const profileDescription = creator
    ? `${creatorName}, ${roleLabel} on Tech News Network. Watch public videos and segments connected to this Brooklyn Tech student newsroom profile.`
    : 'TNN creator profile for Tech News Network, Brooklyn Tech’s student-run video newsroom.'
  const jsonLd = useMemo(() => creator ? {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: creatorName,
    jobTitle: roleLabel,
    url: `${window.location.origin}/creators/${id}`,
    worksFor: {
      '@type': 'NewsMediaOrganization',
      name: 'Tech News Network',
    },
    mainEntityOfPage: `${window.location.origin}/creators/${id}`,
    subjectOf: videos.slice(0, 8).map(video => ({
      '@type': 'VideoObject',
      name: video.title,
      description: video.dek || video.title,
      url: video.href,
      uploadDate: video.created_at,
      thumbnailUrl: video.thumbnail || undefined,
    })),
  } : null, [creator, creatorName, roleLabel, id, videos])

  useSeoMeta({
    title: loading ? 'Creator | TNN' : `${creatorName} | TNN`,
    description: profileDescription,
    path: `/creators/${id}`,
    type: 'profile',
    noindex: !loading && !creator,
    image: videos.find(video => video.thumbnail)?.thumbnail,
    jsonLd,
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [profile, videoResult] = await Promise.all([
        fetchCreatorById(id),
        supabase.from('videos').select('*').eq('published', true)
          .order('display_order').order('created_at', { ascending: false }),
      ])

      const enriched = await attachCreators(videoResult.data || [])
      const creditedVideos = enriched.filter(video => (
        video.creator_id === id ||
        visibleCredits(video).some(credit => credit.profile_id === id)
      ))
      setCreator(profile)
      setVideos(creditedVideos)
      setLoading(false)
    }
    load()
  }, [id])

  return (
    <PublicLayout>
      {loading ? (
        <div className="public-loading">
          <Spinner size={8} />
        </div>
      ) : (
        <main className="creator-page">
          <Link to="/videos" className="creator-back">
            <ArrowLeft size={15} /> All videos
          </Link>

          <section className="creator-hero">
            <div className="creator-avatar">
              {(creator?.full_name || 'TNN').slice(0, 1)}
            </div>
            <div>
              <span>Creator</span>
              <h1>{creatorName}</h1>
              <strong className="creator-role-label">{roleLabel}</strong>
              <p>
                {videos.length
                  ? `${videos.length} public video${videos.length === 1 ? '' : 's'} connected to this profile.`
                  : 'No public videos are connected to this profile yet.'}
              </p>
              <div className="creator-profile-notes">
                <span>Public portfolio</span>
                <span>Credits update as videos are published</span>
                <span>More profile details coming soon</span>
              </div>
            </div>
          </section>

          <section className="creator-videos">
            <div className="section-rule">
              <span className="section-rule-label">
                <Film size={14} /> Public Videos
              </span>
              <div className="section-rule-line" />
            </div>
            {videos.length ? (
              <div className="video-grid three">
                {videos.map((video, index) => (
                  <VideoCard key={video.id} video={video} animDelay={index * 0.04} />
                ))}
              </div>
            ) : (
              <div className="creator-empty">
                Published videos linked to this creator will appear here.
              </div>
            )}
          </section>
        </main>
      )}
    </PublicLayout>
  )
}
