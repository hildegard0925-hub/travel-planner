import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'

const NAV_ITEMS = [
  { label: '홈', icon: '🏠', path: '/' },
  { label: '일정', icon: '📅', path: 'schedule' },
  { label: '지도', icon: '🗺️', path: 'map' },
  { label: '기록', icon: '📖', path: 'records' },
  { label: '비용', icon: '💴', path: 'cost' },
  { label: '준비물', icon: '🧳', path: 'checklist' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tripId } = useParams()
  const basePath = tripId ? `/trip/${tripId}` : null
  const activePath = location.pathname

  const handleNav = (item) => {
    if (item.path === '/') {
      navigate('/')
    } else if (basePath) {
      const dest = item.path === 'schedule' ? basePath : `${basePath}/${item.path}`
      navigate(dest)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="page" style={{ flex: 1 }}>
        <Outlet />
      </div>

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        height: 'var(--nav-h)',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        zIndex: 20,
      }}>
        {NAV_ITEMS.map((item) => {
          const dest = item.path === '/'
            ? '/'
            : item.path === 'schedule'
              ? basePath
              : basePath ? `${basePath}/${item.path}` : null

          const isActive = dest && activePath === dest
          const disabled = item.path !== '/' && !tripId

          return (
            <button
              key={item.path}
              onClick={() => handleNav(item)}
              disabled={disabled}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                padding: '6px 0',
                opacity: disabled ? 0.3 : 1,
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                transition: 'color .15s',
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
