import { useState, useEffect, FormEvent } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import ItemRow from '../components/ItemRow'
import ShareModal from '../components/ShareModal'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  checked: boolean
  position: number
  borrow_status?: string | null
}

interface BorrowRequest {
  item_id: number
  requester_id: number
  status: string
}

function SortableGroceryItem({ item, canEdit, onToggle, onDelete }: {
  item: Item
  canEdit: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        ...s.groceryItem,
        background: item.checked ? '#F9FAFB' : '#FFFFFF',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : undefined,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : undefined,
      }}
      {...attributes}
    >
      {canEdit && (
        <span className="material-icons-outlined" style={s.dragHandle} {...listeners} title="Drag to reorder">
          drag_indicator
        </span>
      )}
      <button
        style={{ ...s.checkbox, ...(item.checked ? s.checkboxDone : {}) }}
        onClick={onToggle}
        title={item.checked ? 'Mark not bought' : 'Mark bought'}
      >
        {item.checked && <span className="material-icons-outlined" style={{ fontSize: 13 }}>check</span>}
      </button>
      <span style={{
        ...s.groceryName,
        textDecoration: item.checked ? 'line-through' : 'none',
        color: item.checked ? '#9CA3AF' : '#111827',
      }}>
        {item.name}
        {item.quantity > 1 && <span style={s.qtyBadge}>×{item.quantity}</span>}
      </span>
      {canEdit && (
        <button style={s.deleteGroceryBtn} onClick={onDelete} title="Delete">
          <span className="material-icons-outlined" style={{ fontSize: 14 }}>close</span>
        </button>
      )}
    </div>
  )
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
  const isGroceryList = Boolean(list?.roadtrip_id)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => { fetchData() }, [listId])

  const fetchData = async () => {
    try {
      const [listRes, itemsRes] = await Promise.all([
        client.get(`/lists/${listId}`),
        client.get(`/lists/${listId}/items`),
      ])
      setList(listRes.data)

      let borrowMap: Record<number, string> = {}
      if (!listRes.data.roadtrip_id) {
        try {
          const endpoint = listRes.data.user_id === user?.id
            ? '/borrow-requests/incoming'
            : '/borrow-requests/outgoing'
          const br = await client.get(endpoint)
          br.data.forEach((r: BorrowRequest) => { borrowMap[r.item_id] = r.status })
        } catch (_) {}
      }

      setItems(itemsRes.data.map((item: Item) => ({
        ...item,
        checked: Boolean(item.checked),
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
      setItems((prev) => [...prev, { ...res.data, checked: false, borrow_status: null }])
      setNewName('')
      setNewQty('1')
      setNewNotes('')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to add item')
    } finally {
      setAdding(false)
    }
  }

  const toggleChecked = async (item: Item) => {
    const res = await client.put(`/lists/${listId}/items/${item.id}`, { checked: !item.checked })
    setItems((prev) => prev.map((it) =>
      it.id === item.id ? { ...res.data, checked: Boolean(res.data.checked), borrow_status: null } : it
    ))
  }

  const deleteItem = async (itemId: number) => {
    await client.delete(`/lists/${listId}/items/${itemId}`)
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((it) => it.id === active.id)
    const newIndex  = items.findIndex((it) => it.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    client.put(`/lists/${listId}/items/reorder`, { ids: reordered.map((it) => it.id) })
      .catch(() => setItems(items))
  }

  if (!list) return <div style={{ padding: 32, color: '#9CA3AF' }}>Loading…</div>

  return (
    <div style={s.page}>
      <header style={s.header} className="app-header">
        {fromRoadtrip
          ? <Link to={`/roadtrips/${fromRoadtrip}`} style={s.back}>
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              Road Trip
            </Link>
          : <Link to="/" style={s.back}>
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              Back
            </Link>
        }
        <div style={s.headerCenter}>
          <span className="material-icons-outlined" style={s.headerIcon}>
            {isGroceryList ? 'shopping_cart' : 'list_alt'}
          </span>
          <h1 style={s.headerTitle}>{list.name}</h1>
        </div>
        {isOwner && !list.roadtrip_id
          ? <button style={s.shareBtn} onClick={() => setShowShare(true)}>
              <span className="material-icons-outlined" style={{ fontSize: 15 }}>group_add</span>
              Share
            </button>
          : <div style={{ width: 80 }} />
        }
      </header>

      <main style={s.main} className="page-main">
        {error && (
          <div style={s.errorBox}>
            <span className="material-icons-outlined" style={{ fontSize: 15, marginRight: 6 }}>error_outline</span>
            {error}
          </div>
        )}

        {isGroceryList ? (
          <>
            {canEdit && (
              <form onSubmit={addItem} style={s.addTodoRow} className="add-form">
                <input
                  style={{ ...s.todoInput, flex: 2 }}
                  placeholder="Item…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  style={{ ...s.todoInput, flex: '0 0 70px' as any }}
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                />
                <button style={s.addTodoBtn} type="submit" disabled={adding}>
                  <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span>
                  {adding ? '…' : 'Add'}
                </button>
              </form>
            )}

            {items.length === 0 ? (
              <div style={s.emptyState}>
                <span className="material-icons-outlined" style={s.emptyIcon}>shopping_cart</span>
                <p style={s.emptyText}>No items yet. Add your first one above.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                  <div style={s.groceryList}>
                    {items.map((item) => (
                      <SortableGroceryItem
                        key={item.id}
                        item={item}
                        canEdit={canEdit}
                        onToggle={() => toggleChecked(item)}
                        onDelete={() => deleteItem(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        ) : (
          <>
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
                  <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span>
                  {adding ? 'Adding…' : 'Add Item'}
                </button>
              </form>
            )}

            {items.length === 0 ? (
              <div style={s.emptyState}>
                <span className="material-icons-outlined" style={s.emptyIcon}>inventory_2</span>
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
                              it.id === updated.id ? { ...it, ...updated, borrow_status: it.borrow_status } : it
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
          </>
        )}
      </main>

      {showShare && <ShareModal listId={listId} onClose={() => setShowShare(false)} />}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#F8FAFC' },
  header: {
    background: '#FFFFFF', padding: '0 24px', height: 56,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky' as const, top: 0, zIndex: 10,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  back: {
    color: '#6B7280', textDecoration: 'none', fontSize: 13, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 4, width: 80,
  },
  headerCenter: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  headerIcon: { fontSize: 18, color: '#9CA3AF' },
  headerTitle: { fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 },
  shareBtn: {
    background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#374151',
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 500, fontSize: 13,
    display: 'flex', alignItems: 'center', gap: 4, width: 80,
  },
  main: { maxWidth: 960, margin: '0 auto', padding: '32px 24px' },
  errorBox: {
    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20,
    display: 'flex', alignItems: 'center',
  },
  addForm: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const },
  input: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 14, color: '#111827', outline: 'none', minWidth: 100,
  },
  addBtn: {
    padding: '9px 16px', background: '#16A34A', color: '#FFFFFF',
    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
    whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 4,
  },
  emptyState: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 10, padding: '48px 24px', textAlign: 'center' as const,
  },
  emptyIcon: { fontSize: 36, color: '#D1D5DB', display: 'block', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  tableWrap: { overflowX: 'auto' as const },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    background: '#FFFFFF', borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB',
  },
  th: {
    padding: '10px 14px', textAlign: 'left' as const,
    fontWeight: 600, fontSize: 11, letterSpacing: '0.5px',
    textTransform: 'uppercase' as const, color: '#9CA3AF',
    background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
  },
  addTodoRow: { display: 'flex', gap: 8, marginBottom: 12 },
  todoInput: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 14, color: '#111827', outline: 'none', minWidth: 80,
  },
  addTodoBtn: {
    padding: '9px 14px', background: '#16A34A', color: '#FFFFFF',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
    whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 4,
  },
  groceryList: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  groceryItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px',
  },
  dragHandle: {
    fontSize: 20, color: '#D1D5DB', cursor: 'grab',
    flexShrink: 0, userSelect: 'none' as const, touchAction: 'none',
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    border: '1.5px solid #D1D5DB', background: '#FFFFFF',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, color: '#FFFFFF',
  },
  checkboxDone: { background: '#16A34A', border: '1.5px solid #16A34A' },
  groceryName: { flex: 1, fontSize: 14, wordBreak: 'break-word' as const },
  qtyBadge: {
    marginLeft: 6, fontSize: 11, fontWeight: 600,
    color: '#16A34A', background: '#F0FDF4',
    borderRadius: 10, padding: '1px 7px',
  },
  deleteGroceryBtn: {
    background: 'none', border: 'none', color: '#D1D5DB',
    cursor: 'pointer', padding: '0 4px', flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
}
