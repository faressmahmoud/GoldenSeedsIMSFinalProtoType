import type { UserRole } from './domain/types'

export const routes = {
  login: '/login',
  accessDenied: '/access-denied',

  ioDashboard: '/io/dashboard',
  ioInventoryEntry: '/io/inventory-entry',
  ioQuarantine: '/io/quarantine',
  ioSearch: '/io/search',
  ioRecord: '/io/record',

  salesDashboard: '/sales/dashboard',
  salesCheckStock: '/sales/check-stock',
  salesAllocation: '/sales/allocation',

  distributionDashboard: '/distribution/dashboard',
  distributionDispatch: '/distribution/dispatch',

  mgmtDashboard: '/mgmt/dashboard',
  mgmtAvailability: '/mgmt/availability-review',
  mgmtReportsKpi: '/mgmt/reports-kpi',

  adminDashboard: '/admin/dashboard',
  adminUsers: '/admin/users',
  adminReference: '/admin/reference-data',
} as const

const IO_PREFIX = '/io'
const SALES_PREFIX = '/sales'
const DISTRIBUTION_PREFIX = '/distribution'
const MGMT_PREFIX = '/mgmt'
const ADMIN_PREFIX = '/admin'

const allowedPrefixes: Record<UserRole, readonly string[]> = {
  INVENTORY_OFFICER: [IO_PREFIX],
  SALES_OFFICER: [SALES_PREFIX],
  DISTRIBUTION_OFFICER: [DISTRIBUTION_PREFIX],
  MANAGEMENT: [MGMT_PREFIX],
  SYSTEM_ADMINISTRATOR: [ADMIN_PREFIX],
}

export function roleOwnsPathPrefix(role: UserRole, pathname: string): boolean {
  return allowedPrefixes[role].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export function isPathAllowedForRole(
  role: UserRole,
  pathname: string,
): boolean {
  if (pathname === routes.accessDenied) return true
  return roleOwnsPathPrefix(role, pathname)
}

export type NavItem = { to: string; label: string }

export function navigationForRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'INVENTORY_OFFICER':
      return [
        { to: routes.ioDashboard, label: 'Dashboard' },
        { to: routes.ioInventoryEntry, label: 'Inbound Shipments' },
        { to: routes.ioQuarantine, label: 'Quarantine & Inspection' },
      ]
    case 'SALES_OFFICER':
      return [
        { to: routes.salesDashboard, label: 'Dashboard' },
        { to: routes.salesCheckStock, label: 'Stock Availability' },
        { to: routes.salesAllocation, label: 'Stock Allocation' },
      ]
    case 'DISTRIBUTION_OFFICER':
      return [
        { to: routes.distributionDashboard, label: 'Dashboard' },
        { to: routes.distributionDispatch, label: 'Stock Dispatch and Handover' },
      ]
    case 'MANAGEMENT':
      return [
        { to: routes.mgmtDashboard, label: 'Executive Dashboard' },
        { to: routes.mgmtAvailability, label: 'Inventory Overview' },
      ]
    case 'SYSTEM_ADMINISTRATOR':
      return [
        { to: routes.adminDashboard, label: 'Dashboard' },
        { to: routes.adminUsers, label: 'Users' },
        { to: routes.adminReference, label: 'Reference data' },
      ]
    default:
      return []
  }
}

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case 'INVENTORY_OFFICER':
      return routes.ioDashboard
    case 'SALES_OFFICER':
      return routes.salesDashboard
    case 'DISTRIBUTION_OFFICER':
      return routes.distributionDashboard
    case 'MANAGEMENT':
      return routes.mgmtDashboard
    case 'SYSTEM_ADMINISTRATOR':
      return routes.adminDashboard
    default:
      return routes.login
  }
}
