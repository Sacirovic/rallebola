import { useState } from 'react'
import client from '../api/client'
import BorrowRequestModal from './BorrowRequestModal'

interface Item {
  id: number
  list_id: number
  name: string
  quantity: number
  notes: string | null
  borrow_status?: string | null
}

interface Props {
  item: Item
  rowIndex: number
  canEdit: boolean
  isOwner: boolean
  onUpdated: (item: Item) => void
  onDeleted: (id: number) => void
  onBorrowRequested: () => void
}

const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
  pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  returned: { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
}

export default function ItemRow({ item, rowIndex, canEdit, isOwner, onUpdated, onDeleted, onBorrowRequested }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [notes, setNotes] = useState(item.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [showBorrow, setShowBorrow] = useState(false)

  const rowBg = rowIndex % 2 === 0 ? '#FFFFFF' : '#FAFAFA'

  const save = async () => {
    setSaving(true)
    try {
      const res = await client.put(`/lists/${item.list_id}/items/${item.id}`, {
        name: name.trim(),
        quantity: parseInt(quantity) || 1,
        notes: notes.trim() || null,
      })
      onUpdated(res.data)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirm('Delete this item?')) return
    await client.delete(`/lists/${item.list_id}/items/${item.id}`)
    onDeleted(item.id)
  }

  const td: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: '1px solid #F3F4F6',
    verticalAlign: 'middle',
    fontSize: 13,
    color: '#6B7280',
    background: rowBg,
  }

  if (editing) {
    return (
      <tr>
        <td style={td}>
          <input style={cellInput} value={name} onChange={(e) => setName(e.target.value)} />
        </td>
        <td style={td}>
          <input
            style={{ ...cellInput, width: 64 }}
            type="number" min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </td>
        <td style={td}>
          <input style={cellInput} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </td>
        <td style={td}>—</td>
        <td style={td}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={saveBtn} onClick={save} disabled={saving}>
              <span className="material-icons-outlined" style={{ fontSize: 14 }}>check</span>
              {saving ? '…' : 'Save'}
            </button>
            <button style={cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </td>
      </tr>
    )
  }

  const status = item.borrow_status
  const sc = status ? (statusConfig[status] ?? statusConfig.returned) : null

  return (
    <>
      <tr>
        <td style={{ ...td, fontWeight: 500, color: '#111827' }}>{item.name}</td>
        <td style={{ ...td, fontWeight: 600, color: '#374151' }}>{item.quantity}</td>
        <td style={{ ...td, color: '#9CA3AF' }}>{item.notes ?? '—'}</td>
        <td style={td}>
          {sc ? (
            <span style={{
              background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
              borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
            }}>
              {status}
            </span>
          ) : '—'}
        </td>
        <td style={td}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {canEdit && (
              <>
                <button style={editBtn} onClick={() => setEditing(true)}>
                  <span className="material-icons-outlined" style={{ fontSize: 13 }}>edit</span>
                  Edit
                </button>
                <button style={deleteBtn} onClick={del}>
                  <span className="material-icons-outlined" style={{ fontSize: 13 }}>delete</span>
                  Delete
                </button>
              </>
            )}
            {!isOwner && (
              <button style={borrowBtn} onClick={() => setShowBorrow(true)}>
                <span className="material-icons-outlined" style={{ fontSize: 13 }}>swap_horiz</span>
                Borrow
              </button>
            )}
          </div>
        </td>
      </tr>
      {showBorrow && (
        <BorrowRequestModal
          itemId={item.id}
          itemName={item.name}
          onClose={() => setShowBorrow(false)}
          onSuccess={onBorrowRequested}
        />
      )}
    </>
  )
}

const cellInput: React.CSSProperties = {
  padding: '5px 9px', borderRadius: 6,
  border: '1px solid #E5E7EB', background: '#FFFFFF',
  fontSize: 13, width: '100%', outline: 'none', color: '#111827',
}
const saveBtn: React.CSSProperties = {
  background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 3,
}
const cancelBtn: React.CSSProperties = {
  background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB',
  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
}
const editBtn: React.CSSProperties = {
  background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB',
  borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 3,
}
const deleteBtn: React.CSSProperties = {
  background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
  borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 3,
}
const borrowBtn: React.CSSProperties = {
  background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A',
  borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  display: 'flex', alignItems: 'center', gap: 3,
}
