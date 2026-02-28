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

const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
  pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  returned: { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
}

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] ?? statusConfig.returned
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>
      {status}
    </span>
  )
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
        <Link to="/" style={s.logo}>
          <span className="material-icons-outlined" style={s.logoIcon}>eco</span>
          Rallebola
        </Link>
        <nav style={s.nav} className="app-nav">
          <Link to="/roadtrips" style={s.navLink}>Road Trips</Link>
          <Link to="/my-lists" style={s.navLink}>My Equipment</Link>
        </nav>
        <div style={s.headerRight}>
          <span style={s.navUser} className="nav-user">
            <span className="material-icons-outlined" style={{ fontSize: 16, color: '#9CA3AF' }}>person</span>
            {user?.name}
          </span>
          <button style={s.logoutBtn} onClick={() => logout().then(() => navigate('/login'))}>
            Sign out
          </button>
        </div>
      </header>

      <main style={s.main} className="page-main">
        {upcomingTrips.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>
              <span className="material-icons-outlined" style={s.sectionIcon}>directions_car</span>
              Upcoming Road Trips
            </h2>
            <div style={s.grid}>
              {upcomingTrips.map((trip) => {
                const [y, m, d] = trip.date.split('-').map(Number)
                const tripDate = new Date(y, m - 1, d)
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const daysUntil = Math.round((tripDate.getTime() - today.getTime()) / 86400000)
                const dateLabel = tripDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                return (
                  <div key={trip.id} style={s.tripCard}>
                    <div style={s.tripDateBlock}>
                      <span style={s.tripDay}>{tripDate.getDate()}</span>
                      <span style={s.tripMonth}>{tripDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                    </div>
                    <div style={s.cardBody}>
                      <Link to={`/roadtrips/${trip.id}`} style={s.cardTitle}>{trip.name}</Link>
                      <span style={s.cardMeta}>
                        {dateLabel}
                        {trip.owner_id !== user?.id && ` · by ${trip.owner_name}`}
                      </span>
                    </div>
                    <span style={daysUntil === 0 ? s.todayBadge : s.daysBadge}>
                      {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section style={s.section}>
          <h2 style={s.sectionTitle}>
            <span className="material-icons-outlined" style={s.sectionIcon}>swap_horiz</span>
            Borrow Requests
          </h2>

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
            <p style={s.loadingText}>Loading…</p>
          ) : borrowRows.length === 0 ? (
            <div style={s.emptyState}>
              <span className="material-icons-outlined" style={s.emptyIcon}>inbox</span>
              <p style={s.emptyText}>
                {borrowTab === 'incoming'
                  ? 'No incoming borrow requests.'
                  : 'You have not made any borrow requests.'}
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
                  {borrowRows.map((r) => (
                    <tr key={r.id} style={s.tr}>
                      <td style={{ ...s.td, fontWeight: 500, color: '#111827' }}>{r.item_name}</td>
                      <td style={s.td}>
                        <Link to={`/lists/${r.list_id}`} style={s.tableLink}>{r.list_name}</Link>
                      </td>
                      <td style={s.td}>
                        {borrowTab === 'incoming' ? (
                          <>
                            <div style={{ fontWeight: 500, color: '#111827' }}>{r.requester_name}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{r.requester_email}</div>
                          </>
                        ) : (
                          <span style={{ fontWeight: 500, color: '#111827' }}>{r.owner_name}</span>
                        )}
                      </td>
                      <td style={{ ...s.td, color: '#9CA3AF' }}>{r.message ?? '—'}</td>
                      <td style={s.td}><StatusBadge status={r.status} /></td>
                      <td style={s.td}>
                        {borrowTab === 'incoming' && r.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={s.approveBtn} onClick={() => updateBorrowStatus(r.id, 'approved')}>Approve</button>
                            <button style={s.rejectBtn} onClick={() => updateBorrowStatus(r.id, 'rejected')}>Reject</button>
                          </div>
                        )}
                        {borrowTab === 'outgoing' && r.status === 'approved' && (
                          <button style={s.returnBtn} onClick={() => updateBorrowStatus(r.id, 'returned')}>Mark Returned</button>
                        )}
                        {!((borrowTab === 'incoming' && r.status === 'pending') ||
                           (borrowTab === 'outgoing' && r.status === 'approved')) && (
                          <span style={{ color: '#D1D5DB' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>
            <span className="material-icons-outlined" style={s.sectionIcon}>group_add</span>
            Shared with Me
          </h2>

          {sharedLists.length === 0 ? (
            <div style={s.emptyState}>
              <span className="material-icons-outlined" style={s.emptyIcon}>folder_shared</span>
              <p style={s.emptyText}>No lists have been shared with you yet.</p>
            </div>
          ) : (
            <div style={s.grid}>
              {sharedLists.map((list) => (
                <div key={list.id} style={s.listCard}>
                  <div style={s.cardAccentAmber} />
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
  page: { minHeight: '100vh', background: '#F8FAFC' },
  header: {
    background: '#FFFFFF', padding: '0 24px', height: 56,
    display: 'flex', alignItems: 'center',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky' as const, top: 0, zIndex: 10,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  logo: {
    fontSize: 15, fontWeight: 700, color: '#111827', textDecoration: 'none',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  logoIcon: { fontSize: 20, color: '#16A34A' },
  nav: { display: 'flex', alignItems: 'center', gap: 2, marginLeft: 20 },
  navLink: { padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#6B7280', textDecoration: 'none' },
  headerRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 },
  navUser: { fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 },
  logoutBtn: {
    background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280',
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13,
  },
  main: { maxWidth: 900, margin: '0 auto', padding: '40px 24px' },
  section: { marginBottom: 48 },
  sectionTitle: {
    fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 6,
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  },
  sectionIcon: { fontSize: 18, color: '#9CA3AF' },
  loadingText: { color: '#9CA3AF', fontSize: 14 },
  emptyState: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 10, padding: '32px 24px', textAlign: 'center' as const,
  },
  emptyIcon: { fontSize: 32, color: '#D1D5DB', display: 'block', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  listCard: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 8, display: 'flex', alignItems: 'center', overflow: 'hidden',
  },
  tripCard: {
    background: '#FFFFFF', border: '1px solid #E5E7EB',
    borderRadius: 8, display: 'flex', alignItems: 'center', overflow: 'hidden',
  },
  cardAccentAmber: { width: 3, alignSelf: 'stretch', background: '#F59E0B', flexShrink: 0 },
  cardBody: {
    flex: 1, padding: '12px 16px',
    display: 'flex', flexDirection: 'column' as const, gap: 3,
  },
  cardTitle: { fontWeight: 500, fontSize: 14, color: '#111827', textDecoration: 'none' },
  cardMeta: { fontSize: 12, color: '#9CA3AF' },
  tripDateBlock: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', width: 52, padding: '0 8px', flexShrink: 0,
    borderRight: '1px solid #E5E7EB',
  },
  tripDay: { fontSize: 18, fontWeight: 700, color: '#D97706', lineHeight: 1 },
  tripMonth: { fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  daysBadge: {
    background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A',
    borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600,
    marginRight: 12, whiteSpace: 'nowrap' as const,
  },
  todayBadge: {
    background: '#D97706', color: '#FFFFFF',
    borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700,
    marginRight: 12, whiteSpace: 'nowrap' as const,
  },
  viewBadge: {
    background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB',
    borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500,
    marginRight: 12, whiteSpace: 'nowrap' as const,
  },
  editBadge: {
    background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
    borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500,
    marginRight: 12, whiteSpace: 'nowrap' as const,
  },
  tabs: { display: 'flex', gap: 4, marginBottom: 16 },
  tab: {
    padding: '7px 16px', background: '#FFFFFF',
    border: '1px solid #E5E7EB', borderRadius: 6,
    cursor: 'pointer', fontWeight: 500, fontSize: 13, color: '#6B7280',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  tabActive: {
    padding: '7px 16px', background: '#F0FDF4',
    border: '1px solid #BBF7D0', borderRadius: 6,
    cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#16A34A',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  badge: {
    background: '#16A34A', color: '#FFFFFF',
    borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700,
  },
  tableWrap: { overflowX: 'auto' as const },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    background: '#FFFFFF', borderRadius: 8, overflow: 'hidden',
    border: '1px solid #E5E7EB',
  },
  th: {
    padding: '10px 14px', textAlign: 'left' as const,
    fontWeight: 600, fontSize: 11, letterSpacing: '0.5px',
    textTransform: 'uppercase' as const, color: '#9CA3AF',
    background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
  },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '10px 14px', fontSize: 13, color: '#6B7280', verticalAlign: 'middle' },
  tableLink: { color: '#16A34A', fontWeight: 500, textDecoration: 'none', fontSize: 13 },
  approveBtn: {
    background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
    borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  },
  rejectBtn: {
    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
    borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  },
  returnBtn: {
    background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB',
    borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  },
}
