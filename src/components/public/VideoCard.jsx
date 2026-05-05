import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, X } from 'lucide-react'
import { getPlatform, getYoutubeThumbnail, SECTION_COLORS } from '../../lib/constants'
import { creditPath, creditRoleLabel, visibleCredits } from '../../lib/creators'

const SECTION_LABELS = {
  hardnews: 'Hard News',
  features: 'Features',
  breaking: 'Breaking',
  docs: 'Docs',
  opinion: 'Opinion',
  sports: 'Sports',
  promo: 'Promo',
  catalog: 'Catalog',
}

export function VideoCard({ video, size = 'md', animDelay = 0 }) {
  const [creditsOpen, setCreditsOpen] = useState(false)
  const platform = getPlatform(video.href)
  const autoThumb = getYoutubeThumbnail(video.href)
  const thumb = video.thumbnail || autoThumb
  const sectionColor = SECTION_COLORS[video.section] || 'var(--tnn-blue)'
  const isLg = size === 'lg'
  const credits = visibleCredits(video)
  const previewCredit = credits[0]

  const dotClass =
    platform === 'YouTube' ? 'platform-dot-yt' :
    platform === 'Instagram' ? 'platform-dot-ig' : 'platform-dot-web'

  return (
    <article
      className={`pub-video-card anim-fade-up`}
      style={{ display: 'block', color: 'inherit', animationDelay: `${animDelay}s` }}
    >
      {/* Thumbnail */}
      <a
        href={video.href}
        target="_blank"
        rel="noopener noreferrer"
        className="pub-thumb-wrap"
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: '16/9',
          background: 'var(--pub-surface)',
          marginBottom: isLg ? 16 : 11,
          borderRadius: 0,
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={video.title}
            className="pub-thumb-img"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'var(--pub-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PlayIcon />
          </div>
        )}

        {/* Badges */}
        {video.runtime && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.82)', color: '#fff',
            fontSize: 11, fontWeight: 700, padding: '3px 7px',
            letterSpacing: 0,
          }}>
            {video.runtime}
          </div>
        )}
        {platform && (
          <div className="platform-pill" style={{ position: 'absolute', bottom: 8, left: 8 }}>
            <span className={dotClass} />
            {platform}
          </div>
        )}

        {/* Blue glow play button - shows on hover via parent */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: isLg ? 52 : 40, height: isLg ? 52 : 40,
            borderRadius: '50%',
            background: 'rgba(17,17,17,0.78)',
            border: '1px solid rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.25s ease',
          }}
            className="pub-play-center"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2.5L13.5 8 4 13.5V2.5Z" fill="white" />
            </svg>
          </div>
        </div>
      </a>

      {/* Section tag */}
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: 0, textTransform: 'uppercase',
        color: sectionColor, marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ width: 12, height: 2, background: sectionColor, display: 'inline-block', borderRadius: 1 }} />
        {SECTION_LABELS[video.section] || video.section}
      </div>

      {/* Title */}
      <a
        href={video.href}
        target="_blank"
        rel="noopener noreferrer"
        className="pub-card-title"
        style={{
          display: 'block',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: isLg ? 22 : 15,
          lineHeight: 1.25,
          color: 'var(--pub-text)',
          marginBottom: isLg ? 10 : 8,
        }}
      >
        {video.title}
      </a>

      {/* Dek — large only */}
      {isLg && video.dek && (
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 14, fontWeight: 300, lineHeight: 1.7,
          color: 'var(--pub-muted)', marginBottom: 12,
        }}>
          {video.dek}
        </div>
      )}

      {/* Meta */}
      <div className="video-card-meta">
        {previewCredit && (
          <CreditName credit={previewCredit} />
        )}
        {credits.length > 1 && (
          <button
            type="button"
            className="video-credit-info"
            onClick={() => setCreditsOpen(open => !open)}
            aria-expanded={creditsOpen}
            aria-label={creditsOpen ? 'Hide video credits' : 'View all video credits'}
          >
            {creditsOpen ? <X size={12} /> : <Info size={12} />}
            {creditsOpen ? 'Hide' : `View ${credits.length - 1} more`}
          </button>
        )}
        {previewCredit && video.date && <span style={{ opacity: 0.4 }}>·</span>}
        {video.date && <span>{video.date}</span>}
      </div>

      {creditsOpen && credits.length > 1 && (
        <div className="video-credit-panel">
          {credits.map((credit, index) => (
            <div key={`${credit.profile_id || credit.name}-${index}`} className="video-credit-row">
              <CreditName credit={credit} />
              {creditRoleLabel(credit) && <span>{creditRoleLabel(credit)}</span>}
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function CreditName({ credit }) {
  const path = creditPath(credit)

  if (path) {
    return <Link to={path} className="creator-card-link">{credit.name}</Link>
  }

  return <span style={{ fontWeight: 600, color: 'var(--pub-text)', opacity: 0.6 }}>{credit.name}</span>
}

function PlayIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="rgba(3,31,92,0.4)" />
      <circle cx="18" cy="18" r="17" stroke="rgba(26,82,232,0.4)" strokeWidth="1" />
      <path d="M14 11.5L25.5 18 14 24.5V11.5Z" fill="rgba(255,255,255,0.5)" />
    </svg>
  )
}
