import { useState, useEffect, FormEvent } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import ItemRow from '../components/ItemRow'
import ShareModal from '../components/ShareModal'

interface InventoryList {
  id: number
  name: string
  user_id: number
  roadtrip_id: number | null
  permission?: string
}

interface Item {
  id: number
  list_id: number
  name: string
  quantity: number
  notes: string | null
  borrow_status?: string | null
}

interface BorrowRequest {
  item_id: number
  requester_id: number
  status: string
}

export default function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromRoadtrip: number | undefined = (location.state as any)?.fromRoadtrip
  const listId = Number(id)

  const [list, setList] = useState<InventoryList | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [showShare, setShowShare] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('1')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const isOwner = list?.user_id === user?.id
  const canEdit = isOwner || list?.permission === 'edit'

  useEffect(() => { fetchData() }, [listId])

  const fetchData = async () => {
    try {
      const [listRes, itemsRes] = await Promise.all([
        client.get(`/lists/${listId}`),
        client.get(`/lists/${listId}/items`),
      ])
      setList(listRes.data)

      let borrowMap: Record<number, string> = {}
      try {
        const endpoint = listRes.data.user_id === user?.id
          ? '/borrow-requests/incoming'
          : '/borrow-requests/outgoing'
        const br = await client.get(endpoint)
        br.data.forEach((r: BorrowRequest) => { borrowMap[r.item_id] = r.status })
      } catch (_) {}

      setItems(itemsRes.data.map((item: Item) => ({
        ...item,
        borrow_status: borrowMap[item.id] ?? null,
      })))
    } catch (err: any) {
      if (err.response?.status === 404) navigate('/')
    }
  }

  const addItem = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setError('')
    try {
      const res = await client.post(`/lists/${listId}/items`, {
        name: newName.trim(),
        quantity: parseInt(newQty) || 1,
        notes: newNotes.trim() || null,
      })
      setItems((prev) => [...prev, { ...res.data, borrow_status: null }])
      setNewName('')
      setNewQty('1')
      setNewNotes('')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to add item')
    } finally {
      setAdding(false)
    }
  }

  if (!list) return <div style={{ padding: 32, color: '#A08060' }}>Loading…</div>

  return (
    <div style={s.page}>
      <header style={s.header} className="app-header">
        {fromRoadtrip
          ? <Link to={`/roadtrips/${fromRoadtrip}`} style={s.back}>← Roadtrip</Link>
          : <Link to="/" style={s.back}>← Back</Link>
        }
        <div style={s.headerCenter}>
          <span style={{ fontSize: 20 }}>🌾</span>
          <h1 style={s.headerTitle}>{list.name}</h1>
        </div>
        {isOwner && !list.roadtrip_id
          ? <button style={s.shareBtn} onClick={() => setShowShare(true)}>🤝 Share</button>
          : <div style={{ width: 90 }} />
        }
      </header>

      <main style={s.main} className="page-main">
        {error && <div style={s.errorBox}>{error}</div>}

        {canEdit && (
          <form onSubmit={addItem} style={s.addForm} className="add-form">
            <input
              style={{ ...s.input, flex: 2 }}
              placeholder="Item name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              style={{ ...s.input, flex: '0 0 80px' as any }}
              type="number"
              min={1}
              placeholder="Qty"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
            />
            <input
              style={{ ...s.input, flex: 2 }}
              placeholder="Notes (optional)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
            <button style={s.addBtn} type="submit" disabled={adding}>
              {adding ? 'Adding…' : '+ Add Item'}
            </button>
          </form>
        )}

        {items.length === 0 ? (
          <div style={s.emptyState}>
            <span style={{ fontSize: 36 }}>🏚</span>
            <p style={s.emptyText}>No items in this list yet.</p>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Item</th>
                  <th style={{ ...s.th, width: 70 }}>Qty</th>
                  <th style={s.th}>Notes</th>
                  <th style={{ ...s.th, width: 110 }}>Borrow</th>
                  <th style={{ ...s.th, width: 190 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    rowIndex={i}
                    canEdit={canEdit}
                    isOwner={isOwner}
                    onUpdated={(updated) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === updated.id ? { ...updated, borrow_status: it.borrow_status } : it
                        )
                      )
                    }
                    onDeleted={(itemId) => setItems((prev) => prev.filter((it) => it.id !== itemId))}
                    onBorrowRequested={fetchData}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showShare && <ShareModal listId={listId} onClose={() => setShowShare(false)} />}
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
  back: { color: '#C8E0A8', textDecoration: 'none', fontSize: 14, fontWeight: 500, width: 90 },
  headerCenter: {
    display: 'flex', alignItems: 'center', gap: 10,
    flex: 1, justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 20, fontWeight: 700, color: '#F5E4B0', margin: 0,
  },
  shareBtn: {
    background: 'transparent',
    border: '1px solid #94C278',
    color: '#C8E0A8',
    borderRadius: 6,
    padding: '6px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    width: 90,
  },
  main: { maxWidth: 960, margin: '0 auto', padding: '32px 20px' },
  errorBox: {
    background: '#FBEEE8', color: '#C46A5A',
    border: '1px solid #F0C4BC',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20,
  },
  addForm: { display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' as const },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1.5px solid #DDD0B0',
    background: '#FDFCF8',
    fontSize: 14,
    color: '#3C2A18',
    outline: 'none',
    minWidth: 100,
  },
  addBtn: {
    padding: '10px 20px',
    background: '#6B9652',
    color: '#F7F2E8',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
    whiteSpace: 'nowrap' as const,
  },
  emptyState: {
    background: '#FDFCF8', border: '1.5px dashed #DDD0B0',
    borderRadius: 12, padding: '48px 24px', textAlign: 'center' as const,
  },
  emptyText: { color: '#A08060', marginTop: 10, fontSize: 15 },
  tableWrap: { overflowX: 'auto' as const },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    background: '#FDFCF8',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1.5px solid #DDD0B0',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.7px',
    textTransform: 'uppercase' as const,
    color: '#A08060',
    background: '#F2EAD8',
    borderBottom: '1.5px solid #DDD0B0',
  },
}
