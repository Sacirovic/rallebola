import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.wrapper}>
        <div style={s.brand}>
          <span className="material-icons-outlined" style={s.brandIcon}>eco</span>
          <h1 style={s.brandName}>Rallebola</h1>
          <p style={s.brandSub}>Create your account</p>
        </div>

        <div style={s.card}>
          {error && (
            <div style={s.error}>
              <span className="material-icons-outlined" style={{ fontSize: 16, marginRight: 6 }}>error_outline</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Name</label>
              <input
                style={s.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoFocus
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                required
              />
            </div>
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p style={s.foot}>
            Already have an account?{' '}
            <Link to="/login" style={s.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#F8FAFC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  wrapper: { width: '100%', maxWidth: 360 },
  brand: { textAlign: 'center' as const, marginBottom: 24 },
  brandIcon: { fontSize: 36, color: '#16A34A', display: 'block', marginBottom: 8 },
  brandName: { fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' },
  brandSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: '28px 28px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  error: {
    background: '#FEF2F2', color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: 8, padding: '10px 14px', fontSize: 13,
    marginBottom: 18, display: 'flex', alignItems: 'center',
  },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151', letterSpacing: '0.2px' },
  input: {
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    width: '100%',
  },
  btn: {
    marginTop: 4,
    padding: '10px',
    background: '#16A34A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    width: '100%',
  },
  foot: { marginTop: 20, textAlign: 'center' as const, fontSize: 13, color: '#6B7280' },
  link: { color: '#16A34A', fontWeight: 500, textDecoration: 'none' },
}
