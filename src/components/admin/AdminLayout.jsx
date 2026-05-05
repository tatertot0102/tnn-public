import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  ChevronLeft, ChevronRight, ExternalLink, Globe, Layers,
  LayoutDashboard, LogOut
} from 'lucide-react'
import tnnLogo from '../../assets/tnn-logo.png'

const FULL_NEWSROOM_URL = 'https://tatertot0102.github.io/tnn-platform/dashboard'

const navItems = [
  { to: '/newsroom', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/newsroom/videos', icon: Layers, label: 'Video CMS' },
]

export default function AdminLayout({ children }) {
  const { profile, isExec, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className={`adm-layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="adm-sidebar">
        {/* Logo */}
        <div className="adm-brand">
          <div className="adm-brand-row">
            <img src={tnnLogo} alt="" className="adm-brand-logo" />
            {!collapsed && (
              <div>
                <span className="adm-brand-title">TNN</span>
                <span className="adm-brand-badge">STAFF</span>
              </div>
            )}
            <button
              className="adm-collapse-btn"
              onClick={() => setCollapsed(value => !value)}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          {profile && !collapsed && (
            <p className="adm-profile-name">
              {profile.full_name}
              {isExec && <span style={{ color: 'var(--adm-accent)', marginLeft: 6 }}>· Exec</span>}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              fontSize: 13, fontWeight: 500,
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: isActive ? '#fff' : 'var(--adm-muted)',
              background: isActive ? 'var(--adm-accent)' : 'transparent',
              transition: 'all 0.15s',
            })}
            title={collapsed ? label : undefined}>
              <Icon size={16} />
              {!collapsed && label}
            </NavLink>
          ))}
          <a href={FULL_NEWSROOM_URL} target="_blank" rel="noopener noreferrer" className="adm-external-link" title={collapsed ? 'Full Newsroom' : undefined}>
            <ExternalLink size={16} />
            {!collapsed && 'Full Newsroom'}
          </a>
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--adm-border)' }}>
          <NavLink to="/" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, marginBottom: 2,
            fontSize: 13, color: 'var(--adm-muted)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <Globe size={16} /> {!collapsed && 'View Public Site'}
          </NavLink>
          <button onClick={handleSignOut} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8,
            fontSize: 13, color: 'var(--adm-muted)',
            background: 'none', border: 'none', width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <LogOut size={16} /> {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      <main className="adm-main">
        {children}
      </main>
    </div>
  )
}
