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

const statusStyles: Record<string, React.CSSProperties> = {
  pending:  { background: '#F5E4B0', color: '#9B7A30', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  approved: { background: '#D8EDCC', color: '#4D6E3A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  rejected: { background: '#FBEEE8', color: '#C46A5A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  returned: { background: '#F2EAD8', color: '#9B7A5A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
}

export default function ItemRow({ item, rowIndex, canEdit, isOwner, onUpdated, onDeleted, onBorrowRequested }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [notes, setNotes] = useState(item.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [showBorrow, setShowBorrow] = useState(false)

  const rowBg = rowIndex % 2 === 0 ? '#FDFCF8' : '#F7F2E8'

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
    padding: '11px 16px',
    borderBottom: '1px solid #EDE6D4',
    verticalAlign: 'middle',
    fontSize: 14,
    color: '#3C2A18',
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
          <button style={saveBtn} onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</button>
          <button style={cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
        </td>
      </tr>
    )
  }

  const status = item.borrow_status

  return (
    <>
      <tr>
        <td style={{ ...td, fontWeight: 500 }}>{item.name}</td>
        <td style={{ ...td, color: '#6E4E30', fontWeight: 600 }}>{item.quantity}</td>
        <td style={{ ...td, color: '#A08060' }}>{item.notes ?? '—'}</td>
        <td style={td}>
          {status ? <span style={statusStyles[status] ?? {}}>{status}</span> : '—'}
        </td>
        <td style={td}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {canEdit && (
              <>
                <button style={editBtn} onClick={() => setEditing(true)}>Edit</button>
                <button style={deleteBtn} onClick={del}>Delete</button>
              </>
            )}
            {!isOwner && (
              <button style={borrowBtn} onClick={() => setShowBorrow(true)}>Borrow</button>
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
  padding: '6px 10px', borderRadius: 6,
  border: '1.5px solid #DDD0B0', background: '#F7F2E8',
  fontSize: 13, width: '100%', outline: 'none', color: '#3C2A18',
}
const saveBtn: React.CSSProperties = {
  background: '#89B86E', color: '#FDFCF8',
  border: 'none', borderRadius: 6, padding: '5px 12px',
  cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 6,
}
const cancelBtn: React.CSSProperties = {
  background: '#F2EAD8', color: '#6E4E30',
  border: '1px solid #DDD0B0', borderRadius: 6, padding: '5px 10px',
  cursor: 'pointer', fontSize: 12,
}
const editBtn: React.CSSProperties = {
  background: '#E0EED0', color: '#4D6E3A',
  border: '1px solid #B8D89C', borderRadius: 6, padding: '4px 10px',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
}
const deleteBtn: React.CSSProperties = {
  background: '#FBEEE8', color: '#C46A5A',
  border: '1px solid #F0C4BC', borderRadius: 6, padding: '4px 10px',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
}
const borrowBtn: React.CSSProperties = {
  background: '#F5E4B0', color: '#9B7A30',
  border: '1px solid #EAC870', borderRadius: 6, padding: '4px 10px',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
}
