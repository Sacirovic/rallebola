import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page} className="auth-page">
      <div style={s.panel} className="auth-panel">
        <div style={s.panelInner}>
          <div style={s.logo}>Rallebola</div>
          <p style={s.tagline}>Your homestead,<br />organised.</p>
          <div style={s.deco}>
            <span>🌲</span>
            <span style={{ fontSize: 52 }}>🏚</span>
            <span>🌲</span>
            <span>🌲</span>
          </div>
          <div style={s.grain}>🌾 Track · Share · Borrow</div>
        </div>
      </div>

      <div style={s.formSide} className="auth-form-side">
        <div style={s.card} className="auth-card">
          <h2 style={s.title}>Welcome back</h2>
          <p style={s.sub}>Sign in to your inventory</p>

          {error && <div style={s.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={s.form}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@farm.com"
              required
              autoFocus
            />
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={s.foot}>
            No account?{' '}
            <Link to="/register" style={s.link}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { display: 'flex', minHeight: '100vh' },
  panel: {
    width: '42%',
    background: 'linear-gradient(160deg, #5C7A48 0%, #7AA85E 50%, #94C278 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  panelInner: { textAlign: 'center' },
  logo: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 42,
    fontWeight: 700,
    color: '#F5E4B0',
    marginBottom: 12,
  },
  tagline: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 20,
    color: '#E0EED0',
    lineHeight: 1.6,
    marginBottom: 40,
  },
  deco: {
    fontSize: 44,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 32,
  },
  grain: {
    color: '#C8E0A8',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    fontWeight: 600,
  },
  formSide: {
    flex: 1,
    background: '#F7F2E8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    background: '#FDFCF8',
    border: '1.5px solid #DDD0B0',
    borderRadius: 16,
    padding: '44px 48px',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 26,
    fontWeight: 700,
    color: '#3C2A18',
    marginBottom: 4,
  },
  sub: { fontSize: 14, color: '#A08060', marginBottom: 28 },
  error: {
    background: '#FBEEE8',
    color: '#C46A5A',
    border: '1px solid #F0C4BC',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 20,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#6E4E30', marginBottom: 2 },
  input: {
    padding: '11px 14px',
    borderRadius: 8,
    border: '1.5px solid #DDD0B0',
    background: '#F7F2E8',
    fontSize: 15,
    color: '#3C2A18',
    marginBottom: 12,
    outline: 'none',
  },
  btn: {
    marginTop: 4,
    padding: '13px',
    background: '#6B9652',
    color: '#F7F2E8',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  },
  foot: { marginTop: 24, textAlign: 'center' as const, fontSize: 13, color: '#A08060' },
  link: { color: '#6B9652', fontWeight: 600, textDecoration: 'none' },
}
