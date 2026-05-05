import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/global.css'

// Public
import HomePage from './pages/public/HomePage'
import VideosPage from './pages/public/VideosPage'
import CreatorPage from './pages/public/CreatorPage'
import InfoPage from './pages/public/InfoPage'

// Auth
import LoginPage from './pages/admin/LoginPage'

// CMS (protected)
import DashboardPage from './pages/newsroom/DashboardPage'
import VideoCMSPage from './pages/newsroom/VideoCMSPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/info" element={<InfoPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/videos/:section" element={<VideosPage />} />
          <Route path="/creators/:id" element={<CreatorPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Newsroom / CMS — protected */}
          <Route path="/newsroom" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/newsroom/videos" element={<ProtectedRoute><VideoCMSPage /></ProtectedRoute>} />
          <Route path="/newsroom/segments/*" element={<ProtectedRoute><Navigate to="/newsroom" replace /></ProtectedRoute>} />
          <Route path="/newsroom/tasks" element={<ProtectedRoute><Navigate to="/newsroom" replace /></ProtectedRoute>} />
          <Route path="/newsroom/team" element={<ProtectedRoute><Navigate to="/newsroom" replace /></ProtectedRoute>} />

          <Route path="/cms" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/cms/videos" element={<ProtectedRoute><VideoCMSPage /></ProtectedRoute>} />
          <Route path="/cms/segments/*" element={<ProtectedRoute><Navigate to="/cms" replace /></ProtectedRoute>} />
          <Route path="/cms/tasks" element={<ProtectedRoute><Navigate to="/cms" replace /></ProtectedRoute>} />
          <Route path="/cms/team" element={<ProtectedRoute><Navigate to="/cms" replace /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
