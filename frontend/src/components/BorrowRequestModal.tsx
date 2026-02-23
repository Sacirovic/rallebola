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
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <h3 style={title}>📦 Request to Borrow</h3>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={body}>
          <p style={itemLabel}>Item: <strong style={{ color: '#4D6E3A' }}>{itemName}</strong></p>
          {error && <div style={errorBox}>{error}</div>}
          <label style={fieldLabel}>Message to owner (optional)</label>
          <textarea
            style={textarea}
            rows={3}
            placeholder="I'd like to borrow this for the harvest weekend…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button style={cancelBtn} onClick={onClose}>Cancel</button>
            <button style={submitBtn} onClick={submit} disabled={loading}>
              {loading ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(77,110,58,0.35)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
}
const modal: React.CSSProperties = {
  background: '#FDFCF8', border: '1.5px solid #DDD0B0',
  borderRadius: 14, width: 400, maxWidth: '95vw', overflow: 'hidden',
}
const header: React.CSSProperties = {
  padding: '18px 22px', background: '#F2EAD8',
  borderBottom: '1.5px solid #DDD0B0',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const title: React.CSSProperties = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: 18, fontWeight: 700, color: '#4D6E3A', margin: 0,
}
const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', color: '#A08060',
}
const body: React.CSSProperties = { padding: '22px' }
const itemLabel: React.CSSProperties = { fontSize: 14, color: '#6E4E30', marginBottom: 16 }
const fieldLabel: React.CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: 12,
  color: '#6E4E30', marginBottom: 6,
  textTransform: 'uppercase' as const, letterSpacing: '0.6px',
}
const textarea: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  borderRadius: 8, border: '1.5px solid #DDD0B0',
  background: '#F7F2E8', fontSize: 14, color: '#3C2A18',
  resize: 'vertical' as const, boxSizing: 'border-box' as const, outline: 'none',
}
const errorBox: React.CSSProperties = {
  background: '#FBEEE8', color: '#C46A5A',
  border: '1px solid #F0C4BC', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13,
}
const cancelBtn: React.CSSProperties = {
  padding: '10px 18px', background: '#F2EAD8', color: '#6E4E30',
  border: '1px solid #DDD0B0', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 14,
}
const submitBtn: React.CSSProperties = {
  padding: '10px 20px', background: '#D4A84A', color: '#FDFCF8',
  border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
}
