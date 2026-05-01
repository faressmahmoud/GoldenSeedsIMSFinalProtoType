import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  useEffect,
} from 'react'
import { buildInitialState } from '../domain/initialData'
import type { UserRole } from '../domain/types'
import {
  loadPersistedState,
  persistState,
  reduceIms,
  resetPersistedState,
} from '../domain/imsReducer'
import type { ImsAction, ImsState, SessionUser } from '../domain/types'

const SESSION_KEY = 'goldenSeedsIms.session'

type ImsContextValue = {
  ims: ImsState
  session: SessionUser | null
  login: (role: UserRole) => string | undefined
  logout: () => void
  commit: (action: ImsAction) => string | undefined
  resetDemo: () => void
}

const ImsContext = createContext<ImsContextValue | null>(null)

function readSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function ImsProvider({ children }: { children: ReactNode }) {
  const [ims, setIms] = useState<ImsState>(
    () => loadPersistedState() ?? buildInitialState(),
  )
  const [session, setSession] = useState<SessionUser | null>(readSession)

  useEffect(() => {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_KEY)
  }, [session])

  const login = useCallback((role: UserRole) => {
    const u = ims.users.find((x) => x.role === role)
    if (!u) return 'Role account was not found.'
    if (!u.isActive) return 'Account is inactive.'
    setSession({
      userId: u.userId,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
    })
    return undefined
  }, [ims.users])

  const logout = useCallback(() => setSession(null), [])

  const commit = useCallback(
    (action: ImsAction) => {
      const r = reduceIms(ims, action)
      if (r.error) return r.error
      setIms(r.state)
      persistState(r.state)
      return undefined
    },
    [ims],
  )

  const resetDemo = useCallback(() => {
    const fresh = resetPersistedState()
    setIms(fresh)
  }, [])

  const value = useMemo(
    () => ({ ims, session, login, logout, commit, resetDemo }),
    [ims, session, login, logout, commit, resetDemo],
  )

  return <ImsContext.Provider value={value}>{children}</ImsContext.Provider>
}

export function useIms() {
  const ctx = useContext(ImsContext)
  if (!ctx) throw new Error('useIms must be used within ImsProvider')
  return ctx
}
