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
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span className="material-icons-outlined" style={s.headerIcon}>group_add</span>
            <h3 style={s.title}>Share List</h3>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            <span className="material-icons-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div style={s.body}>
          {shares.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={s.sectionLabel}>Shared with</p>
              {shares.map((s) => (
                <div key={s.id} style={shareRow}>
                  <span className="material-icons-outlined" style={{ fontSize: 16, color: '#9CA3AF', flexShrink: 0 }}>person</span>
                  <div style={{ flex: 1 }}>
                    <span style={shareName}>{s.name}</span>
                    <span style={shareEmail}>{s.email}</span>
                  </div>
                  <span style={s.permission === 'edit' ? editBadge : viewBadge}>{s.permission}</span>
                  <button style={removeBtn} onClick={() => removeShare(s.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}

          <p style={s.sectionLabel}>Add person</p>
          {error && (
            <div style={s.errorBox}>
              <span className="material-icons-outlined" style={{ fontSize: 14, marginRight: 5 }}>error_outline</span>
              {error}
            </div>
          )}
          <input
            style={s.input}
            type="email"
            placeholder="their@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addShare()}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <select
              style={s.select}
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
            >
              <option value="view">View only</option>
              <option value="edit">Can edit</option>
            </select>
            <button style={s.addBtn} onClick={addShare} disabled={loading}>
              <span className="material-icons-outlined" style={{ fontSize: 16 }}>person_add</span>
              {loading ? 'Sharing…' : 'Share'}
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
    borderRadius: 12, width: 440, maxWidth: '95vw', overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  },
  header: {
    padding: '16px 20px', background: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 20, color: '#16A34A' },
  title: { fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
    display: 'flex', alignItems: 'center', borderRadius: 6, padding: 4,
  },
  body: { padding: '20px' },
  sectionLabel: {
    margin: '0 0 10px', fontWeight: 600, fontSize: 11,
    color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  input: {
    width: '100%', padding: '9px 12px',
    borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 14, color: '#111827',
    boxSizing: 'border-box' as const, outline: 'none',
  },
  select: {
    flex: 1, padding: '9px 10px',
    borderRadius: 8, border: '1px solid #E5E7EB',
    background: '#FFFFFF', fontSize: 13, color: '#374151', outline: 'none',
  },
  addBtn: {
    padding: '9px 16px', background: '#16A34A', color: '#FFFFFF',
    border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', gap: 5,
  },
  errorBox: {
    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
    borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13,
    display: 'flex', alignItems: 'center',
  },
}

const shareRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 0', borderBottom: '1px solid #F3F4F6',
}
const shareName: React.CSSProperties = { fontWeight: 500, fontSize: 13, color: '#111827', marginRight: 6 }
const shareEmail: React.CSSProperties = { fontSize: 12, color: '#9CA3AF', marginRight: 8 }
const removeBtn: React.CSSProperties = {
  background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
  borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  flexShrink: 0,
}
const viewBadge: React.CSSProperties = {
  background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB',
  borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 500, flexShrink: 0,
}
const editBadge: React.CSSProperties = {
  background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
  borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 500, flexShrink: 0,
}
