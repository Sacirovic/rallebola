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
        <Link to="/" style={s.logo}>
          <span className="material-icons-outlined" style={s.logoIcon}>eco</span>
          Rallebola
        </Link>
        <nav style={s.nav} className="app-nav">
          <Link to="/my-lists" style={s.navLinkActive}>My Lists</Link>
          <Link to="/roadtrips" style={s.navLink}>Road Trips</Link>
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
        <section style={s.section}>
          <h2 style={s.sectionTitle}>
            <span className="material-icons-outlined" style={s.sectionIcon}>list_alt</span>
            My Lists
          </h2>

          <form onSubmit={createList} style={s.createRow} className="create-row">
            <input
              style={s.createInput}
              placeholder="Name a new list…"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <button style={s.createBtn} type="submit" disabled={creating}>
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span>
              {creating ? 'Adding…' : 'New List'}
            </button>
          </form>

          {error && (
            <div style={s.errorBox}>
              <span className="material-icons-outlined" style={{ fontSize: 15, marginRight: 6 }}>error_outline</span>
              {error}
            </div>
          )}

          {lists.length === 0 ? (
            <div style={s.emptyState}>
              <span className="material-icons-outlined" style={s.emptyIcon}>inventory_2</span>
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
                        <button style={s.renameSave} onClick={() => saveRename(list.id)}>
                          <span className="material-icons-outlined" style={{ fontSize: 14 }}>check</span>
                        </button>
                        <button style={s.renameCancel} onClick={cancelRename}>
                          <span className="material-icons-outlined" style={{ fontSize: 14 }}>close</span>
                        </button>
                      </div>
                    ) : (
                      <Link to={`/lists/${list.id}`} style={s.cardTitle}>{list.name}</Link>
                    )}
                    <span style={s.cardMeta}>
                      Updated {new Date(list.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  {list.is_shared && (
                    <span title="Shared with others" style={s.sharedIcon}>
                      <span className="material-icons-outlined" style={{ fontSize: 16, color: '#16A34A' }}>group</span>
                    </span>
                  )}
                  <button style={s.iconBtn} onClick={() => startRename(list)} title="Rename">
                    <span className="material-icons-outlined" style={{ fontSize: 16 }}>edit</span>
                  </button>
                  <button style={{ ...s.iconBtn, ...s.iconBtnDanger }} onClick={() => deleteList(list.id)} title="Delete">
                    <span className="material-icons-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
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
  section: { marginBottom: 48 },
  sectionTitle: {
    fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 6,
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  sectionIcon: { fontSize: 18, color: '#9CA3AF' },
  createRow: { display: 'flex', gap: 8, marginBottom: 16 },
  createInput: {
    flex: 1, padding: '9px 12px',
    borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 14, color: '#111827', outline: 'none',
  },
  createBtn: {
    padding: '9px 16px', background: '#16A34A', color: '#FFFFFF',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const,
  },
  errorBox: {
    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
    display: 'flex', alignItems: 'center',
  },
  emptyState: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 10, padding: '36px 24px', textAlign: 'center' as const,
  },
  emptyIcon: { fontSize: 36, color: '#D1D5DB', display: 'block', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  listCard: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 8, display: 'flex', alignItems: 'center', overflow: 'hidden',
  },
  cardAccent: { width: 3, alignSelf: 'stretch', background: '#16A34A', flexShrink: 0 },
  cardBody: {
    flex: 1, padding: '12px 16px',
    display: 'flex', flexDirection: 'column' as const, gap: 3,
  },
  cardTitle: { fontWeight: 500, fontSize: 14, color: '#111827', textDecoration: 'none' },
  cardMeta: { fontSize: 12, color: '#9CA3AF' },
  sharedIcon: { display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0 },
  renameRow: { display: 'flex', alignItems: 'center', gap: 6 },
  renameInput: {
    flex: 1, padding: '5px 10px',
    borderRadius: 6, border: '1px solid #16A34A',
    background: '#FFFFFF', fontSize: 14, fontWeight: 500, color: '#111827', outline: 'none',
  },
  renameSave: {
    background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
    borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
  renameCancel: {
    background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB',
    borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
  iconBtn: {
    background: 'none', border: 'none', color: '#D1D5DB',
    cursor: 'pointer', padding: '0 10px', alignSelf: 'stretch',
    display: 'flex', alignItems: 'center',
  },
  iconBtnDanger: { color: '#FECACA', paddingRight: 14 },
}
