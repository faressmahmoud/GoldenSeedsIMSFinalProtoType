import { useState } from 'react'
import { GsActionSuccess } from '../../components/GsActionSuccess'
import { useIms } from '../../context/ImsContext'
import type { AppUser } from '../../domain/types'

export function AdminDashboard() {
  return (
    <div className="gs-stack">
      <h1>Administration</h1>
      <p className="gs-lead">Users, roles, varieties, and suppliers.</p>
    </div>
  )
}

export function AdminUsers() {
  const { ims, session, commit } = useIms()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<AppUser['role']>('INVENTORY_OFFICER')
  const [err, setErr] = useState<string | undefined>()
  const [userCreated, setUserCreated] = useState<{
    title: string
    body: string
  } | null>(null)

  const [resetUserId, setResetUserId] = useState(ims.users[0]?.userId ?? '')
  const [resetPassword, setResetPassword] = useState('')
  const [passwordResetDone, setPasswordResetDone] = useState<{
    title: string
    body: string
  } | null>(null)

  const createUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    const userId = `USR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    const user: AppUser = {
      userId,
      username,
      password,
      displayName,
      role,
      isActive: true,
    }
    const error = commit({ type: 'ADMIN_UPSERT_USER', payload: { user, actor: session } })
    if (error) setErr(error)
    else {
      setErr(undefined)
      setUserCreated({
        title: 'Account created',
        body: `User ${username.trim()} (${displayName.trim()}) has been added with role ${role}. They can sign in with the initial password you set.`,
      })
    }
  }

  const toggle = (u: AppUser) => {
    if (!session) return
    commit({
      type: 'ADMIN_UPSERT_USER',
      payload: { userId: u.userId, patch: { isActive: !u.isActive }, actor: session },
    })
  }

  const applyReset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    commit({
      type: 'ADMIN_UPSERT_USER',
      payload: {
        userId: resetUserId,
        patch: { password: resetPassword },
        actor: session,
      },
    })
    setPasswordResetDone({
      title: 'Password updated',
      body: 'The selected user’s password has been reset. Share the new password through your organisation’s secure channel.',
    })
  }

  return (
    <div className="gs-stack">
      <h1>User management</h1>
      <p className="gs-lead">
        Each account stores the role used at sign-in. Only the System Administrator
        role may access this page.
      </p>
      <form className="gs-form gs-panel" onSubmit={createUser}>
        <h2>Create account</h2>
        <label>
          Username <span className="gs-req">*</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Initial password <span className="gs-req">*</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Display name <span className="gs-req">*</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
        <label>
          Role <span className="gs-req">*</span>
          <select value={role} onChange={(e) => setRole(e.target.value as AppUser['role'])}>
            <option value="INVENTORY_OFFICER">Inventory Officer</option>
            <option value="SALES_OFFICER">Sales Officer</option>
            <option value="DISTRIBUTION_OFFICER">Distribution Officer</option>
            <option value="MANAGEMENT">Management User</option>
            <option value="SYSTEM_ADMINISTRATOR">System Administrator</option>
          </select>
        </label>
        {err && <p className="gs-error">{err}</p>}
        {userCreated && (
          <GsActionSuccess title={userCreated.title}>
            <p>{userCreated.body}</p>
          </GsActionSuccess>
        )}
        <button className="gs-btn primary" type="submit">
          Create user
        </button>
      </form>

      <form className="gs-form gs-panel" onSubmit={applyReset}>
        <h2>Reset password</h2>
        <label>
          User <span className="gs-req">*</span>
          <select value={resetUserId} onChange={(e) => setResetUserId(e.target.value)}>
            {ims.users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.username}
              </option>
            ))}
          </select>
        </label>
        <label>
          New password <span className="gs-req">*</span>
          <input
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            required
          />
        </label>
        {passwordResetDone && (
          <GsActionSuccess title={passwordResetDone.title}>
            <p>{passwordResetDone.body}</p>
          </GsActionSuccess>
        )}
        <button className="gs-btn primary" type="submit">
          Apply password reset
        </button>
      </form>

      <div className="gs-table-wrap">
        <table className="gs-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Display name</th>
              <th>Role</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ims.users.map((u) => (
              <tr key={u.userId}>
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>{u.role}</td>
                <td>{u.isActive ? 'Yes' : 'No'}</td>
                <td>
                  <button type="button" className="gs-btn outline" onClick={() => toggle(u)}>
                    Toggle active
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminReferenceData() {
  const { ims } = useIms()

  return (
    <div className="gs-stack">
      <h1>Reference data</h1>
      <p className="gs-lead">
        Variety and supplier lists are fixed for the current import programme (four
        shipments, two suppliers). Inbound and sales screens use these values only.
      </p>

      <section className="gs-panel gs-stack">
        <h2>Varieties</h2>
        <div className="gs-table-wrap">
          <table className="gs-table">
            <thead>
              <tr>
                <th>Identifier</th>
                <th>Name</th>
                <th>Default origin</th>
              </tr>
            </thead>
            <tbody>
              {ims.varieties.map((v) => (
                <tr key={v.varietyId}>
                  <td>{v.varietyId}</td>
                  <td>{v.varietyName}</td>
                  <td>{v.originDefault}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="gs-panel gs-stack">
        <h2>Suppliers</h2>
        <div className="gs-table-wrap">
          <table className="gs-table">
            <thead>
              <tr>
                <th>Identifier</th>
                <th>Name</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {ims.suppliers.map((s) => (
                <tr key={s.supplierId}>
                  <td>{s.supplierId}</td>
                  <td>{s.supplierName}</td>
                  <td>{s.country}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
