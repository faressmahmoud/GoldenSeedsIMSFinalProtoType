import { BrowserRouter } from 'react-router-dom'
import { ImsProvider } from './context/ImsContext'
import { AppRoutes } from './AppRoutes'

function routerBasename(): string | undefined {
  const b = import.meta.env.BASE_URL
  if (!b || b === '/') return undefined
  const trimmed = b.replace(/\/$/, '')
  return trimmed || undefined
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <ImsProvider>
        <AppRoutes />
      </ImsProvider>
    </BrowserRouter>
  )
}
