import { useState, useEffect } from 'react'
import client from '../api/client'

interface Share {
  id: number
  user_id: number
  name: string
  email: string
  permission: 'view' | 'edit'
}

interface Props {
  listId: number
  onClose: () => void
}

export default function ShareModal({ listId, onClose }: Props) {
  const [shares, setShares] = useState<Share[]>([])
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    client.get(`/lists/${listId}/shares`).then((r) => setShares(r.data))
  }, [listId])

  const addShare = async () => {
    if (!email.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await client.post(`/lists/${listId}/shares`, { email: email.trim(), permission })
      setShares((prev) => {
        const idx = prev.findIndex((s) => s.email === res.data.email)
        if (idx >= 0) { const next = [...prev]; next[idx] = res.data; return next }
        return [...prev, res.data]
      })
      setEmail('')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to add share')
    } finally {
      setLoading(false)
    }
  }

  const removeShare = async (shareId: number) => {
    await client.delete(`/lists/${listId}/shares/${shareId}`)
    setShares((prev) => prev.filter((s) => s.id !== shareId))
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <h3 style={title}>🤝 Share this List</h3>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={body}>
          {shares.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={sectionLabel}>Currently shared with</p>
              {shares.map((s) => (
                <div key={s.id} style={shareRow}>
                  <div>
                    <span style={shareName}>{s.name}</span>
                    <span style={shareEmail}>{s.email}</span>
                    <span style={s.permission === 'edit' ? editBadge : viewBadge}>{s.permission}</span>
                  </div>
                  <button style={removeBtn} onClick={() => removeShare(s.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}

          <p style={sectionLabel}>Add a neighbour</p>
          {error && <div style={errorBox}>{error}</div>}
          <input
            style={inputStyle}
            type="email"
            placeholder="their@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addShare()}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <select
              style={selectStyle}
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
            >
              <option value="view">View only</option>
              <option value="edit">Can edit</option>
            </select>
            <button style={addBtn} onClick={addShare} disabled={loading}>
              {loading ? 'Sharing…' : 'Share'}
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
  borderRadius: 14, width: 440, maxWidth: '95vw', overflow: 'hidden',
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
const sectionLabel: React.CSSProperties = {
  margin: '0 0 10px', fontWeight: 600, fontSize: 12,
  color: '#6E4E30', textTransform: 'uppercase' as const, letterSpacing: '0.6px',
}
const shareRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '8px 0', borderBottom: '1px solid #EDE6D4',
}
const shareName: React.CSSProperties = { fontWeight: 600, fontSize: 14, color: '#3C2A18', marginRight: 8 }
const shareEmail: React.CSSProperties = { fontSize: 12, color: '#A08060', marginRight: 8 }
const removeBtn: React.CSSProperties = {
  background: '#FBEEE8', color: '#C46A5A',
  border: '1px solid #F0C4BC', borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  borderRadius: 8, border: '1.5px solid #DDD0B0',
  background: '#F7F2E8', fontSize: 15, color: '#3C2A18',
  boxSizing: 'border-box' as const, outline: 'none',
}
const selectStyle: React.CSSProperties = {
  flex: 1, padding: '11px 12px',
  borderRadius: 8, border: '1.5px solid #DDD0B0',
  background: '#F7F2E8', fontSize: 14, color: '#3C2A18', outline: 'none',
}
const addBtn: React.CSSProperties = {
  padding: '11px 22px', background: '#6B9652', color: '#F7F2E8',
  border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
}
const errorBox: React.CSSProperties = {
  background: '#FBEEE8', color: '#C46A5A',
  border: '1px solid #F0C4BC', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13,
}
const viewBadge: React.CSSProperties = {
  background: '#F2EAD8', color: '#9B7A5A',
  borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600,
}
const editBadge: React.CSSProperties = {
  background: '#E0EED0', color: '#4D6E3A',
  borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600,
}
