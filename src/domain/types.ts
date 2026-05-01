/** Golden Seeds Co. IMS — batches, movements, sales records, and RBAC. */

export type UserRole =
  | 'INVENTORY_OFFICER'
  | 'SALES_OFFICER'
  | 'DISTRIBUTION_OFFICER'
  | 'MANAGEMENT'
  | 'SYSTEM_ADMINISTRATOR'

export const ROLE_LABELS: Record<UserRole, string> = {
  INVENTORY_OFFICER: 'Inventory Officer',
  SALES_OFFICER: 'Sales Officer',
  DISTRIBUTION_OFFICER: 'Distribution Officer',
  MANAGEMENT: 'Management User',
  SYSTEM_ADMINISTRATOR: 'System Administrator',
}

export interface AppUser {
  userId: string
  username: string
  password: string
  displayName: string
  role: UserRole
  isActive: boolean
}

/** Seed potato variety (reference). */
export interface ProductVariety {
  varietyId: string
  varietyName: string
  category: string
  originDefault: string
  description?: string
}

/** Supplier (reference). */
export interface Supplier {
  supplierId: string
  supplierName: string
  country: string
  contactPerson?: string
  phone?: string
  email?: string
  isActive: boolean
}

/** Optional customer account (reference). */
export interface Customer {
  customerId: string
  customerName: string
  customerType: string
  phone?: string
  email?: string
  isActive: boolean
}

/** Inbound lot — sellable once released from quarantine inspection to Active. */
export type BatchStatus =
  | 'PendingAgriculturalQuarantine'
  | 'InspectionCompleted'
  | 'Active'
  | 'Rejected'
  | 'Depleted'

/** Result of agricultural quarantine inspection (before release to active stock). */
export type InspectionOutcome = 'Approved' | 'PartiallyApproved' | 'Rejected'

export interface InventoryBatch {
  batchId: string
  shipmentReference: string
  varietyId: string
  supplierId: string
  origin: string
  storageCategory: string
  /** Shipment document reference (filename or note on file). */
  shipmentDocumentNote?: string
  proposedQty: number
  approvedQty: number
  remainingQty: number
  receivedDate: string
  /** Date the Inventory Officer submitted the inbound entry. */
  submittedDate: string
  batchStatus: BatchStatus
  submittedByUserId: string
  approvedByUserId?: string
  approvalDate?: string
  rejectionReason?: string
  /** Set when inspection is recorded (quarantine workflow). */
  inspectionOutcome?: InspectionOutcome
  inspectionApprovedQtyTonnes?: number
  inspectionRejectedQtyTonnes?: number
  inspectingBody?: string
  inspectionDate?: string
  /** Stored reference to the uploaded quarantine approval file (filename on record). */
  quarantineApprovalDocumentNote?: string
  /** Set when inbound quantity is corrected while still in agricultural quarantine. */
  lastInboundQuantityCorrectionAt?: string
  lastInboundQuantityCorrectionByUserId?: string
  lastInboundQuantityCorrectionReason?: string
}

export type SalesRecordStatus =
  | 'Reserved'
  | 'PartiallyDispatched'
  | 'Dispatched'
  | 'Cancelled'

export interface SalesRecord {
  saleRecordId: string
  batchId: string
  varietyId: string
  saleDate: string
  requestedQty: number
  confirmedQty: number
  dispatchedQty: number
  customerSegment: string
  /** Commercial counterparty for this allocation. */
  customerName: string
  /** Planned outbound date for planning and reporting. */
  expectedDispatchDate: string
  status: SalesRecordStatus
  createdByUserId: string
}

export type MovementType =
  | 'InboundApproval'
  | 'Dispatch'
  | 'Adjustment'
  | 'ReservationCreated'
  | 'ReservationModified'
  | 'ReservationCancelled'

export interface StockMovement {
  movementId: string
  batchId?: string
  saleRecordId?: string
  movementType: MovementType
  quantity: number
  movementDate: string
  performedByUserId: string
  notes?: string
}

export interface AuditEntry {
  auditId: string
  timestamp: string
  userId: string
  username: string
  role: UserRole
  action: string
  entityType: string
  entityId: string
  details: string
}

export interface ImsState {
  users: AppUser[]
  varieties: ProductVariety[]
  suppliers: Supplier[]
  customers: Customer[]
  batches: InventoryBatch[]
  salesRecords: SalesRecord[]
  movements: StockMovement[]
  audit: AuditEntry[]
}

export interface SessionUser {
  userId: string
  username: string
  displayName: string
  role: UserRole
}

export type ImsAction =
  | { type: 'HYDRATE'; payload: ImsState }
  | {
      type: 'SUBMIT_INVENTORY_ENTRY'
      payload: {
        shipmentReference: string
        varietyId: string
        supplierId: string
        origin: string
        receivedQty: number
        receivedDate: string
        storageCategory: string
        shipmentDocumentNote?: string
        actor: SessionUser
      }
    }
  | {
      type: 'CORRECT_INBOUND_QUANTITY'
      payload: {
        batchId: string
        correctedQtyTonnes: number
        reason: string
        actor: SessionUser
      }
    }
  | {
      type: 'RECORD_QUARANTINE_INSPECTION'
      payload: {
        batchId: string
        outcome: InspectionOutcome
        approvedQtyTonnes: number
        rejectedQtyTonnes: number
        inspectingBody: string
        inspectionDate: string
        /** Client file name; must be PDF, JPG, or PNG. */
        quarantineApprovalDocumentFileName: string
        actor: SessionUser
      }
    }
  | {
      type: 'RELEASE_AFTER_QUARANTINE_INSPECTION'
      payload: { batchId: string; actor: SessionUser }
    }
  | {
      type: 'CREATE_ALLOCATION'
      payload: {
        batchId: string
        qty: number
        customerSegment: string
        customerName: string
        expectedDispatchDate: string
        actor: SessionUser
      }
    }
  | {
      type: 'MODIFY_ALLOCATION'
      payload: { saleRecordId: string; newQty: number; actor: SessionUser }
    }
  | {
      type: 'CANCEL_ALLOCATION'
      payload: { saleRecordId: string; actor: SessionUser }
    }
  | {
      type: 'CONFIRM_DISPATCH'
      payload: { saleRecordId: string; qty: number; actor: SessionUser }
    }
  | {
      type: 'STOCK_ADJUSTMENT'
      payload: { batchId: string; delta: string; actor: SessionUser }
    }
  | {
      type: 'ADMIN_UPSERT_USER'
      payload:
        | { user: AppUser; actor: SessionUser }
        | {
            userId: string
            patch: Partial<
              Pick<AppUser, 'displayName' | 'role' | 'isActive' | 'password'>
            >
            actor: SessionUser
          }
    }
  | {
      type: 'ADMIN_UPSERT_VARIETY'
      payload: { variety: ProductVariety; actor: SessionUser }
    }
  | {
      type: 'ADMIN_UPSERT_SUPPLIER'
      payload: { supplier: Supplier; actor: SessionUser }
    }
  | {
      type: 'ADMIN_UPSERT_CUSTOMER'
      payload: { customer: Customer; actor: SessionUser }
    }
