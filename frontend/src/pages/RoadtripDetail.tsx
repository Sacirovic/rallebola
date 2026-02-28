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
  grocery_list_id: number | null
  members: Member[]
  todos: Todo[]
}

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
        background: todo.done ? '#F9FAFB' : '#FFFFFF',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : undefined,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : undefined,
      }}
      {...attributes}
    >
      <span className="material-icons-outlined" style={s.dragHandle} {...listeners} title="Drag to reorder">
        drag_indicator
      </span>
      <button
        style={{ ...s.checkbox, ...(todo.done ? s.checkboxDone : {}) }}
        onClick={onToggle}
        title={todo.done ? 'Mark undone' : 'Mark done'}
      >
        {todo.done && <span className="material-icons-outlined" style={{ fontSize: 13 }}>check</span>}
      </button>
      <div style={s.todoContent}>
        <span style={{
          ...s.todoText,
          textDecoration: todo.done ? 'line-through' : 'none',
          color: todo.done ? '#9CA3AF' : '#111827',
        }}>
          {todo.text}
        </span>
        {todo.created_by_name && (
          <span style={s.todoCreator}>by {todo.created_by_name}</span>
        )}
      </div>
      <button style={s.deleteTodoBtn} onClick={onDelete} title="Delete">
        <span className="material-icons-outlined" style={{ fontSize: 15 }}>close</span>
      </button>
    </div>
  )
}

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

  if (!roadtrip) return <div style={{ padding: 32, color: '#9CA3AF' }}>Loading…</div>

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
        <Link to="/roadtrips" style={s.back}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Road Trips
        </Link>

        <div style={s.headerCenter}>
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
              <button style={s.editSaveBtn} onClick={saveEdit}>
                <span className="material-icons-outlined" style={{ fontSize: 16 }}>check</span>
              </button>
              <button style={s.editCancelBtn} onClick={() => setEditing(false)}>
                <span className="material-icons-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>
          ) : (
            <div style={s.titleGroup}>
              <h1 style={s.headerTitle}>{roadtrip.name}</h1>
              {roadtrip.date && (
                <span style={s.dateBadge}>
                  <span className="material-icons-outlined" style={{ fontSize: 12 }}>calendar_today</span>
                  {formatDate(roadtrip.date)}
                </span>
              )}
            </div>
          )}
        </div>

        {isOwner && !editing
          ? <button style={s.editBtn} onClick={startEdit}>
              <span className="material-icons-outlined" style={{ fontSize: 15 }}>edit</span>
              Edit
            </button>
          : <div style={{ minWidth: 70 }} />
        }
      </header>

      <main style={s.main} className="page-main">

        {roadtrip.grocery_list_id && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>
              <span className="material-icons-outlined" style={s.sectionIcon}>shopping_cart</span>
              Grocery List
            </h2>
            <Link
              to={`/lists/${roadtrip.grocery_list_id}`}
              state={{ fromRoadtrip: roadtripId }}
              style={s.groceryBtn}
            >
              Open Grocery List
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </Link>
          </section>
        )}

        <section style={s.section}>
          <h2 style={s.sectionTitle}>
            <span className="material-icons-outlined" style={s.sectionIcon}>group</span>
            Travellers
          </h2>

          <div style={s.memberList}>
            <div style={s.memberChip}>
              <span className="material-icons-outlined" style={{ fontSize: 14, color: '#16A34A' }}>person</span>
              <span style={s.memberName}>{roadtrip.owner_name}</span>
              <span style={s.ownerBadge}>owner</span>
            </div>
            {roadtrip.members.map((m) => (
              <div key={m.id} style={s.memberChip}>
                <span className="material-icons-outlined" style={{ fontSize: 14, color: '#9CA3AF' }}>person</span>
                <span style={s.memberName}>{m.name}</span>
                <span style={s.memberEmail}>{m.email}</span>
                {isOwner && (
                  <button style={s.removeMemberBtn} onClick={() => removeMember(m.id)} title="Remove">
                    <span className="material-icons-outlined" style={{ fontSize: 13 }}>close</span>
                  </button>
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
                  <span className="material-icons-outlined" style={{ fontSize: 16 }}>person_add</span>
                  {addingMember ? 'Adding…' : 'Add'}
                </button>
              </form>
              {memberError && <div style={s.errorBox}>{memberError}</div>}
            </>
          )}
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>
            <span className="material-icons-outlined" style={s.sectionIcon}>checklist</span>
            Todo List
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
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span>
              {addingTodo ? '…' : 'Add'}
            </button>
          </form>

          {roadtrip.todos.length === 0 ? (
            <div style={s.emptyState}>
              <span className="material-icons-outlined" style={s.emptyIcon}>checklist</span>
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
  page: { minHeight: '100vh', background: '#F8FAFC' },
  header: {
    background: '#FFFFFF', padding: '0 24px', height: 56,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky' as const, top: 0, zIndex: 10,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    gap: 12,
  },
  back: {
    color: '#6B7280', textDecoration: 'none', fontSize: 13, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 4, minWidth: 80,
  },
  headerCenter: {
    display: 'flex', alignItems: 'center', gap: 8,
    flex: 1, justifyContent: 'center', overflow: 'hidden',
  },
  titleGroup: {
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', gap: 2, overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 15, fontWeight: 600, color: '#111827', margin: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  dateBadge: { fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' as const },
  editRow: { display: 'flex', alignItems: 'center', gap: 6, flex: 1 },
  editNameInput: {
    flex: 1, padding: '5px 10px', borderRadius: 6,
    border: '1px solid #D1D5DB', background: '#FFFFFF',
    color: '#111827', fontSize: 14, outline: 'none', fontWeight: 600,
  },
  editDateInput: {
    padding: '5px 8px', borderRadius: 6,
    border: '1px solid #D1D5DB', background: '#FFFFFF',
    color: '#111827', fontSize: 13, outline: 'none',
  },
  editSaveBtn: {
    background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 6,
    padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  editCancelBtn: {
    background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB',
    borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  editBtn: {
    background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#374151',
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 4, minWidth: 70,
  },
  main: { maxWidth: 800, margin: '0 auto', padding: '32px 24px' },
  section: { marginBottom: 40 },
  sectionTitle: {
    fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 14,
    display: 'flex', alignItems: 'center', gap: 6,
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  sectionIcon: { fontSize: 18, color: '#9CA3AF' },
  progressBadge: {
    fontSize: 11, fontWeight: 600,
    background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
    borderRadius: 20, padding: '2px 8px', marginLeft: 4,
  },
  memberList: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 },
  memberChip: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 20, padding: '5px 12px',
  },
  memberName: { fontSize: 13, fontWeight: 500, color: '#111827' },
  memberEmail: { fontSize: 11, color: '#9CA3AF' },
  ownerBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
    borderRadius: 10, padding: '1px 7px',
  },
  removeMemberBtn: {
    background: 'none', border: 'none', color: '#D1D5DB',
    cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center',
  },
  addMemberRow: { display: 'flex', gap: 8 },
  memberInput: {
    flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 14, color: '#111827', outline: 'none',
  },
  addMemberBtn: {
    padding: '9px 14px', background: '#16A34A', color: '#FFFFFF',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
    whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 4,
  },
  errorBox: {
    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 10,
  },
  addTodoRow: { display: 'flex', gap: 8, marginBottom: 10 },
  todoInput: {
    flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 14, color: '#111827', outline: 'none',
  },
  addTodoBtn: {
    padding: '9px 14px', background: '#16A34A', color: '#FFFFFF',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
    whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 4,
  },
  emptyState: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 8, padding: '24px', textAlign: 'center' as const,
  },
  emptyIcon: { fontSize: 32, color: '#D1D5DB', display: 'block', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  todoList: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  todoItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px',
  },
  dragHandle: {
    fontSize: 20, color: '#D1D5DB', cursor: 'grab',
    flexShrink: 0, userSelect: 'none' as const, touchAction: 'none',
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, border: '1.5px solid #D1D5DB', background: '#FFFFFF',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, color: '#FFFFFF',
  },
  checkboxDone: { background: '#16A34A', border: '1.5px solid #16A34A' },
  todoContent: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2, minWidth: 0 },
  todoText: { fontSize: 14, wordBreak: 'break-word' as const },
  todoCreator: { fontSize: 11, color: '#9CA3AF' },
  deleteTodoBtn: {
    background: 'none', border: 'none', color: '#D1D5DB',
    cursor: 'pointer', padding: '0 4px', flexShrink: 0, display: 'flex', alignItems: 'center',
  },
  groceryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 16px', background: '#F0FDF4', color: '#16A34A',
    border: '1px solid #BBF7D0', borderRadius: 8, textDecoration: 'none', fontWeight: 500, fontSize: 13,
  },
}
