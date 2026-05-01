import type {
  AppUser,
  AuditEntry,
  ImsState,
  InventoryBatch,
  SalesRecord,
  UserRole,
} from './types'

/** Ensure persisted or legacy payloads match current domain shape. */
export function normalizeImsState(state: ImsState): ImsState {
  return {
    ...state,
    users: state.users.map(normalizeUser),
    audit: (state.audit ?? []).map(normalizeAuditEntry),
    batches: state.batches.map(normalizeBatch),
    salesRecords: state.salesRecords.map(normalizeSalesRecord),
  }
}

function migrateLegacyRole(role: string | undefined): UserRole | undefined {
  if (role === 'SALES_DISTRIBUTION') return 'SALES_OFFICER'
  return role as UserRole | undefined
}

function normalizeUser(u: AppUser): AppUser {
  const migrated = migrateLegacyRole(u.role)
  if (migrated && migrated !== u.role) {
    return { ...u, role: migrated }
  }
  return u
}

function normalizeAuditEntry(a: AuditEntry): AuditEntry {
  const migrated = migrateLegacyRole(a.role)
  if (migrated && migrated !== a.role) {
    return { ...a, role: migrated }
  }
  return a
}

function normalizeBatch(b: InventoryBatch): InventoryBatch {
  const { customerSegment: _legacySegment, ...withoutSegment } = b as InventoryBatch & {
    customerSegment?: string
  }
  const base = withoutSegment as InventoryBatch
  const note = (base as { shipmentDocumentNote?: string }).shipmentDocumentNote
  const shipmentDocumentNote =
    typeof note === 'string' && note.includes('Attachment (simulated): ')
      ? note.replace('Attachment (simulated): ', 'Attachment: ')
      : note
  const legacyStatus = (base as { batchStatus?: string }).batchStatus
  if (legacyStatus === 'PendingManagementApproval') {
    const proposedQty = base.proposedQty
    const approvedQty = base.approvedQty > 0 ? base.approvedQty : proposedQty
    const remainingQty = base.remainingQty > 0 ? base.remainingQty : approvedQty
    return {
      ...base,
      batchStatus: 'Active',
      proposedQty,
      approvedQty,
      remainingQty,
      submittedDate: (base as { submittedDate?: string }).submittedDate ?? base.receivedDate,
      shipmentDocumentNote,
    }
  }
  return {
    ...base,
    submittedDate: (base as { submittedDate?: string }).submittedDate ?? base.receivedDate,
    shipmentDocumentNote,
  }
}

function normalizeSalesRecord(r: SalesRecord): SalesRecord {
  const row = r as SalesRecord & {
    customerName?: string
    expectedDispatchDate?: string
  }
  return {
    ...row,
    customerName:
      typeof row.customerName === 'string' && row.customerName.trim()
        ? row.customerName.trim()
        : '—',
    expectedDispatchDate:
      typeof row.expectedDispatchDate === 'string' && row.expectedDispatchDate
        ? row.expectedDispatchDate
        : row.saleDate,
  }
}
