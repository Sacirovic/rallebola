import { useState, useEffect, FormEvent } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
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

interface Member  { id: number; name: string; email: string }
interface Todo    { id: number; text: string; done: boolean; created_by_name: string | null }
interface Roadtrip {
  id: number
  name: string
  date: string | null
  owner_id: number
  owner_name: string
  members: Member[]
  todos: Todo[]
}

// ── Sortable todo row ──────────────────────────────────────────────────────

function SortableTodoItem({ todo, onToggle, onDelete }: {
  todo: Todo
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        ...s.todoItem,
        background: todo.done ? '#F2EAD8' : '#FDFCF8',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 1 : undefined,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.12)' : undefined,
      }}
      {...attributes}
    >
      <div style={s.dragHandle} {...listeners} title="Drag to reorder">
        ⠿
      </div>
      <button
        style={{ ...s.checkbox, ...(todo.done ? s.checkboxDone : {}) }}
        onClick={onToggle}
        title={todo.done ? 'Mark undone' : 'Mark done'}
      >
        {todo.done ? '✓' : ''}
      </button>
      <div style={s.todoContent}>
        <span style={{
          ...s.todoText,
          textDecoration: todo.done ? 'line-through' : 'none',
          color: todo.done ? '#A08060' : '#3C2A18',
        }}>
          {todo.text}
        </span>
        {todo.created_by_name && (
          <span style={s.todoCreator}>by {todo.created_by_name}</span>
        )}
      </div>
      <button style={s.deleteTodoBtn} onClick={onDelete} title="Delete">✕</button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function RoadtripDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const roadtripId = Number(id)

  const [roadtrip, setRoadtrip] = useState<Roadtrip | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [todoText, setTodoText] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [memberError, setMemberError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => { fetchData() }, [roadtripId])

  const fetchData = async () => {
    try {
      const res = await client.get(`/roadtrips/${roadtripId}`)
      setRoadtrip(res.data)
    } catch (err: any) {
      if (err.response?.status === 404) navigate('/roadtrips')
    }
  }

  const startEdit = () => {
    if (!roadtrip) return
    setEditName(roadtrip.name)
    setEditDate(roadtrip.date ?? '')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!editName.trim() || !roadtrip) return
    const res = await client.put(`/roadtrips/${roadtripId}`, {
      name: editName.trim(),
      date: editDate || null,
    })
    setRoadtrip((prev) => prev ? { ...prev, name: res.data.name, date: res.data.date } : prev)
    setEditing(false)
  }

  const addTodo = async (e: FormEvent) => {
    e.preventDefault()
    if (!todoText.trim()) return
    setAddingTodo(true)
    try {
      const res = await client.post(`/roadtrips/${roadtripId}/todos`, { text: todoText.trim() })
      setRoadtrip((prev) => prev ? { ...prev, todos: [...prev.todos, res.data] } : prev)
      setTodoText('')
    } finally {
      setAddingTodo(false)
    }
  }

  const toggleTodo = async (todo: Todo) => {
    const res = await client.put(`/roadtrips/${roadtripId}/todos/${todo.id}`, { done: !todo.done })
    setRoadtrip((prev) => prev
      ? { ...prev, todos: prev.todos.map((t) => t.id === todo.id ? res.data : t) }
      : prev
    )
  }

  const deleteTodo = async (todoId: number) => {
    await client.delete(`/roadtrips/${roadtripId}/todos/${todoId}`)
    setRoadtrip((prev) => prev
      ? { ...prev, todos: prev.todos.filter((t) => t.id !== todoId) }
      : prev
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !roadtrip) return

    const oldIndex = roadtrip.todos.findIndex((t) => t.id === active.id)
    const newIndex = roadtrip.todos.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(roadtrip.todos, oldIndex, newIndex)

    setRoadtrip((prev) => prev ? { ...prev, todos: reordered } : prev)

    client.put(`/roadtrips/${roadtripId}/todos/reorder`, {
      ids: reordered.map((t) => t.id),
    }).catch(() => {
      setRoadtrip((prev) => prev ? { ...prev, todos: roadtrip.todos } : prev)
    })
  }

  const addMember = async (e: FormEvent) => {
    e.preventDefault()
    if (!memberEmail.trim()) return
    setAddingMember(true)
    setMemberError('')
    try {
      const res = await client.post(`/roadtrips/${roadtripId}/members`, { email: memberEmail.trim() })
      setRoadtrip((prev) => prev ? { ...prev, members: [...prev.members, res.data] } : prev)
      setMemberEmail('')
    } catch (err: any) {
      setMemberError(err.response?.data?.error ?? 'Failed to add traveller')
    } finally {
      setAddingMember(false)
    }
  }

  const removeMember = async (memberId: number) => {
    await client.delete(`/roadtrips/${roadtripId}/members/${memberId}`)
    setRoadtrip((prev) => prev
      ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) }
      : prev
    )
  }

  if (!roadtrip) return <div style={{ padding: 32, color: '#A08060' }}>Loading…</div>

  const isOwner   = roadtrip.owner_id === user?.id
  const doneTodos = roadtrip.todos.filter((t) => t.done).length

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
        <Link to="/roadtrips" style={s.back}>← Back</Link>

        <div style={s.headerCenter}>
          <span style={{ fontSize: 18 }}>🚗</span>
          {editing ? (
            <div style={s.editRow}>
              <input
                style={s.editNameInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
              <input
                style={s.editDateInput}
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <button style={s.editSaveBtn} onClick={saveEdit}>✓</button>
              <button style={s.editCancelBtn} onClick={() => setEditing(false)}>✕</button>
            </div>
          ) : (
            <div style={s.titleGroup}>
              <h1 style={s.headerTitle}>{roadtrip.name}</h1>
              {roadtrip.date && (
                <span style={s.dateBadge}>📅 {formatDate(roadtrip.date)}</span>
              )}
            </div>
          )}
        </div>

        {isOwner && !editing
          ? <button style={s.editBtn} onClick={startEdit}>✏ Edit</button>
          : <div style={{ minWidth: 60 }} />
        }
      </header>

      <main style={s.main} className="page-main">

        {/* Travellers */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>👥 Travellers</h2>

          <div style={s.memberList}>
            <div style={s.memberChip}>
              <span style={s.memberName}>{roadtrip.owner_name}</span>
              <span style={s.ownerBadge}>owner</span>
            </div>
            {roadtrip.members.map((m) => (
              <div key={m.id} style={s.memberChip}>
                <span style={s.memberName}>{m.name}</span>
                <span style={s.memberEmail}>{m.email}</span>
                {isOwner && (
                  <button style={s.removeMemberBtn} onClick={() => removeMember(m.id)} title="Remove">✕</button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <>
              <form onSubmit={addMember} style={s.addMemberRow} className="add-form">
                <input
                  style={s.memberInput}
                  type="email"
                  placeholder="Add traveller by email…"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                />
                <button style={s.addMemberBtn} type="submit" disabled={addingMember}>
                  {addingMember ? 'Adding…' : '+ Add'}
                </button>
              </form>
              {memberError && <div style={s.errorBox}>{memberError}</div>}
            </>
          )}
        </section>

        {/* Todo list */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>
            ✅ Todo List
            {roadtrip.todos.length > 0 && (
              <span style={s.progressBadge}>{doneTodos}/{roadtrip.todos.length}</span>
            )}
          </h2>

          <form onSubmit={addTodo} style={s.addTodoRow} className="add-form">
            <input
              style={s.todoInput}
              placeholder="Add a task…"
              value={todoText}
              onChange={(e) => setTodoText(e.target.value)}
            />
            <button style={s.addTodoBtn} type="submit" disabled={addingTodo}>
              {addingTodo ? '…' : '+ Add'}
            </button>
          </form>

          {roadtrip.todos.length === 0 ? (
            <div style={s.emptyState}>
              <p style={s.emptyText}>No tasks yet. Add your first one above.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={roadtrip.todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div style={s.todoList}>
                  {roadtrip.todos.map((todo) => (
                    <SortableTodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={() => toggleTodo(todo)}
                      onDelete={() => deleteTodo(todo.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
    padding: '0 24px',
    height: 58,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '2px solid #D4A84A',
    gap: 12,
  },
  back: { color: '#C8E0A8', textDecoration: 'none', fontSize: 14, fontWeight: 500, minWidth: 60 },
  headerCenter: {
    display: 'flex', alignItems: 'center', gap: 8,
    flex: 1, justifyContent: 'center', overflow: 'hidden',
  },
  titleGroup: {
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', gap: 2, overflow: 'hidden',
  },
  headerTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 18, fontWeight: 700, color: '#F5E4B0', margin: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  dateBadge: { fontSize: 11, color: '#C8E0A8', whiteSpace: 'nowrap' as const },
  editRow: { display: 'flex', alignItems: 'center', gap: 6, flex: 1 },
  editNameInput: {
    flex: 1, padding: '5px 10px', borderRadius: 6,
    border: '1.5px solid #94C278', background: '#4D6E3A',
    color: '#F5E4B0', fontSize: 15, outline: 'none',
    fontFamily: "'Lora', Georgia, serif", fontWeight: 700,
  },
  editDateInput: {
    padding: '5px 8px', borderRadius: 6,
    border: '1.5px solid #94C278', background: '#4D6E3A',
    color: '#F5E4B0', fontSize: 13, outline: 'none',
  },
  editSaveBtn: {
    background: '#89B86E', color: '#FDFCF8',
    border: 'none', borderRadius: 6, padding: '5px 10px',
    cursor: 'pointer', fontWeight: 700,
  },
  editCancelBtn: {
    background: '#4D6E3A', color: '#C8E0A8',
    border: '1px solid #6B9652', borderRadius: 6, padding: '5px 10px',
    cursor: 'pointer',
  },
  editBtn: {
    background: 'transparent', border: '1px solid #94C278',
    color: '#C8E0A8', borderRadius: 6, padding: '5px 12px',
    cursor: 'pointer', fontSize: 12, fontWeight: 500, minWidth: 60,
  },
  main: { maxWidth: 800, margin: '0 auto', padding: '32px 20px' },
  section: { marginBottom: 44 },
  sectionTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 18, fontWeight: 700, color: '#3C2A18',
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
  },
  progressBadge: {
    fontSize: 12, fontWeight: 600,
    background: '#E0EED0', color: '#4D6E3A',
    borderRadius: 20, padding: '2px 10px',
  },
  memberList: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 14 },
  memberChip: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#FDFCF8', border: '1.5px solid #DDD0B0',
    borderRadius: 20, padding: '6px 12px',
  },
  memberName: { fontSize: 13, fontWeight: 600, color: '#3C2A18' },
  memberEmail: { fontSize: 11, color: '#A08060' },
  ownerBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    background: '#E0EED0', color: '#4D6E3A',
    borderRadius: 10, padding: '1px 7px',
  },
  removeMemberBtn: {
    background: 'none', border: 'none', color: '#C4A882',
    cursor: 'pointer', fontSize: 11, padding: '0 2px',
  },
  addMemberRow: { display: 'flex', gap: 8 },
  memberInput: {
    flex: 1, padding: '9px 14px',
    borderRadius: 8, border: '1.5px solid #DDD0B0',
    background: '#FDFCF8', fontSize: 14, color: '#3C2A18', outline: 'none',
  },
  addMemberBtn: {
    padding: '9px 18px', background: '#6B9652',
    color: '#F7F2E8', border: 'none', borderRadius: 8,
    fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },
  errorBox: {
    background: '#FBEEE8', color: '#C46A5A',
    border: '1px solid #F0C4BC', borderRadius: 8,
    padding: '10px 14px', fontSize: 13, marginTop: 10,
  },
  addTodoRow: { display: 'flex', gap: 8, marginBottom: 12 },
  todoInput: {
    flex: 1, padding: '10px 14px',
    borderRadius: 8, border: '1.5px solid #DDD0B0',
    background: '#FDFCF8', fontSize: 14, color: '#3C2A18', outline: 'none',
  },
  addTodoBtn: {
    padding: '10px 18px', background: '#6B9652',
    color: '#F7F2E8', border: 'none', borderRadius: 8,
    fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },
  emptyState: {
    background: '#FDFCF8', border: '1.5px dashed #DDD0B0',
    borderRadius: 10, padding: '24px', textAlign: 'center' as const,
  },
  emptyText: { color: '#A08060', fontSize: 14 },
  todoList: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  todoItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1.5px solid #DDD0B0', borderRadius: 8, padding: '10px 12px',
  },
  dragHandle: {
    color: '#C4A882', fontSize: 16, cursor: 'grab',
    padding: '0 2px', flexShrink: 0, userSelect: 'none' as const,
    touchAction: 'none',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    border: '2px solid #B8D89C', background: '#F7F2E8',
    cursor: 'pointer', fontSize: 12, fontWeight: 700,
    color: '#4D6E3A', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: {
    background: '#89B86E', border: '2px solid #6B9652', color: '#FDFCF8',
  },
  todoContent: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2, minWidth: 0 },
  todoText: { fontSize: 14, wordBreak: 'break-word' as const },
  todoCreator: { fontSize: 11, color: '#A08060' },
  deleteTodoBtn: {
    background: 'none', border: 'none', color: '#C4A882',
    cursor: 'pointer', fontSize: 13, padding: '0 4px', flexShrink: 0,
  },
}
