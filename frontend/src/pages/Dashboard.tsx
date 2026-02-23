import { useState, useEffect, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

interface InventoryList {
  id: number
  name: string
  user_id: number
  created_at: string
  updated_at: string
  permission?: string
  owner_name?: string
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [myLists, setMyLists] = useState<InventoryList[]>([])
  const [sharedLists, setSharedLists] = useState<InventoryList[]>([])
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchLists() }, [])

  const fetchLists = async () => {
    const [myRes, sharedRes] = await Promise.all([
      client.get('/lists'),
      client.get('/shared-with-me'),
    ])
    setMyLists(myRes.data)
    setSharedLists(sharedRes.data)
  }

  const createList = async (e: FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await client.post('/lists', { name: newListName.trim() })
      setMyLists((prev) => [res.data, ...prev])
      setNewListName('')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create list')
    } finally {
      setCreating(false)
    }
  }

  const deleteList = async (id: number) => {
    if (!confirm('Delete this list and all its items?')) return
    await client.delete(`/lists/${id}`)
    setMyLists((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <span style={s.logo}>🌲 Rallebola</span>
        <nav style={s.nav}>
          <Link to="/borrow-requests" style={s.navLink}>📦 Borrow Requests</Link>
          <span style={s.navDivider}>·</span>
          <span style={s.navUser}>👤 {user?.name}</span>
          <button style={s.logoutBtn} onClick={() => logout().then(() => navigate('/login'))}>
            Sign out
          </button>
        </nav>
      </header>

      <main style={s.main}>
        <section style={s.section}>
          <h2 style={s.sectionTitle}>🌾 My Lists</h2>

          <form onSubmit={createList} style={s.createRow}>
            <input
              style={s.createInput}
              placeholder="Name a new inventory list…"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <button style={s.createBtn} type="submit" disabled={creating}>
              {creating ? 'Adding…' : '+ New List'}
            </button>
          </form>

          {error && <div style={s.errorBox}>{error}</div>}

          {myLists.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 36 }}>🏚</span>
              <p style={s.emptyText}>No lists yet. Create your first one above.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {myLists.map((list) => (
                <div key={list.id} style={s.listCard}>
                  <div style={s.cardAccent} />
                  <div style={s.cardBody}>
                    <Link to={`/lists/${list.id}`} style={s.cardTitle}>{list.name}</Link>
                    <span style={s.cardMeta}>
                      Updated {new Date(list.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button style={s.deleteBtn} onClick={() => deleteList(list.id)} title="Delete">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>🤝 Shared with Me</h2>

          {sharedLists.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 36 }}>🌲</span>
              <p style={s.emptyText}>No neighbours have shared a list with you yet.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {sharedLists.map((list) => (
                <div key={list.id} style={s.listCard}>
                  <div style={{ ...s.cardAccent, background: '#D4A84A' }} />
                  <div style={s.cardBody}>
                    <Link to={`/lists/${list.id}`} style={s.cardTitle}>{list.name}</Link>
                    <span style={s.cardMeta}>by {list.owner_name}</span>
                  </div>
                  <span style={list.permission === 'edit' ? s.editBadge : s.viewBadge}>
                    {list.permission}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#F7F2E8' },
  header: {
    background: '#5C7A48',
    padding: '0 32px',
    height: 58,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '2px solid #D4A84A',
  },
  logo: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 21,
    fontWeight: 700,
    color: '#F5E4B0',
  },
  nav: { display: 'flex', alignItems: 'center', gap: 16 },
  navLink: { color: '#E0EED0', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  navDivider: { color: '#94C278', fontSize: 14 },
  navUser: { color: '#C8E0A8', fontSize: 14 },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #94C278',
    color: '#C8E0A8',
    borderRadius: 6,
    padding: '5px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  main: { maxWidth: 900, margin: '0 auto', padding: '40px 20px' },
  section: { marginBottom: 52 },
  sectionTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 21,
    fontWeight: 700,
    color: '#3C2A18',
    marginBottom: 18,
  },
  createRow: { display: 'flex', gap: 10, marginBottom: 18 },
  createInput: {
    flex: 1,
    padding: '11px 16px',
    borderRadius: 8,
    border: '1.5px solid #DDD0B0',
    background: '#FDFCF8',
    fontSize: 15,
    color: '#3C2A18',
    outline: 'none',
  },
  createBtn: {
    padding: '11px 22px',
    background: '#6B9652',
    color: '#F7F2E8',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  errorBox: {
    background: '#FBEEE8',
    color: '#C46A5A',
    border: '1px solid #F0C4BC',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  emptyState: {
    background: '#FDFCF8',
    border: '1.5px dashed #DDD0B0',
    borderRadius: 12,
    padding: '36px 24px',
    textAlign: 'center' as const,
  },
  emptyText: { color: '#A08060', marginTop: 10, fontSize: 15 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  listCard: {
    background: '#FDFCF8',
    border: '1.5px solid #DDD0B0',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 5,
    alignSelf: 'stretch',
    background: '#89B86E',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
  },
  cardTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontWeight: 600,
    fontSize: 17,
    color: '#4D6E3A',
    textDecoration: 'none',
  },
  cardMeta: { fontSize: 12, color: '#A08060' },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#C4A882',
    fontSize: 15,
    cursor: 'pointer',
    padding: '0 18px',
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
  },
  viewBadge: {
    background: '#F2EAD8',
    color: '#9B7A5A',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 600,
    marginRight: 14,
    whiteSpace: 'nowrap' as const,
  },
  editBadge: {
    background: '#E0EED0',
    color: '#4D6E3A',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 600,
    marginRight: 14,
    whiteSpace: 'nowrap' as const,
  },
}
