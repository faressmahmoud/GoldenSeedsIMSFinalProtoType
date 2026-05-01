import { NavLink, Outlet } from 'react-router-dom'
import { goldenSeedsLogoUrl } from '../branding/goldenSeedsLogo'
import { useIms } from '../context/ImsContext'
import { ROLE_LABELS, type UserRole } from '../domain/types'
import { dashboardPathForRole, navigationForRole } from '../rbac'

const ROLE_ACCENT: Record<UserRole, string> = {
  INVENTORY_OFFICER: '#1b5e3a',
  SALES_OFFICER: '#0d3b5c',
  DISTRIBUTION_OFFICER: '#0d3b5c',
  MANAGEMENT: '#6a1b1b',
  SYSTEM_ADMINISTRATOR: '#3a0d5c',
}

export function AppShell() {
  const { session, logout } = useIms()
  if (!session) return <Outlet />

  const accent = ROLE_ACCENT[session.role]
  const nav = navigationForRole(session.role)

  return (
    <div className="gs-app" style={{ ['--gs-accent' as string]: accent }}>
      <header className="gs-header">
        <div className="gs-brand">
          <img
            src={goldenSeedsLogoUrl}
            alt=""
            className="gs-brand-logo"
          />
          <div className="gs-brand-text">
            <span className="gs-logo">Golden Seeds Co.</span>
            <span className="gs-sub">Inventory management</span>
          </div>
        </div>
        <div className="gs-user">
          <span className="gs-role-pill">{ROLE_LABELS[session.role]}</span>
          <div className="gs-user-meta">
            <strong>{session.displayName}</strong>
            <span className="gs-muted">@{session.username}</span>
          </div>
          <button type="button" className="gs-btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <div className="gs-body">
        <aside className="gs-side">
          <nav className="gs-nav">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `gs-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="gs-side-foot">
            <NavLink className="gs-link" to={dashboardPathForRole(session.role)}>
              Dashboard
            </NavLink>
          </div>
        </aside>
        <main className="gs-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
