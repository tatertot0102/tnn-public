import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Film, Instagram, Linkedin } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import { VideoCard } from '../../components/public/VideoCard'
import { Spinner } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { attachCreators, fetchCreatorById, staffPath, staffSlug, visibleCredits } from '../../lib/creators'
import { useSeoMeta } from '../../lib/seo'
import { thumbnailForVideo } from '../../lib/constants'

const PROFILE_ROLE_LABELS = {
  exec: 'Executive',
  associate: 'Junior Executive',
  member: 'Member',
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

function publicRoleForProfile(profile) {
  if (profile?.public_role) return profile.public_role
  if (profile?.role === 'admin' || profile?.role === 'exec') return 'exec'
  return profile?.role || 'member'
}

function normalizeSocials(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function instagramUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://www.instagram.com/${raw.replace(/^@/, '').replace(/^instagram\.com\//, '').replace(/^www\.instagram\.com\//, '')}`
}

function linkedinUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://www.linkedin.com/in/${raw.replace(/^@/, '').replace(/^linkedin\.com\/in\//, '').replace(/^www\.linkedin\.com\/in\//, '')}`
}

function staffSocialLinks(profile) {
  const socials = normalizeSocials(profile?.public_socials)
  return [
    socials.instagram && {
      label: 'Instagram',
      href: instagramUrl(socials.instagram),
      icon: Instagram,
    },
    socials.linkedin && {
      label: 'LinkedIn',
      href: linkedinUrl(socials.linkedin),
      icon: Linkedin,
    },
  ].filter(link => link?.href)
}

export default function CreatorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [creator, setCreator] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const creatorName = creator?.full_name || 'TNN Staff Member'
  const isPublicCreator = creator && creator.public_visible !== false
  const categoryLabel = displayProfileRole(publicRoleForProfile(creator))
  const customTitle = creator?.public_title?.trim() || ''
  const roleLabel = customTitle || categoryLabel
  const canonicalPath = isPublicCreator ? staffPath(creator) : `/staff/${id}/`
  const showCategory = Boolean(customTitle && categoryLabel && customTitle.toLowerCase() !== categoryLabel.toLowerCase())
  const socialLinks = staffSocialLinks(creator)
  const profileDescription = isPublicCreator
    ? creator.public_description || "Part of Tech News Network, Brooklyn Tech's student-run broadcast journalism outlet."
    : 'TNN staff profile for Tech News Network, Brooklyn Tech’s student-run broadcast journalism outlet.'
  const jsonLd = useMemo(() => isPublicCreator ? {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: creatorName,
    alternateName: `${creatorName} TNN`,
    jobTitle: roleLabel,
    url: `${window.location.origin}${canonicalPath}`,
    worksFor: {
      '@type': 'NewsMediaOrganization',
      name: 'Tech News Network',
    },
    sameAs: socialLinks.map(link => link.href),
    image: creator?.public_headshot_url || undefined,
    mainEntityOfPage: `${window.location.origin}${canonicalPath}`,
    subjectOf: videos.slice(0, 8).map(video => ({
      '@type': 'VideoObject',
      name: video.title,
      description: video.dek || video.title,
      url: video.href,
      uploadDate: video.created_at,
      thumbnailUrl: thumbnailForVideo(video) || undefined,
    })),
  } : null, [isPublicCreator, creatorName, roleLabel, canonicalPath, videos, socialLinks])

  useSeoMeta({
    title: loading ? 'Staff Profile | TNN' : `${creatorName} | TNN Staff Profile | Brooklyn Tech`,
    description: profileDescription,
    path: canonicalPath,
    type: 'profile',
    keywords: creator ? `${creatorName}, ${creatorName} TNN, ${creatorName} Brooklyn Tech, TNN staff, Tech News Network, Brooklyn Tech journalism` : 'TNN staff profile, Tech News Network',
    noindex: !loading && !isPublicCreator,
    image: creator?.public_headshot_url || thumbnailForVideo(videos.find(video => thumbnailForVideo(video))),
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
      const resolvedProfileId = profile?.id || id
      const resolvedSlug = staffSlug(profile || id)
      const creditedVideos = enriched.filter(video => (
        video.creator_id === resolvedProfileId ||
        visibleCredits(video).some(credit => (
          credit.profile_id === resolvedProfileId ||
          staffSlug(credit.name || credit.profile_id) === resolvedSlug
        ))
      ))
      const creditProfile = creditedVideos
        .flatMap(video => visibleCredits(video))
        .find(credit => (
          credit.profile_id === resolvedProfileId ||
          staffSlug(credit.name || credit.profile_id) === resolvedSlug
        ))

      setCreator(profile || (creditProfile ? {
        id: creditProfile.profile_id || id,
        full_name: creditProfile.name,
        role: creditProfile.role || 'member',
        public_role: 'member',
        public_title: creditProfile.role || '',
        public_description: '',
        public_socials: {},
        public_visible: true,
      } : null))
      setVideos(creditedVideos)
      setLoading(false)

      if (profile) {
        const nextPath = staffPath(profile)
        if (nextPath && nextPath !== `/staff/${id}/`) navigate(nextPath, { replace: true })
      }
    }
    load()
  }, [id, navigate])

  return (
    <PublicLayout>
      {loading ? (
        <div className="public-loading">
          <Spinner size={8} />
        </div>
      ) : (
        <main className="creator-page">
          <Link to="/videos/" className="creator-back">
            <ArrowLeft size={15} /> All videos
          </Link>

          <section className="creator-hero">
            <div className="creator-avatar">
              {(creator?.full_name || 'TNN').slice(0, 1)}
              {creator?.public_headshot_url && (
                <img
                  src={creator.public_headshot_url}
                  alt={`${creatorName} headshot`}
                  decoding="async"
                  onError={event => { event.currentTarget.hidden = true }}
                />
              )}
            </div>
            <div>
              <span>Staff Profile</span>
              <h1>{creatorName}</h1>
              <strong className="creator-role-label">{roleLabel}</strong>
              {showCategory && <small className="creator-category-label">{categoryLabel}</small>}
              <p>
                {profileDescription}
              </p>
              <p className="creator-video-count">
                {videos.length
                  ? `${videos.length} credited video${videos.length === 1 ? '' : 's'}`
                  : 'No public videos are credited to this staff profile yet.'}
              </p>
              {socialLinks.length > 0 && (
                <div className="creator-social-links" aria-label={`${creatorName} social links`}>
                  {socialLinks.map(({ label, href, icon: Icon }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                      <Icon size={15} />
                      {label}
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
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
                Published videos credited to this staff profile will appear here.
              </div>
            )}
          </section>
        </main>
      )}
    </PublicLayout>
  )
}
