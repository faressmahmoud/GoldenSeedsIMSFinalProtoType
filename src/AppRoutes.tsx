import { Navigate, Route, Routes } from 'react-router-dom'
import { useIms } from './context/ImsContext'
import { AuthGuard } from './layout/AuthGuard'
import { AdminDashboard, AdminReferenceData, AdminUsers } from './pages/admin/AdminPages'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import {
  IODashboard,
  IOInventoryEntry,
  IOQuarantineQueue,
  IORecordDetails,
  IOSearch,
} from './pages/io/InventoryOfficerPages'
import { LoginPage } from './pages/LoginPage'
import { MgmtAvailabilityReview, MgmtDashboard } from './pages/mgmt/ManagementPages'
import {
  SalesAllocation,
  SalesCheckStock,
  SalesDashboard,
} from './pages/sales/SalesPages'
import {
  DistributionDashboard,
  DistributionDispatch,
} from './pages/distribution/DistributionPages'
import { dashboardPathForRole, routes } from './rbac'

function HomeRedirect() {
  const { session } = useIms()
  if (!session) return <Navigate to={routes.login} replace />
  return <Navigate to={dashboardPathForRole(session.role)} replace />
}

function NotFound() {
  const { session } = useIms()
  if (!session) return <Navigate to={routes.login} replace />
  return <Navigate to={dashboardPathForRole(session.role)} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={routes.login} element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path={routes.accessDenied} element={<AccessDeniedPage />} />

      <Route element={<AuthGuard />}>
        <Route path={routes.ioDashboard} element={<IODashboard />} />
        <Route path={routes.ioInventoryEntry} element={<IOInventoryEntry />} />
        <Route path={routes.ioQuarantine} element={<IOQuarantineQueue />} />
        <Route path={routes.ioSearch} element={<IOSearch />} />
        <Route path={`${routes.ioRecord}/:batchId`} element={<IORecordDetails />} />

        <Route path={routes.salesDashboard} element={<SalesDashboard />} />
        <Route path={routes.salesCheckStock} element={<SalesCheckStock />} />
        <Route path={routes.salesAllocation} element={<SalesAllocation />} />

        <Route
          path={routes.distributionDashboard}
          element={<DistributionDashboard />}
        />
        <Route
          path={routes.distributionDispatch}
          element={<DistributionDispatch />}
        />

        <Route path={routes.mgmtDashboard} element={<MgmtDashboard />} />
        <Route path={routes.mgmtAvailability} element={<MgmtAvailabilityReview />} />
        <Route
          path={routes.mgmtReportsKpi}
          element={<Navigate to={routes.mgmtDashboard} replace />}
        />

        <Route path={routes.adminDashboard} element={<AdminDashboard />} />
        <Route path={routes.adminUsers} element={<AdminUsers />} />
        <Route path={routes.adminReference} element={<AdminReferenceData />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
