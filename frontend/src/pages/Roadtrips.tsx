import { useState, useEffect, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

interface Roadtrip {
  id: number
  name: string
  date: string | null
  owner_id: number
  owner_name: string
  member_count: number
  todo_count: number
}

export default function Roadtrips() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [roadtrips, setRoadtrips] = useState<Roadtrip[]>([])
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [fetchError, setFetchError] = useState('')

  useEffect(() => { fetchRoadtrips() }, [])

  const fetchRoadtrips = async () => {
    try {
      const res = await client.get('/roadtrips')
      setRoadtrips(res.data)
    } catch (err: any) {
      setFetchError(err.response?.data?.error ?? 'Failed to load road trips')
    }
  }

  const createRoadtrip = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await client.post('/roadtrips', { name: newName.trim(), date: newDate || null })
      setRoadtrips((prev) => [res.data, ...prev])
      setNewName('')
      setNewDate('')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create road trip')
    } finally {
      setCreating(false)
    }
  }

  const deleteRoadtrip = async (id: number) => {
    if (!confirm('Delete this road trip and all its data?')) return
    await client.delete(`/roadtrips/${id}`)
    setRoadtrips((prev) => prev.filter((r) => r.id !== id))
  }

  const formatDate = (d: string | null) => {
    if (!d) return null
    const [year, month, day] = d.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return (
    <div style={s.page}>
      <header style={s.header} className="app-header">
        <Link to="/" style={s.logo}>
          <span className="material-icons-outlined" style={s.logoIcon}>eco</span>
          Rallebola
        </Link>
        <nav style={s.nav} className="app-nav">
          <Link to="/my-lists" style={s.navLink}>My Lists</Link>
          <Link to="/roadtrips" style={s.navLinkActive}>Road Trips</Link>
        </nav>
        <div style={s.headerRight}>
          <span style={s.navUser} className="nav-user">
            <span className="material-icons-outlined" style={{ fontSize: 16, color: '#9CA3AF' }}>person</span>
            {user?.name}
          </span>
          <button style={s.logoutBtn} onClick={() => logout().then(() => navigate('/login'))}>
            Sign out
          </button>
        </div>
      </header>

      <main style={s.main} className="page-main">
        <h2 style={s.sectionTitle}>
          <span className="material-icons-outlined" style={s.sectionIcon}>directions_car</span>
          Road Trips
        </h2>

        <form onSubmit={createRoadtrip} style={s.createRow} className="create-row">
          <input
            style={s.createInput}
            placeholder="Name your road trip…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            style={{ ...s.createInput, flex: '0 0 160px' as any, minWidth: 140 }}
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            title="Trip date (optional)"
          />
          <button style={s.createBtn} type="submit" disabled={creating}>
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span>
            {creating ? 'Adding…' : 'New Trip'}
          </button>
        </form>

        {error && <div style={s.errorBox}>{error}</div>}
        {fetchError && <div style={s.errorBox}>{fetchError}</div>}

        {roadtrips.length === 0 ? (
          <div style={s.emptyState}>
            <span className="material-icons-outlined" style={s.emptyIcon}>map</span>
            <p style={s.emptyText}>No road trips yet. Plan your first adventure above.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {roadtrips.map((rt) => (
              <div key={rt.id} style={s.card}>
                <div style={s.cardAccent} />
                <div style={s.cardBody}>
                  <Link to={`/roadtrips/${rt.id}`} style={s.cardTitle}>{rt.name}</Link>
                  <div style={s.cardMeta}>
                    {rt.date && (
                      <>
                        <span className="material-icons-outlined" style={{ fontSize: 12 }}>calendar_today</span>
                        <span>{formatDate(rt.date)}</span>
                        <span style={s.dot}>·</span>
                      </>
                    )}
                    <span className="material-icons-outlined" style={{ fontSize: 12 }}>group</span>
                    <span>{rt.member_count + 1} traveller{rt.member_count !== 0 ? 's' : ''}</span>
                    <span style={s.dot}>·</span>
                    <span className="material-icons-outlined" style={{ fontSize: 12 }}>checklist</span>
                    <span>{rt.todo_count} task{rt.todo_count !== 1 ? 's' : ''}</span>
                    {rt.owner_id !== user?.id && (
                      <>
                        <span style={s.dot}>·</span>
                        <span style={s.ownerTag}>by {rt.owner_name}</span>
                      </>
                    )}
                  </div>
                </div>
                {rt.owner_id === user?.id && (
                  <button style={s.deleteBtn} onClick={() => deleteRoadtrip(rt.id)} title="Delete">
                    <span className="material-icons-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#F8FAFC' },
  header: {
    background: '#FFFFFF', padding: '0 24px', height: 56,
    display: 'flex', alignItems: 'center',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky' as const, top: 0, zIndex: 10,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  logo: { fontSize: 15, fontWeight: 700, color: '#111827', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 },
  logoIcon: { fontSize: 20, color: '#16A34A' },
  nav: { display: 'flex', alignItems: 'center', gap: 2, marginLeft: 20 },
  navLink: { padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#6B7280', textDecoration: 'none' },
  navLinkActive: { padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#16A34A', textDecoration: 'none', background: '#F0FDF4' },
  headerRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  navUser: { fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 },
  logoutBtn: {
    background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280',
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13,
  },
  main: { maxWidth: 900, margin: '0 auto', padding: '40px 24px' },
  sectionTitle: {
    fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 6,
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  sectionIcon: { fontSize: 18, color: '#9CA3AF' },
  createRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const },
  createInput: {
    flex: 1, padding: '9px 12px',
    borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 14, color: '#111827', outline: 'none', minWidth: 140,
  },
  createBtn: {
    padding: '9px 16px', background: '#D97706', color: '#FFFFFF',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const,
  },
  errorBox: {
    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
  },
  emptyState: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 10, padding: '48px 24px', textAlign: 'center' as const,
  },
  emptyIcon: { fontSize: 36, color: '#D1D5DB', display: 'block', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  card: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 8, display: 'flex', alignItems: 'center', overflow: 'hidden',
  },
  cardAccent: { width: 3, alignSelf: 'stretch', background: '#F59E0B', flexShrink: 0 },
  cardBody: {
    flex: 1, padding: '12px 16px',
    display: 'flex', flexDirection: 'column' as const, gap: 5,
  },
  cardTitle: { fontWeight: 500, fontSize: 14, color: '#111827', textDecoration: 'none' },
  cardMeta: {
    display: 'flex', gap: 5, flexWrap: 'wrap' as const,
    fontSize: 12, color: '#9CA3AF', alignItems: 'center',
  },
  dot: { color: '#D1D5DB' },
  ownerTag: { color: '#6B7280', fontWeight: 500 },
  deleteBtn: {
    background: 'none', border: 'none', color: '#D1D5DB',
    cursor: 'pointer', padding: '0 16px',
    alignSelf: 'stretch', display: 'flex', alignItems: 'center',
  },
}
