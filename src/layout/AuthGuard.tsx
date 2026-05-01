import { Navigate, useLocation } from 'react-router-dom'
import { useIms } from '../context/ImsContext'
import { isPathAllowedForRole } from '../rbac'
import { routes } from '../rbac'
import { AccessDeniedPage } from '../pages/AccessDeniedPage'
import { AppShell } from './AppShell'

export function AuthGuard() {
  const { session } = useIms()
  const location = useLocation()

  if (!session) {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />
  }

  if (!isPathAllowedForRole(session.role, location.pathname)) {
    return <AccessDeniedPage />
  }

  return <AppShell />
}
