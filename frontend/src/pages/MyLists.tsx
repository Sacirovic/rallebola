import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

interface InventoryList {
  id: number
  name: string
  user_id: number
  created_at: string
  updated_at: string
  is_shared?: boolean
}

export default function MyLists() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [lists, setLists] = useState<InventoryList[]>([])
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchLists() }, [])

  useEffect(() => {
    if (renamingId !== null) renameRef.current?.focus()
  }, [renamingId])

  const fetchLists = async () => {
    const res = await client.get('/lists')
    setLists(res.data)
  }

  const createList = async (e: FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await client.post('/lists', { name: newListName.trim() })
      setLists((prev) => [res.data, ...prev])
      setNewListName('')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create list')
    } finally {
      setCreating(false)
    }
  }

  const startRename = (list: InventoryList) => {
    setRenamingId(list.id)
    setRenameValue(list.name)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const saveRename = async (id: number) => {
    const trimmed = renameValue.trim()
    if (!trimmed) { cancelRename(); return }
    try {
      const res = await client.put(`/lists/${id}`, { name: trimmed })
      setLists((prev) => prev.map((l) => l.id === id ? { ...l, name: res.data.name } : l))
    } catch (_) {}
    cancelRename()
  }

  const handleRenameKey = (e: KeyboardEvent, id: number) => {
    if (e.key === 'Enter') saveRename(id)
    if (e.key === 'Escape') cancelRename()
  }

  const deleteList = async (id: number) => {
    if (!confirm('Delete this list and all its items?')) return
    await client.delete(`/lists/${id}`)
    setLists((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div style={s.page}>
      <header style={s.header} className="app-header">
        <Link to="/" style={s.logo}>🌲 Rallebola</Link>
        <nav style={s.nav} className="app-nav">
          <Link to="/my-lists" style={{ ...s.navLink, ...s.navLinkActive }}>📋 My Lists</Link>
          <span style={s.navDivider} className="nav-divider">·</span>
          <Link to="/roadtrips" style={s.navLink}>🚗 Road Trips</Link>
          <span style={s.navDivider} className="nav-divider">·</span>
          <span style={s.navUser} className="nav-user">👤 {user?.name}</span>
          <button style={s.logoutBtn} onClick={() => logout().then(() => navigate('/login'))}>
            Sign out
          </button>
        </nav>
      </header>

      <main style={s.main} className="page-main">
        <section style={s.section}>
          <h2 style={s.sectionTitle}>🌾 My Lists</h2>

          <form onSubmit={createList} style={s.createRow} className="create-row">
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

          {lists.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 36 }}>🏚</span>
              <p style={s.emptyText}>No lists yet. Create your first one above.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {lists.map((list) => (
                <div key={list.id} style={s.listCard}>
                  <div style={s.cardAccent} />
                  <div style={s.cardBody}>
                    {renamingId === list.id ? (
                      <div style={s.renameRow}>
                        <input
                          ref={renameRef}
                          style={s.renameInput}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => handleRenameKey(e, list.id)}
                        />
                        <button style={s.renameSave} onClick={() => saveRename(list.id)}>✓</button>
                        <button style={s.renameCancel} onClick={cancelRename}>✕</button>
                      </div>
                    ) : (
                      <Link to={`/lists/${list.id}`} style={s.cardTitle}>{list.name}</Link>
                    )}
                    <span style={s.cardMeta}>
                      Updated {new Date(list.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  {list.is_shared && (
                    <span style={s.sharedIcon} title="Shared with others">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="5" cy="13" r="2.5" stroke="#89B86E" strokeWidth="1.6"/>
                        <circle cx="15" cy="13" r="2.5" stroke="#89B86E" strokeWidth="1.6"/>
                        <circle cx="10" cy="5" r="2.5" stroke="#89B86E" strokeWidth="1.6"/>
                        <line x1="7.2" y1="6.8" x2="12.8" y2="6.8" stroke="#89B86E" strokeWidth="1.4" strokeLinecap="round"/>
                        <line x1="6.3" y1="11.2" x2="8.8" y2="7.8" stroke="#89B86E" strokeWidth="1.4" strokeLinecap="round"/>
                        <line x1="13.7" y1="11.2" x2="11.2" y2="7.8" stroke="#89B86E" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </span>
                  )}
                  <button style={s.renameBtn} onClick={() => startRename(list)} title="Rename">✏</button>
                  <button style={s.deleteBtn} onClick={() => deleteList(list.id)} title="Delete">✕</button>
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
    textDecoration: 'none',
  },
  nav: { display: 'flex', alignItems: 'center', gap: 16 },
  navLink: { color: '#E0EED0', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  navLinkActive: { color: '#F5E4B0', borderBottom: '2px solid #D4A84A', paddingBottom: 2 },
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
  sharedIcon: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    opacity: 0.75,
    flexShrink: 0,
  },
  renameRow: { display: 'flex', alignItems: 'center', gap: 6 },
  renameInput: {
    flex: 1,
    padding: '5px 10px',
    borderRadius: 6,
    border: '1.5px solid #89B86E',
    background: '#F7F2E8',
    fontSize: 15,
    fontFamily: "'Lora', Georgia, serif",
    fontWeight: 600,
    color: '#4D6E3A',
    outline: 'none',
  },
  renameSave: {
    background: '#E0EED0',
    color: '#4D6E3A',
    border: '1px solid #B8D89C',
    borderRadius: 6,
    padding: '4px 9px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
  },
  renameCancel: {
    background: '#F2EAD8',
    color: '#A08060',
    border: '1px solid #DDD0B0',
    borderRadius: 6,
    padding: '4px 9px',
    cursor: 'pointer',
    fontSize: 13,
  },
  renameBtn: {
    background: 'none',
    border: 'none',
    color: '#B8D89C',
    fontSize: 15,
    cursor: 'pointer',
    padding: '0 10px',
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#C4A882',
    fontSize: 15,
    cursor: 'pointer',
    padding: '0 14px',
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
  },
}
