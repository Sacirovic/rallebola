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
        <Link to="/" style={s.back}>← Home</Link>
        <div style={s.headerCenter}>
          <span style={{ fontSize: 20 }}>🚗</span>
          <span style={s.logo}>Road Trips</span>
        </div>
        <button style={s.logoutBtn} onClick={() => logout().then(() => navigate('/login'))}>
          Sign out
        </button>
      </header>

      <main style={s.main} className="page-main">
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
            {creating ? 'Adding…' : '+ New Trip'}
          </button>
        </form>

        {error && <div style={s.errorBox}>{error}</div>}
        {fetchError && <div style={s.errorBox}>{fetchError}</div>}

        {roadtrips.length === 0 ? (
          <div style={s.emptyState}>
            <span style={{ fontSize: 36 }}>🗺️</span>
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
                    {rt.date && <span>📅 {formatDate(rt.date)}</span>}
                    {rt.date && <span style={s.dot}>·</span>}
                    <span>👥 {rt.member_count + 1} traveller{rt.member_count !== 0 ? 's' : ''}</span>
                    <span style={s.dot}>·</span>
                    <span>✅ {rt.todo_count} task{rt.todo_count !== 1 ? 's' : ''}</span>
                    {rt.owner_id !== user?.id && (
                      <>
                        <span style={s.dot}>·</span>
                        <span style={s.ownerTag}>by {rt.owner_name}</span>
                      </>
                    )}
                  </div>
                </div>
                {rt.owner_id === user?.id && (
                  <button style={s.deleteBtn} onClick={() => deleteRoadtrip(rt.id)} title="Delete">✕</button>
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
  page: { minHeight: '100vh', background: '#F7F2E8' },
  header: {
    background: '#5C7A48',
    padding: '0 28px',
    height: 58,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '2px solid #D4A84A',
  },
  back: { color: '#C8E0A8', textDecoration: 'none', fontSize: 14, fontWeight: 500, minWidth: 60 },
  headerCenter: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  logo: { fontFamily: "'Lora', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#F5E4B0' },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #94C278',
    color: '#C8E0A8',
    borderRadius: 6,
    padding: '5px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    minWidth: 60,
  },
  main: { maxWidth: 900, margin: '0 auto', padding: '40px 20px' },
  createRow: { display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' as const },
  createInput: {
    flex: 1,
    padding: '11px 16px',
    borderRadius: 8,
    border: '1.5px solid #DDD0B0',
    background: '#FDFCF8',
    fontSize: 15,
    color: '#3C2A18',
    outline: 'none',
    minWidth: 140,
  },
  createBtn: {
    padding: '11px 22px',
    background: '#D4A84A',
    color: '#3C2A18',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  errorBox: {
    background: '#FBEEE8', color: '#C46A5A',
    border: '1px solid #F0C4BC', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, marginBottom: 16,
  },
  emptyState: {
    background: '#FDFCF8', border: '1.5px dashed #DDD0B0',
    borderRadius: 12, padding: '48px 24px', textAlign: 'center' as const,
  },
  emptyText: { color: '#A08060', marginTop: 10, fontSize: 15 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  card: {
    background: '#FDFCF8', border: '1.5px solid #DDD0B0',
    borderRadius: 10, display: 'flex', alignItems: 'center', overflow: 'hidden',
  },
  cardAccent: { width: 5, alignSelf: 'stretch', background: '#D4A84A', flexShrink: 0 },
  cardBody: {
    flex: 1, padding: '14px 18px',
    display: 'flex', flexDirection: 'column' as const, gap: 5,
  },
  cardTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontWeight: 600, fontSize: 17, color: '#4D6E3A', textDecoration: 'none',
  },
  cardMeta: {
    display: 'flex', gap: 6, flexWrap: 'wrap' as const,
    fontSize: 12, color: '#A08060', alignItems: 'center',
  },
  dot: { color: '#C4A882' },
  ownerTag: { color: '#9B7A5A', fontWeight: 500 },
  deleteBtn: {
    background: 'none', border: 'none', color: '#C4A882',
    fontSize: 15, cursor: 'pointer', padding: '0 16px',
    alignSelf: 'stretch', display: 'flex', alignItems: 'center',
  },
}
