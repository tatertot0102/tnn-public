import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart2, Flame, Info, PlayCircle, Sparkles, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PublicLayout from '../../components/public/PublicLayout'
import { Spinner } from '../../components/ui'
import { getPlatform, getYoutubeThumbnail, hasPlacement } from '../../lib/constants'
import { attachCreators, creditPath, creditRoleLabel, visibleCredits } from '../../lib/creators'

const SECTION_LABELS = {
  hardnews: 'Hard News',
  features: 'Features',
  breaking: 'Breaking',
  docs: 'Documentaries',
  opinion: 'Opinion',
  sports: 'Sports',
  promo: 'Promo',
  catalog: 'Catalog',
}

const CATEGORIES = [
  { label: 'Breaking', slug: 'breaking' },
  { label: 'Hard News', slug: 'hardnews' },
  { label: 'Features', slug: 'features' },
  { label: 'Documentaries', slug: 'docs' },
  { label: 'Sports', slug: 'sports' },
  { label: 'Opinion', slug: 'opinion' },
]

function sectionLabel(value) {
  return SECTION_LABELS[value] || value || 'Video'
}

function thumbFor(video) {
  return video?.thumbnail || getYoutubeThumbnail(video?.href) || ''
}

export default function HomePage() {
  const [hero, setHero] = useState(null)
  const [breaking, setBreaking] = useState([])
  const [catalog, setCatalog] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const videosRes = await supabase.from('videos').select('*').eq('published', true)
        .order('display_order').order('created_at', { ascending: false })

      const data = await attachCreators(videosRes.data || [])
      const heroVid = data.find(v => hasPlacement(v, 'hero')) || data[0]
      const breakingVids = data.filter(v => hasPlacement(v, 'breaking-panel')).slice(0, 4)
      const catalogVids = data.filter(v => hasPlacement(v, 'homepage-catalog')).slice(0, 4)
      const promotedIds = new Set([
        heroVid?.id,
        ...breakingVids.map(v => v.id),
        ...catalogVids.map(v => v.id),
      ].filter(Boolean))
      const recentVids = data
        .filter(v => !promotedIds.has(v.id))
        .slice(0, 8)

      setHero(heroVid)
      setBreaking(breakingVids)
      setCatalog(catalogVids)
      setRecent(recentVids)
      setLoading(false)
    }
    load()
  }, [])

  const publicVideos = useMemo(() => {
    const seen = new Set()
    return [hero, ...breaking, ...catalog, ...recent].filter(video => {
      if (!video || seen.has(video.id)) return false
      seen.add(video.id)
      return true
    })
  }, [hero, breaking, catalog, recent])

  const tickerVideos = breaking
  const trending = publicVideos.slice(0, 10)
  const catalogVideos = catalog.length
    ? catalog
    : publicVideos.filter(video => !hasPlacement(video, 'breaking-panel')).slice(0, 4)
  const catalogFeature = catalogVideos[0] || hero
  const catalogSide = catalogVideos.filter(v => v?.id !== catalogFeature?.id).slice(0, 2)
  const catalogSmall = catalogVideos.filter(v => v?.id !== catalogFeature?.id && !catalogSide.find(s => s.id === v.id)).slice(0, 1)

  if (loading) {
    return (
      <PublicLayout>
        <div className="public-loading">
          <Spinner size={8} />
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      {tickerVideos.length > 0 && (
        <section className="breaking-ticker" aria-label="Latest headlines">
          <div className="breaking-label">
            <Flame size={15} />
            Breaking
          </div>
          <div className="breaking-track">
            <div>
              {tickerVideos.map(video => (
                <span key={video.id}>• {video.title}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="impact-hero">
        {hero && thumbFor(hero) && (
          <img className="impact-hero-bg" src={thumbFor(hero)} alt="" />
        )}
        <div className="impact-hero-shade" />
        <div className="impact-hero-content">
          <span className="impact-kicker">
            <Sparkles size={15} />
            Highlight
          </span>
          {hero ? (
            <div className="impact-hero-link">
              <h1>{hero.title}</h1>
              {hero.dek && <p>{hero.dek}</p>}
              <div className="impact-meta">
                <span>{sectionLabel(hero.section)}</span>
                {visibleCredits(hero).length > 0 && (
                  <span>
                    By <CreditLinks video={hero} />
                  </span>
                )}
                {hero.runtime && <span>{hero.runtime}</span>}
              </div>
              <div className="impact-action-row">
                <a href={hero.href} target="_blank" rel="noopener noreferrer" className="impact-play">
                  <PlayCircle size={20} />
                  Watch Story
                </a>
              </div>
            </div>
          ) : (
            <div className="impact-empty">
              <h1>Public videos are coming soon.</h1>
              <p>Add a published video in Video CMS to feature it here.</p>
            </div>
          )}
        </div>
      </section>

      {trending.length > 0 && (
        <section className="trending-strip" aria-label="Trending videos">
          <div className="trend-head">
            <h2>Trending Leaderboard</h2>
            <span>Top {trending.length} Public Videos</span>
          </div>
          <div className="trend-scroll">
            {trending.map((video, index) => {
              return <TrendCard key={video.id} video={video} rank={index + 1} />
            })}
          </div>
        </section>
      )}

      <section className="category-band">
        <div className="category-intro">
          <span>Explore</span>
          <h2>Stories by section</h2>
          <p>Quick paths into the public video catalog, without exposing internal newsroom tools.</p>
        </div>
        <div className="category-chips">
          {CATEGORIES.map(category => (
            <Link key={category.slug} to={`/videos/${category.slug}`}>
              {category.label}
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </section>

      {catalogFeature && (
        <section className="catalog-mosaic" id="catalog">
          <div className="catalog-title-row">
            <div>
              <h2>Catalog</h2>
              <p>
                <BarChart2 size={15} />
                Showing 4 featured catalog videos
              </p>
            </div>
            <Link to="/videos" className="section-link">All videos <ArrowRight size={14} /></Link>
          </div>

          <div className="mosaic-grid">
            <FeatureTile video={catalogFeature} />
            <div className="mosaic-side">
              {catalogSide.length ? catalogSide.map(video => (
                <FeatureTile key={video.id} video={video} compact />
              )) : (
                <div className="mosaic-empty">More public videos will appear here.</div>
              )}
            </div>
          </div>

          {catalogSmall.length > 0 && (
            <div className="mosaic-small-grid">
              {catalogSmall.map(video => <FeatureTile key={video.id} video={video} small />)}
            </div>
          )}
        </section>
      )}

      <section className="home-info" aria-label="TNN information">
        {[
          {
            label: 'Watch',
            title: 'Latest Videos',
            body: "Watch recent reporting, features, interviews, and school stories from Brooklyn Tech's student journalists.",
            link: 'Browse videos',
            to: '/videos',
          },
          {
            label: 'News',
            title: 'Hard News',
            body: 'Campus updates and reported pieces from the student newsroom.',
            link: 'Read the latest',
            to: '/videos/hardnews',
          },
          {
            label: 'Culture',
            title: 'Features',
            body: 'Profiles, explainers, and student-life stories from around the building.',
            link: 'See features',
            to: '/videos/features',
          },
        ].map(({ label, title, body, link, to }) => (
          <article key={label} className="home-info-item">
            <span>{label}</span>
            <h2>{title}</h2>
            <p>{body}</p>
            <Link to={to}>{link} <ArrowRight size={13} /></Link>
          </article>
        ))}
      </section>

    </PublicLayout>
  )
}

function CreditLinks({ video }) {
  const credits = visibleCredits(video)

  return (
    <>
      {credits.map((credit, index) => {
        const path = creditPath(credit)
        const roleLabel = creditRoleLabel(credit)
        const label = roleLabel ? `${credit.name} (${roleLabel})` : credit.name
        return (
          <Fragment key={`${credit.profile_id || credit.name}-${index}`}>
            {index > 0 && ', '}
            {path ? (
              <Link to={path} className="creator-inline-link">{label}</Link>
            ) : (
              label
            )}
          </Fragment>
        )
      })}
    </>
  )
}

function CreditDisclosure({ video, tone = 'light' }) {
  const [open, setOpen] = useState(false)
  const credits = visibleCredits(video)
  const preview = credits[0]

  if (!preview) return null

  return (
    <div className={`home-credit-disclosure ${tone} ${open ? 'open' : ''}`}>
      <div className="home-credit-preview">
        <CreditName credit={preview} />
        {credits.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen(value => !value)}
            aria-expanded={open}
            aria-label={open ? 'Hide full credits' : 'Show full credits'}
          >
            {open ? <X size={12} /> : <Info size={12} />}
            {open ? 'Hide' : `+${credits.length - 1}`}
          </button>
        )}
      </div>
      {open && credits.length > 1 && (
        <div className="home-credit-panel">
          {credits.map((credit, index) => (
            <div key={`${credit.profile_id || credit.name}-${index}`}>
              <CreditName credit={credit} />
              {creditRoleLabel(credit) && <span>{creditRoleLabel(credit)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CreditName({ credit }) {
  const path = creditPath(credit)
  if (path) return <Link to={path}>{credit.name}</Link>
  return <span>{credit.name}</span>
}

function TrendCard({ video, rank }) {
  const thumb = thumbFor(video)

  return (
    <article className={`trend-card rank-${rank}`}>
      <a href={video.href} target="_blank" rel="noopener noreferrer" className="trend-card-media">
        {thumb ? <img src={thumb} alt={video.title} /> : <div className="trend-placeholder">TNN</div>}
        <strong>#{rank}</strong>
      </a>
      <div className="trend-card-copy">
        <span>{sectionLabel(video.section)}</span>
        <a href={video.href} target="_blank" rel="noopener noreferrer">
          <h3>{video.title}</h3>
        </a>
        <small>{getPlatform(video.href) || 'Video'}{video.runtime ? ` • ${video.runtime}` : ''}</small>
        <CreditDisclosure video={video} tone="dark" />
      </div>
    </article>
  )
}

function FeatureTile({ video, compact = false, small = false }) {
  const thumb = thumbFor(video)
  const platform = getPlatform(video.href)

  return (
    <article className={`feature-tile ${compact ? 'compact' : ''} ${small ? 'small' : ''}`}>
      <a href={video.href} target="_blank" rel="noopener noreferrer" className="feature-tile-main">
        {thumb ? <img src={thumb} alt={video.title} /> : <div className="feature-placeholder">TNN</div>}
        <div className="feature-tile-overlay" />
        {platform && <span className="feature-platform">{platform}</span>}
        <div className="feature-tile-copy">
          <span>{sectionLabel(video.section)}</span>
          <h3>{video.title}</h3>
          {!small && video.dek && <p>{video.dek}</p>}
          <small>{video.date}{video.runtime ? ` • ${video.runtime}` : ''}</small>
        </div>
        <div className="tile-play">
          <PlayCircle size={small ? 22 : 30} />
        </div>
      </a>
      <CreditDisclosure video={video} tone="overlay" />
    </article>
  )
}
