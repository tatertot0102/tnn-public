import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/global.css'

// Public
import HomePage from './pages/public/HomePage'
import VideosPage from './pages/public/VideosPage'
import CreatorPage from './pages/public/CreatorPage'
import InfoPage from './pages/public/InfoPage'
import StoryPage from './pages/public/StoryPage'

// Auth
import LoginPage from './pages/admin/LoginPage'

// CMS (protected)
import DashboardPage from './pages/newsroom/DashboardPage'
import VideoCMSPage from './pages/newsroom/VideoCMSPage'
import TeamPage from './pages/newsroom/TeamPage'

function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }, [pathname, search])

  return null
}

const NOINDEX_PREFIXES = ['/login', '/newsroom', '/cms']

function RouteRobots() {
  const { pathname } = useLocation()
  useEffect(() => {
    const shouldNoindex = NOINDEX_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
    let tag = document.head.querySelector('meta[name="robots"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'robots')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', shouldNoindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large')
  }, [pathname])
  return null
}

function NotFoundPage() {
  useEffect(() => {
    let tag = document.head.querySelector('meta[name="robots"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'robots')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', 'noindex,follow')
    document.title = 'Page not found | TNN'
  }, [])
  return (
    <main style={{ padding: '6rem 1.5rem', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page not found</h1>
      <p style={{ marginBottom: '2rem' }}>The page you’re looking for doesn’t exist or has moved.</p>
      <a href="/" style={{ textDecoration: 'underline' }}>Return home</a>
    </main>
  )
}

function LegacyHashRedirect() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!window.location.hash.startsWith('#/')) return
    const legacyPath = window.location.hash.slice(1)
    navigate(legacyPath, { replace: true })
  }, [navigate, pathname, search])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LegacyHashRedirect />
        <ScrollToTop />
        <RouteRobots />
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<InfoPage />} />
          <Route path="/info" element={<Navigate to="/about/" replace />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/videos/story/:id/:slug?" element={<StoryPage />} />
          <Route path="/videos/:section" element={<VideosPage />} />
          <Route path="/staff/:id" element={<CreatorPage />} />
          <Route path="/creators/:id" element={<CreatorPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Newsroom / CMS — protected */}
          <Route path="/newsroom" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/newsroom/videos" element={<ProtectedRoute><VideoCMSPage /></ProtectedRoute>} />
          <Route path="/newsroom/segments/*" element={<ProtectedRoute><Navigate to="/newsroom" replace /></ProtectedRoute>} />
          <Route path="/newsroom/tasks" element={<ProtectedRoute><Navigate to="/newsroom" replace /></ProtectedRoute>} />
          <Route path="/newsroom/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />

          <Route path="/cms" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/cms/videos" element={<ProtectedRoute><VideoCMSPage /></ProtectedRoute>} />
          <Route path="/cms/segments/*" element={<ProtectedRoute><Navigate to="/cms" replace /></ProtectedRoute>} />
          <Route path="/cms/tasks" element={<ProtectedRoute><Navigate to="/cms" replace /></ProtectedRoute>} />
          <Route path="/cms/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
