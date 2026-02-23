import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

interface InventoryList {
  id: number
  name: string
  user_id: number
  created_at: string
  updated_at: string
  permission?: string
  owner_name?: string
}

interface Roadtrip {
  id: number
  name: string
  date: string
  owner_id: number
  owner_name: string
}

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

type BorrowTab = 'incoming' | 'outgoing'

const statusStyles: Record<string, React.CSSProperties> = {
  pending:  { background: '#F5E4B0', color: '#9B7A30', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  approved: { background: '#D8EDCC', color: '#4D6E3A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  rejected: { background: '#FBEEE8', color: '#C46A5A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  returned: { background: '#F2EAD8', color: '#9B7A5A', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sharedLists, setSharedLists] = useState<InventoryList[]>([])
  const [upcomingTrips, setUpcomingTrips] = useState<Roadtrip[]>([])
  const [borrowTab, setBorrowTab] = useState<BorrowTab>('incoming')
  const [incoming, setIncoming] = useState<BorrowRequest[]>([])
  const [outgoing, setOutgoing] = useState<BorrowRequest[]>([])
  const [borrowLoading, setBorrowLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [sharedRes, tripsRes, incRes, outRes] = await Promise.all([
      client.get('/shared-with-me'),
      client.get('/roadtrips').catch(() => ({ data: [] })),
      client.get('/borrow-requests/incoming'),
      client.get('/borrow-requests/outgoing'),
    ])
    setSharedLists(sharedRes.data)
    setIncoming(incRes.data)
    setOutgoing(outRes.data)
    setBorrowLoading(false)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const upcoming = (tripsRes.data as Roadtrip[])
      .filter((t) => {
        if (!t.date) return false
        const [y, m, d] = t.date.split('-').map(Number)
        return new Date(y, m - 1, d) >= today
      })
      .sort((a, b) => a.date.localeCompare(b.date))
    setUpcomingTrips(upcoming)
  }

  const updateBorrowStatus = async (id: number, status: string) => {
    await client.patch(`/borrow-requests/${id}`, { status })
    const [incRes, outRes] = await Promise.all([
      client.get('/borrow-requests/incoming'),
      client.get('/borrow-requests/outgoing'),
    ])
    setIncoming(incRes.data)
    setOutgoing(outRes.data)
  }

  const borrowRows = borrowTab === 'incoming' ? incoming : outgoing

  return (
    <div style={s.page}>
      <header style={s.header} className="app-header">
        <span style={s.logo}>🌲 Rallebola</span>
        <nav style={s.nav} className="app-nav">
          <Link to="/my-lists" style={s.navLink}>📋 My Lists</Link>
          <span style={s.navDivider} className="nav-divider">·</span>
          <Link to="/roadtrips" style={s.navLink}>🚗 Road Trips</Link>
          <span style={s.navDivider} className="nav-divider">·</span>
          <span style={s.navUser} className="nav-user">👤 {user?.name}</span>
          <button style={s.logoutBtn} onClick={() => logout().then(() => navigate('/login'))}>
            Sign out
          </button>
        </nav>
      </header>

      <main style={s.main} className="page-main">
        {upcomingTrips.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>🚗 Upcoming Road Trips</h2>
            <div style={s.grid}>
              {upcomingTrips.map((trip) => {
                const [y, m, d] = trip.date.split('-').map(Number)
                const tripDate = new Date(y, m - 1, d)
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const daysUntil = Math.round((tripDate.getTime() - today.getTime()) / 86400000)
                const dateLabel = tripDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                return (
                  <div key={trip.id} style={s.tripCard}>
                    <div style={s.tripAccent} />
                    <div style={s.tripDate}>
                      <span style={s.tripDateDay}>{tripDate.getDate()}</span>
                      <span style={s.tripDateMonth}>{tripDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                    </div>
                    <div style={s.cardBody}>
                      <Link to={`/roadtrips/${trip.id}`} style={s.cardTitle}>{trip.name}</Link>
                      <span style={s.cardMeta}>
                        {dateLabel}
                        {trip.owner_id !== user?.id && ` · by ${trip.owner_name}`}
                      </span>
                    </div>
                    <span style={daysUntil === 0 ? s.todayBadge : s.daysBadge}>
                      {daysUntil === 0 ? 'Today!' : `${daysUntil}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section style={s.section}>
          <h2 style={s.sectionTitle}>📦 Borrow Requests</h2>

          <div style={s.tabs} className="tabs-container">
            <button style={borrowTab === 'incoming' ? s.tabActive : s.tab} onClick={() => setBorrowTab('incoming')}>
              Incoming
              {incoming.length > 0 && <span style={s.badge}>{incoming.length}</span>}
            </button>
            <button style={borrowTab === 'outgoing' ? s.tabActive : s.tab} onClick={() => setBorrowTab('outgoing')}>
              Outgoing
              {outgoing.length > 0 && <span style={s.badge}>{outgoing.length}</span>}
            </button>
          </div>

          {borrowLoading ? (
            <p style={{ color: '#A08060', padding: 16 }}>Loading…</p>
          ) : borrowRows.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 36 }}>🌾</span>
              <p style={s.emptyText}>
                {borrowTab === 'incoming'
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
                    <th style={s.th}>{borrowTab === 'incoming' ? 'Requester' : 'Owner'}</th>
                    <th style={s.th}>Message</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowRows.map((r, i) => {
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
                          {borrowTab === 'incoming' ? (
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
                          {borrowTab === 'incoming' && r.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button style={approveBtn} onClick={() => updateBorrowStatus(r.id, 'approved')}>Approve</button>
                              <button style={rejectBtn} onClick={() => updateBorrowStatus(r.id, 'rejected')}>Reject</button>
                            </div>
                          )}
                          {borrowTab === 'outgoing' && r.status === 'approved' && (
                            <button style={returnBtn} onClick={() => updateBorrowStatus(r.id, 'returned')}>Mark Returned</button>
                          )}
                          {!((borrowTab === 'incoming' && r.status === 'pending') ||
                             (borrowTab === 'outgoing' && r.status === 'approved')) && (
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
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>🤝 Shared with Me</h2>

          {sharedLists.length === 0 ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 36 }}>🌲</span>
              <p style={s.emptyText}>No neighbours have shared a list with you yet.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {sharedLists.map((list) => (
                <div key={list.id} style={s.listCard}>
                  <div style={{ ...s.cardAccent, background: '#D4A84A' }} />
                  <div style={s.cardBody}>
                    <Link to={`/lists/${list.id}`} style={s.cardTitle}>{list.name}</Link>
                    <span style={s.cardMeta}>by {list.owner_name}</span>
                  </div>
                  <span style={list.permission === 'edit' ? s.editBadge : s.viewBadge}>
                    {list.permission}
                  </span>
                </div>
              ))}
            </div>
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
    padding: '0 32px',
    height: 58,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '2px solid #D4A84A',
  },
  logo: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 21,
    fontWeight: 700,
    color: '#F5E4B0',
  },
  nav: { display: 'flex', alignItems: 'center', gap: 16 },
  navLink: { color: '#E0EED0', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  navDivider: { color: '#94C278', fontSize: 14 },
  navUser: { color: '#C8E0A8', fontSize: 14 },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #94C278',
    color: '#C8E0A8',
    borderRadius: 6,
    padding: '5px 14px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  main: { maxWidth: 900, margin: '0 auto', padding: '40px 20px' },
  section: { marginBottom: 52 },
  sectionTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 21,
    fontWeight: 700,
    color: '#3C2A18',
    marginBottom: 18,
  },
  emptyState: {
    background: '#FDFCF8',
    border: '1.5px dashed #DDD0B0',
    borderRadius: 12,
    padding: '36px 24px',
    textAlign: 'center' as const,
  },
  emptyText: { color: '#A08060', marginTop: 10, fontSize: 15 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  listCard: {
    background: '#FDFCF8',
    border: '1.5px solid #DDD0B0',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 5,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
  },
  cardTitle: {
    fontFamily: "'Lora', Georgia, serif",
    fontWeight: 600,
    fontSize: 17,
    color: '#4D6E3A',
    textDecoration: 'none',
  },
  cardMeta: { fontSize: 12, color: '#A08060' },
  viewBadge: {
    background: '#F2EAD8',
    color: '#9B7A5A',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 600,
    marginRight: 14,
    whiteSpace: 'nowrap' as const,
  },
  editBadge: {
    background: '#E0EED0',
    color: '#4D6E3A',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 600,
    marginRight: 14,
    whiteSpace: 'nowrap' as const,
  },
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
  tripCard: {
    background: '#FDFCF8',
    border: '1.5px solid #DDD0B0',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tripAccent: {
    width: 5,
    alignSelf: 'stretch',
    background: '#D4A84A',
    flexShrink: 0,
  },
  tripDate: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    flexShrink: 0,
    padding: '0 4px',
  },
  tripDateDay: {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 20,
    fontWeight: 700,
    color: '#9B7A30',
    lineHeight: 1,
  },
  tripDateMonth: {
    fontSize: 10,
    fontWeight: 600,
    color: '#C4A882',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  daysBadge: {
    background: '#F5E4B0',
    color: '#9B7A30',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 700,
    marginRight: 14,
    whiteSpace: 'nowrap' as const,
  },
  todayBadge: {
    background: '#D4A84A',
    color: '#3C2A18',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 700,
    marginRight: 14,
    whiteSpace: 'nowrap' as const,
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
