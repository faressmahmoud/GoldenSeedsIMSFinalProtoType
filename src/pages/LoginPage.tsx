import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { goldenSeedsLogoUrl } from '../branding/goldenSeedsLogo'
import { useIms } from '../context/ImsContext'
import { ROLE_LABELS, type UserRole } from '../domain/types'
import { dashboardPathForRole } from '../rbac'

export function LoginPage() {
  const { session, login } = useIms()
  const [role, setRole] = useState<UserRole>('INVENTORY_OFFICER')
  const [error, setError] = useState<string | undefined>()

  if (session) {
    return <Navigate to={dashboardPathForRole(session.role)} replace />
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = login(role)
    setError(err)
  }

  return (
    <div className="gs-login">
      <div className="gs-login-card">
        <div className="gs-login-logo-wrap">
          <img
            src={goldenSeedsLogoUrl}
            alt="Golden Seeds Logo"
            className="gs-login-logo"
          />
        </div>
        <header className="gs-login-header">
          <h1>Golden Seeds Co.</h1>
        </header>
        <form className="gs-form" onSubmit={onSubmit}>
          <label>
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              required
            >
              {(
                [
                  'INVENTORY_OFFICER',
                  'SALES_OFFICER',
                  'DISTRIBUTION_OFFICER',
                  'MANAGEMENT',
                  'SYSTEM_ADMINISTRATOR',
                ] as UserRole[]
              ).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="gs-error">{error}</p>}
          <button className="gs-btn primary stretch" type="submit">
            Sign in
          </button>
        </form>
        <section className="gs-demo-accounts" aria-label="Demo sign-ins">
          <h2>Demo sign-ins</h2>
          <ul>
            <li>
              Inventory Officer
            </li>
            <li>
              Sales Officer
            </li>
            <li>
              Distribution Officer
            </li>
            <li>
              Management User
            </li>
            <li>
              System Administrator
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
