import { Link } from 'react-router-dom'
import { useIms } from '../context/ImsContext'
import { ROLE_LABELS } from '../domain/types'
import { dashboardPathForRole, routes } from '../rbac'

export function AccessDeniedPage() {
  const { session, logout } = useIms()

  if (!session) {
    return (
      <div className="gs-center">
        <h1>Access Denied</h1>
        <p>You must sign in first.</p>
        <Link className="gs-btn primary" to={routes.login}>
          Go to sign-in
        </Link>
      </div>
    )
  }

  return (
    <div className="gs-center">
      <h1>Access denied</h1>
      <p>
        You are signed in as <strong>{ROLE_LABELS[session.role]}</strong>. This screen
        is not available for your role.
      </p>
      <div className="gs-row">
        <Link className="gs-btn primary" to={dashboardPathForRole(session.role)}>
          Return to your dashboard
        </Link>
        <button type="button" className="gs-btn outline" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  )
}
