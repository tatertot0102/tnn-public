import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, Search, X } from 'lucide-react'
import tnnLogo from '../../assets/tnn-logo.png'

const sections = [
  { label: 'Hard News', slug: 'hardnews' },
  { label: 'Features', slug: 'features' },
  { label: 'Breaking', slug: 'breaking' },
  { label: 'Docs', slug: 'docs' },
  { label: 'Opinion', slug: 'opinion' },
  { label: 'Sports', slug: 'sports' },
  { label: 'Promo', slug: 'promo' },
]

const HEADER_COLLAPSE_AT = 150
const HEADER_EXPAND_AT = 24

export default function PublicLayout({ children }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let frame = null

    const updateHeaderState = () => {
      const y = window.scrollY
      setScrolled(isCompressed => {
        if (isCompressed) return y > HEADER_EXPAND_AT
        return y > HEADER_COLLAPSE_AT
      })
      frame = null
    }

    const onScroll = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(updateHeaderState)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    const cleanQuery = query.trim()
    if (!cleanQuery) return

    navigate(`/videos?q=${encodeURIComponent(cleanQuery)}`)
    setSearchOpen(false)
    setQuery('')
  }

  return (
    <div className="public-shell">
      <header className={`public-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="public-kicker">
          <span>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span>Brooklyn Tech's Student Newsroom</span>
          <div className="public-kicker-links">
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
            <Link to="/login">Staff Sign In</Link>
          </div>
        </div>

        <div className="public-masthead">
          <nav className="public-primary-links" aria-label="Primary navigation">
            <Link to="/videos">Videos</Link>
            <Link to="/info">Info</Link>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">Join</a>
          </nav>

          <Link to="/" className="public-logo" aria-label="TNN home">
            <img src={tnnLogo} alt="" />
          </Link>

          <div className="public-actions">
            {searchOpen ? (
              <form className="public-search" onSubmit={handleSearch}>
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search videos"
                />
                <button type="button" className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                  <X size={17} />
                </button>
              </form>
            ) : (
              <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Search videos">
                <Search size={19} />
              </button>
            )}
            <div className="public-notice-wrap">
              <button className="icon-button notice-button" onClick={() => setNoticeOpen(open => !open)} aria-label="Notifications">
                <Bell size={18} />
                <span />
              </button>
              {noticeOpen && (
                <div className="public-notice">
                  <strong>TNN is live</strong>
                  <p>Browse the latest public videos. Staff newsroom tools remain behind sign-in.</p>
                </div>
              )}
            </div>
            <a className="pub-btn-sub" href="https://youtube.com" target="_blank" rel="noopener noreferrer">
              Subscribe
            </a>
          </div>
        </div>

        <nav id="public-section-nav" className="public-nav" aria-label="Video sections">
          <NavLink to="/videos" end className={({ isActive }) => isActive ? 'pub-nav-link active' : 'pub-nav-link'}>
            All
          </NavLink>
          {sections.map(section => (
            <NavLink
              key={section.slug}
              to={`/videos/${section.slug}`}
              className={({ isActive }) => isActive ? 'pub-nav-link active' : 'pub-nav-link'}
            >
              {section.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <div>
            <div className="public-footer-logo">TNN</div>
            <p>Tech News Network, Brooklyn Technical High School</p>
          </div>
          <div className="public-footer-links">
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
            <Link to="/login">Staff Sign In</Link>
            <Link to="/videos">All Videos</Link>
          </div>
        </div>
        <div className="public-copyright">
          © {new Date().getFullYear()} Tech News Network.
        </div>
      </footer>
    </div>
  )
}
