import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

interface BorrowRequest {
  id: number
  item_id: number
  item_name: string
  list_id: number
  list_name: string
  status: 'pending' | 'approved' | 'rejected' | 'returned'
  message: string | null
  created_at: string
  updated_at: string
  requester_user_id?: number
  requester_name?: string
  requester_email?: string
  owner_name?: string
}

type Tab = 'incoming' | 'outgoing'

const statusStyles: Record<string, React.CSSProperties> = {
  pending:  { background: '#F5E4B0', color: '#9B7A30', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  approved: { background: '#D8EDCC', color: '#4D6E3A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  rejected: { background: '#FBEEE8', color: '#C46A5A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  returned: { background: '#F2EAD8', color: '#9B7A5A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
}

export default function BorrowRequests() {
  const [tab, setTab] = useState<Tab>('incoming')
  const [incoming, setIncoming] = useState<BorrowRequest[]>([])
  const [outgoing, setOutgoing] = useState<BorrowRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [inc, out] = await Promise.all([
      client.get('/borrow-requests/incoming'),
      client.get('/borrow-requests/outgoing'),
    ])
    setIncoming(inc.data)
    setOutgoing(out.data)
    setLoading(false)
  }

  const updateStatus = async (id: number, status: string) => {
    await client.patch(`/borrow-requests/${id}`, { status })
    fetchAll()
  }

  const rows = tab === 'incoming' ? incoming : outgoing

  return (
    <div style={s.page}>
      <header style={s.header} className="app-header">
        <Link to="/" style={s.back}>← Back</Link>
        <div style={s.headerCenter}>
          <span style={{ fontSize: 20 }}>📦</span>
          <h1 style={s.headerTitle}>Borrow Requests</h1>
        </div>
        <div style={{ width: 80 }} />
      </header>

      <main style={s.main} className="page-main">
        <div style={s.tabs} className="tabs-container">
          <button style={tab === 'incoming' ? s.tabActive : s.tab} onClick={() => setTab('incoming')}>
            Incoming
            {incoming.length > 0 && <span style={s.badge}>{incoming.length}</span>}
          </button>
          <button style={tab === 'outgoing' ? s.tabActive : s.tab} onClick={() => setTab('outgoing')}>
            Outgoing
            {outgoing.length > 0 && <span style={s.badge}>{outgoing.length}</span>}
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#A08060', padding: 16 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div style={s.emptyState}>
            <span style={{ fontSize: 36 }}>🌾</span>
            <p style={s.emptyText}>
              {tab === 'incoming'
                ? 'No one has requested to borrow anything yet.'
                : 'You have not made any borrow requests yet.'}
            </p>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Item</th>
                  <th style={s.th}>List</th>
                  <th style={s.th}>{tab === 'incoming' ? 'Requester' : 'Owner'}</th>
                  <th style={s.th}>Message</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const rowBg = i % 2 === 0 ? '#FDFCF8' : '#F7F2E8'
                  const td: React.CSSProperties = {
                    padding: '11px 16px',
                    borderBottom: '1px solid #EDE6D4',
                    fontSize: 14, color: '#3C2A18',
                    verticalAlign: 'middle',
                    background: rowBg,
                  }
                  return (
                    <tr key={r.id}>
                      <td style={{ ...td, fontWeight: 500 }}>{r.item_name}</td>
                      <td style={td}>
                        <Link to={`/lists/${r.list_id}`} style={{ color: '#6B9652', fontWeight: 500, textDecoration: 'none' }}>
                          {r.list_name}
                        </Link>
                      </td>
                      <td style={td}>
                        {tab === 'incoming' ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{r.requester_name}</div>
                            <div style={{ fontSize: 12, color: '#A08060' }}>{r.requester_email}</div>
                          </>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{r.owner_name}</span>
                        )}
                      </td>
                      <td style={{ ...td, color: '#A08060' }}>{r.message ?? '—'}</td>
                      <td style={td}>
                        <span style={statusStyles[r.status] ?? {}}>{r.status}</span>
                      </td>
                      <td style={td}>
                        {tab === 'incoming' && r.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={approveBtn} onClick={() => updateStatus(r.id, 'approved')}>Approve</button>
                            <button style={rejectBtn} onClick={() => updateStatus(r.id, 'rejected')}>Reject</button>
                          </div>
                        )}
                        {tab === 'outgoing' && r.status === 'approved' && (
                          <button style={returnBtn} onClick={() => updateStatus(r.id, 'returned')}>Mark Returned</button>
                        )}
                        {!((tab === 'incoming' && r.status === 'pending') ||
                           (tab === 'outgoing' && r.status === 'approved')) && (
                          <span style={{ color: '#C4A882' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#F7F2E8' },
  header: {
    background: '#5C7A48',
    padding: '0 28px', height: 58,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '2px solid #D4A84A',
  },
  back: { color: '#C8E0A8', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  headerCenter: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  headerTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 20, fontWeight: 700, color: '#F5E4B0', margin: 0,
  },
  main: { maxWidth: 1000, margin: '0 auto', padding: '32px 20px' },
  tabs: { display: 'flex', gap: 6, marginBottom: 24 },
  tab: {
    padding: '9px 22px', background: '#FDFCF8',
    border: '1.5px solid #DDD0B0', borderRadius: 8,
    cursor: 'pointer', fontWeight: 500, fontSize: 14, color: '#6E4E30',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  tabActive: {
    padding: '9px 22px', background: '#5C7A48',
    border: '1.5px solid #5C7A48', borderRadius: 8,
    cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#F5E4B0',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  badge: {
    background: '#D4A84A', color: '#FDFCF8',
    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
  },
  emptyState: {
    background: '#FDFCF8', border: '1.5px dashed #DDD0B0',
    borderRadius: 12, padding: '48px 24px', textAlign: 'center' as const,
  },
  emptyText: { color: '#A08060', marginTop: 10, fontSize: 15 },
  tableWrap: { overflowX: 'auto' as const },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    background: '#FDFCF8', borderRadius: 12, overflow: 'hidden',
    border: '1.5px solid #DDD0B0',
  },
  th: {
    padding: '12px 16px', textAlign: 'left' as const,
    fontWeight: 600, fontSize: 11, letterSpacing: '0.7px',
    textTransform: 'uppercase' as const, color: '#A08060',
    background: '#F2EAD8', borderBottom: '1.5px solid #DDD0B0',
  },
}

const approveBtn: React.CSSProperties = {
  background: '#D8EDCC', color: '#4D6E3A',
  border: '1px solid #B8D89C', borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
}
const rejectBtn: React.CSSProperties = {
  background: '#FBEEE8', color: '#C46A5A',
  border: '1px solid #F0C4BC', borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
}
const returnBtn: React.CSSProperties = {
  background: '#F2EAD8', color: '#9B7A5A',
  border: '1px solid #DDD0B0', borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
}
