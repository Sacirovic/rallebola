import { useState } from 'react'
import client from '../api/client'

interface Props {
  itemId: number
  itemName: string
  onClose: () => void
  onSuccess: () => void
}

export default function BorrowRequestModal({ itemId, itemName, onClose, onSuccess }: Props) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      await client.post(`/items/${itemId}/borrow-requests`, { message: message.trim() || null })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span className="material-icons-outlined" style={s.headerIcon}>swap_horiz</span>
            <h3 style={s.title}>Request to Borrow</h3>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            <span className="material-icons-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div style={s.body}>
          <div style={s.itemRow}>
            <span className="material-icons-outlined" style={{ fontSize: 16, color: '#9CA3AF' }}>inventory_2</span>
            <span style={s.itemLabel}>Item: </span>
            <strong style={s.itemName}>{itemName}</strong>
          </div>

          {error && (
            <div style={s.errorBox}>
              <span className="material-icons-outlined" style={{ fontSize: 14, marginRight: 5 }}>error_outline</span>
              {error}
            </div>
          )}

          <label style={s.fieldLabel}>Message to owner (optional)</label>
          <textarea
            style={s.textarea}
            rows={3}
            placeholder="Add a note to your request…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div style={s.actions}>
            <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={s.submitBtn} onClick={submit} disabled={loading}>
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>send</span>
              {loading ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    backdropFilter: 'blur(2px)',
  },
  modal: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 12, width: 400, maxWidth: '95vw', overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  },
  header: {
    padding: '16px 20px', background: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 20, color: '#D97706' },
  title: { fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
    display: 'flex', alignItems: 'center', borderRadius: 6, padding: 4,
  },
  body: { padding: '20px' },
  itemRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 },
  itemLabel: { fontSize: 13, color: '#6B7280' },
  itemName: { fontSize: 13, color: '#111827', fontWeight: 600 },
  fieldLabel: {
    display: 'block', fontWeight: 600, fontSize: 11,
    color: '#9CA3AF', marginBottom: 6,
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  textarea: {
    width: '100%', padding: '9px 12px',
    borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 14, color: '#111827',
    resize: 'vertical' as const, boxSizing: 'border-box' as const, outline: 'none',
  },
  errorBox: {
    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
    borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13,
    display: 'flex', alignItems: 'center',
  },
  actions: { display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' },
  cancelBtn: {
    padding: '9px 16px', background: '#F9FAFB', color: '#374151',
    border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 13,
  },
  submitBtn: {
    padding: '9px 16px', background: '#D97706', color: '#FFFFFF',
    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', gap: 5,
  },
}
