import type {
  BatchStatus,
  InspectionOutcome,
  MovementType,
  SalesRecordStatus,
} from './types'

export function inspectionOutcomeLabel(outcome: InspectionOutcome): string {
  switch (outcome) {
    case 'Approved':
      return 'Approved'
    case 'PartiallyApproved':
      return 'Partially Approved'
    case 'Rejected':
      return 'Rejected'
    default:
      return outcome
  }
}

export function batchStatusLabel(status: BatchStatus): string {
  switch (status) {
    case 'PendingAgriculturalQuarantine':
      return 'Pending Agricultural Quarantine'
    case 'InspectionCompleted':
      return 'Inspection Completed'
    case 'Active':
      return 'Active'
    case 'Rejected':
      return 'Rejected'
    case 'Depleted':
      return 'Depleted'
    default:
      return status
  }
}

/** Short label for chips and compact tables. */
export function batchStatusShort(status: BatchStatus): string {
  switch (status) {
    case 'PendingAgriculturalQuarantine':
      return 'Quarantine'
    case 'InspectionCompleted':
      return 'Inspected'
    case 'Active':
      return 'Active'
    case 'Rejected':
      return 'Rejected'
    case 'Depleted':
      return 'Depleted'
    default:
      return status
  }
}

/** Visual variant for status chips (inventory workflow). */
export function batchStatusChipClass(status: BatchStatus): string {
  switch (status) {
    case 'PendingAgriculturalQuarantine':
      return 'gs-status gs-status--aq'
    case 'InspectionCompleted':
      return 'gs-status gs-status--inspection'
    case 'Active':
      return 'gs-status gs-status--active'
    case 'Rejected':
      return 'gs-status gs-status--rejected'
    case 'Depleted':
      return 'gs-status gs-status--depleted'
    default:
      return 'gs-status'
  }
}

export function salesRecordStatusLabel(status: SalesRecordStatus): string {
  switch (status) {
    case 'Reserved':
      return 'Allocated'
    case 'PartiallyDispatched':
      return 'Part-dispatched'
    case 'Dispatched':
      return 'Dispatched'
    case 'Cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

export function movementTypeLabel(type: MovementType): string {
  switch (type) {
    case 'InboundApproval':
      return 'Inbound release'
    case 'Dispatch':
      return 'Dispatch'
    case 'Adjustment':
      return 'Stock handover'
    case 'ReservationCreated':
      return 'Allocation'
    case 'ReservationModified':
      return 'Allocation change'
    case 'ReservationCancelled':
      return 'Allocation cancelled'
    default:
      return type
  }
}
