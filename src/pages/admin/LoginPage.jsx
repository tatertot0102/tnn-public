import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/newsroom')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--adm-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: '#fff', letterSpacing: '-1px' }}>
            TNN
          </div>
          <div style={{ fontSize: 11, color: 'var(--adm-muted)', letterSpacing: 0, textTransform: 'uppercase', marginTop: 4 }}>
            Newsroom Login
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'var(--adm-surface)',
          border: '1px solid var(--adm-border2)',
          borderRadius: 16, padding: 28,
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--adm-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0 }}>
              Email
            </label>
            <input
              className="adm-input"
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required autoFocus
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--adm-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0 }}>
              Password
            </label>
            <input
              className="adm-input"
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ background: '#7f1d1d22', border: '1px solid #991b1b', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <button type="submit" className="adm-btn primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }} disabled={loading}>
            {loading ? <Spinner size={4} /> : null}
            Sign In
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/" style={{ fontSize: 12, color: 'var(--adm-muted)' }}>← Back to TNN</Link>
        </div>
      </div>
    </div>
  )
}
