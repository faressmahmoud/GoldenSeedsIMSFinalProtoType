import {
  isValidCustomerSegment,
  isValidInboundQuantityCorrectionReason,
  isValidStorageCategory,
  QUARANTINE_INSPECTING_BODY,
} from './businessConstants'
import { buildInitialState } from './initialData'
import { normalizeImsState } from './normalizeState'
import {
  availableToAllocateOnBatch,
  maxConfirmableQty,
} from './selectors'
import type {
  AuditEntry,
  ImsAction,
  ImsState,
  SessionUser,
  StockMovement,
} from './types'

const nowIso = () => new Date().toISOString()

const rid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `m_${Math.random().toString(36).slice(2, 11)}`

const aid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `a_${Math.random().toString(36).slice(2, 11)}`

function pushAudit(
  actor: SessionUser,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
): AuditEntry {
  return {
    auditId: aid(),
    timestamp: nowIso(),
    userId: actor.userId,
    username: actor.username,
    role: actor.role,
    action,
    entityType,
    entityId,
    details,
  }
}

function pushMovement(
  m: Omit<StockMovement, 'movementId' | 'movementDate'>,
): StockMovement {
  return {
    movementId: rid(),
    movementDate: nowIso(),
    ...m,
  }
}

export type ReduceResult = { state: ImsState; error?: string }

export function reduceIms(
  state: ImsState,
  action: ImsAction,
): ReduceResult {
  switch (action.type) {
    case 'HYDRATE':
      return { state: action.payload }

    case 'SUBMIT_INVENTORY_ENTRY': {
      const {
        shipmentReference,
        varietyId,
        supplierId,
        receivedQty,
        receivedDate,
        origin,
        storageCategory,
        shipmentDocumentNote,
        actor,
      } = action.payload
      if (actor.role !== 'INVENTORY_OFFICER')
        return { state, error: 'Only an Inventory Officer may submit inventory entries.' }
      if (!shipmentReference.trim())
        return { state, error: 'Shipment reference is required.' }
      const ref = shipmentReference.trim()
      if (state.batches.some((b) => b.shipmentReference === ref))
        return {
          state,
          error: `Shipment reference ${ref} is already registered. Use a new reference (for example SHP-2405).`,
        }
      if (!shipmentDocumentNote?.trim())
        return { state, error: 'Attach a shipment document before submitting.' }
      if (!isValidStorageCategory(storageCategory))
        return { state, error: 'Select a valid storage category.' }
      if (receivedQty <= 0) return { state, error: 'Received quantity must be positive.' }
      const batchId = `B-${rid().slice(0, 8)}`
      const submittedDate = nowIso().slice(0, 10)
      const batch = {
        batchId,
        shipmentReference: ref,
        varietyId,
        supplierId,
        origin,
        storageCategory,
        shipmentDocumentNote,
        proposedQty: receivedQty,
        approvedQty: 0,
        remainingQty: 0,
        receivedDate,
        submittedDate,
        batchStatus: 'PendingAgriculturalQuarantine' as const,
        submittedByUserId: actor.userId,
      }
      const audit = pushAudit(
        actor,
        'SUBMIT_INVENTORY_ENTRY',
        'INVENTORY_BATCH',
        batchId,
        `Shipment ${ref}: ${receivedQty} Tonnes received; agricultural quarantine.`,
      )
      return {
        state: {
          ...state,
          batches: [...state.batches, batch],
          audit: [...state.audit, audit],
        },
      }
    }

    case 'CORRECT_INBOUND_QUANTITY': {
      const { batchId, correctedQtyTonnes, reason, actor } = action.payload
      if (actor.role !== 'INVENTORY_OFFICER')
        return {
          state,
          error: 'Only an Inventory Officer may correct inbound quantities.',
        }
      const b = state.batches.find((x) => x.batchId === batchId)
      if (!b) return { state, error: 'Batch not found.' }
      if (b.batchStatus !== 'PendingAgriculturalQuarantine')
        return {
          state,
          error:
            'Inbound quantity can only be corrected while the shipment is in Pending Agricultural Quarantine (before inspection is finalised).',
        }
      if (!Number.isFinite(correctedQtyTonnes) || correctedQtyTonnes <= 0)
        return {
          state,
          error: 'Corrected quantity must be greater than zero.',
        }
      const r = reason.trim()
      if (!r)
        return { state, error: 'Correction reason is required.' }
      if (!isValidInboundQuantityCorrectionReason(r))
        return {
          state,
          error: 'Select a correction reason from the list.',
        }
      const ts = nowIso()
      const next = state.batches.map((x) =>
        x.batchId === batchId
          ? {
              ...x,
              proposedQty: correctedQtyTonnes,
              lastInboundQuantityCorrectionAt: ts,
              lastInboundQuantityCorrectionByUserId: actor.userId,
              lastInboundQuantityCorrectionReason: r,
            }
          : x,
      )
      const audit = pushAudit(
        actor,
        'CORRECT_INBOUND_QUANTITY',
        'INVENTORY_BATCH',
        batchId,
        `Inbound quantity corrected to ${correctedQtyTonnes} Tonnes. Reason: ${r}`,
      )
      return { state: { ...state, batches: next, audit: [...state.audit, audit] } }
    }

    case 'RECORD_QUARANTINE_INSPECTION': {
      const {
        batchId,
        outcome,
        approvedQtyTonnes,
        rejectedQtyTonnes,
        inspectingBody,
        inspectionDate,
        quarantineApprovalDocumentFileName,
        actor,
      } = action.payload
      if (actor.role !== 'INVENTORY_OFFICER')
        return {
          state,
          error: 'Only an Inventory Officer may record quarantine inspection.',
        }
      const b = state.batches.find((x) => x.batchId === batchId)
      if (!b) return { state, error: 'Batch not found.' }
      if (b.batchStatus !== 'PendingAgriculturalQuarantine')
        return {
          state,
          error: 'Inspection can only be recorded while status is Pending Agricultural Quarantine.',
        }
      if (inspectingBody !== QUARANTINE_INSPECTING_BODY)
        return { state, error: 'Select the authorised inspecting body.' }
      if (!inspectionDate.trim())
        return { state, error: 'Inspection date is required.' }
      const docName = quarantineApprovalDocumentFileName.trim()
      if (!docName)
        return {
          state,
          error: 'Quarantine Approval Document is required.',
        }
      const docLower = docName.toLowerCase()
      if (!/\.(pdf|jpe?g|png)$/.test(docLower))
        return {
          state,
          error:
            'Quarantine approval document must be a PDF, JPG, or PNG file.',
        }
      const quarantineApprovalDocumentNote = `Quarantine approval: ${docName}`
      const proposed = b.proposedQty
      const ap = approvedQtyTonnes
      const rj = rejectedQtyTonnes
      if (ap < 0 || rj < 0)
        return { state, error: 'Quantities cannot be negative.' }
      const sum = ap + rj
      if (Math.abs(sum - proposed) > 1e-6)
        return {
          state,
          error: `Approved and rejected quantities must sum to the received quantity (${proposed} Tonnes).`,
        }
      if (outcome === 'Approved') {
        if (ap !== proposed || rj !== 0)
          return {
            state,
            error:
              'For an Approved outcome, approved quantity must equal received quantity and rejected must be zero.',
          }
      } else if (outcome === 'PartiallyApproved') {
        if (ap <= 0 || rj <= 0)
          return {
            state,
            error:
              'Partially approved requires positive approved and rejected quantities.',
          }
      } else {
        if (ap !== 0 || rj !== proposed)
          return {
            state,
            error:
              'For a Rejected outcome, approved quantity must be zero and rejected must equal received quantity.',
          }
      }

      if (outcome === 'Rejected') {
        const next = state.batches.map((x) =>
          x.batchId === batchId
            ? {
                ...x,
                batchStatus: 'Rejected' as const,
                inspectionOutcome: outcome,
                inspectionApprovedQtyTonnes: ap,
                inspectionRejectedQtyTonnes: rj,
                inspectingBody,
                inspectionDate: inspectionDate.trim(),
                quarantineApprovalDocumentNote,
                rejectionReason: 'Rejected at agricultural quarantine inspection.',
              }
            : x,
        )
        const audit = pushAudit(
          actor,
          'RECORD_QUARANTINE_INSPECTION',
          'INVENTORY_BATCH',
          batchId,
          `Inspection rejected ${b.shipmentReference}: ${rj} Tonnes.`,
        )
        return { state: { ...state, batches: next, audit: [...state.audit, audit] } }
      }

      const next = state.batches.map((x) =>
        x.batchId === batchId
          ? {
              ...x,
              batchStatus: 'InspectionCompleted' as const,
              inspectionOutcome: outcome,
              inspectionApprovedQtyTonnes: ap,
              inspectionRejectedQtyTonnes: rj,
              inspectingBody,
              inspectionDate: inspectionDate.trim(),
              quarantineApprovalDocumentNote,
            }
          : x,
      )
      const audit = pushAudit(
        actor,
        'RECORD_QUARANTINE_INSPECTION',
        'INVENTORY_BATCH',
        batchId,
        `Inspection recorded for ${b.shipmentReference}: ${outcome}, ${ap} Tonnes approved.`,
      )
      return { state: { ...state, batches: next, audit: [...state.audit, audit] } }
    }

    case 'RELEASE_AFTER_QUARANTINE_INSPECTION': {
      const { batchId, actor } = action.payload
      if (actor.role !== 'INVENTORY_OFFICER')
        return {
          state,
          error: 'Only an Inventory Officer may release inspected shipments.',
        }
      const b = state.batches.find((x) => x.batchId === batchId)
      if (!b) return { state, error: 'Batch not found.' }
      if (b.batchStatus !== 'InspectionCompleted')
        return {
          state,
          error: 'Release is only available after inspection is completed.',
        }
      const oc = b.inspectionOutcome
      if (oc !== 'Approved' && oc !== 'PartiallyApproved')
        return {
          state,
          error: 'Only approved or partially approved inspections can be released.',
        }
      const fwd = b.inspectionApprovedQtyTonnes
      if (fwd === undefined || fwd <= 0)
        return { state, error: 'Approved quantity from inspection is missing or invalid.' }
      const approvalDate = nowIso().slice(0, 10)
      const nextBatches = state.batches.map((x) =>
        x.batchId === batchId
          ? {
              ...x,
              proposedQty: fwd,
              approvedQty: fwd,
              remainingQty: fwd,
              batchStatus: 'Active' as const,
              approvedByUserId: actor.userId,
              approvalDate,
            }
          : x,
      )
      const movement = pushMovement({
        batchId,
        movementType: 'InboundApproval',
        quantity: fwd,
        performedByUserId: actor.userId,
        notes: 'Quarantine release into available inventory.',
      })
      const audit = pushAudit(
        actor,
        'RELEASE_AFTER_QUARANTINE_INSPECTION',
        'INVENTORY_BATCH',
        batchId,
        `Released ${fwd} Tonnes from quarantine to active stock (${b.shipmentReference}).`,
      )
      return {
        state: {
          ...state,
          batches: nextBatches,
          movements: [...state.movements, movement],
          audit: [...state.audit, audit],
        },
      }
    }

    case 'CREATE_ALLOCATION': {
      const {
        batchId,
        qty,
        customerSegment,
        customerName,
        expectedDispatchDate,
        actor,
      } = action.payload
      if (state.salesRecords.length >= 4)
        return {
          state,
          error:
            'Each catalog shipment already has a sales line; modify or cancel an existing allocation instead.',
        }
      if (actor.role !== 'SALES_OFFICER')
        return { state, error: 'Only a Sales Officer may create allocations.' }
      if (!customerName.trim())
        return { state, error: 'Customer name is required.' }
      if (!expectedDispatchDate.trim())
        return { state, error: 'Expected dispatch date is required.' }
      if (!isValidCustomerSegment(customerSegment))
        return { state, error: 'Select a valid customer segment.' }
      if (qty <= 0) return { state, error: 'Allocation quantity must be positive.' }
      const batch = state.batches.find((x) => x.batchId === batchId)
      if (!batch || batch.batchStatus !== 'Active')
        return { state, error: 'Select an active batch with on-hand stock.' }
      const avail = availableToAllocateOnBatch(state, batchId)
      if (qty > avail)
        return {
          state,
          error: `Cannot allocate more than the available quantity on this batch (${avail} Tonnes).`,
        }
      const saleRecordId = `SR-${rid().slice(0, 8)}`
      const sr = {
        saleRecordId,
        batchId,
        varietyId: batch.varietyId,
        saleDate: nowIso().slice(0, 10),
        requestedQty: qty,
        confirmedQty: qty,
        dispatchedQty: 0,
        customerSegment,
        customerName: customerName.trim(),
        expectedDispatchDate: expectedDispatchDate.trim(),
        status: 'Reserved' as const,
        createdByUserId: actor.userId,
      }
      const movement = pushMovement({
        batchId,
        saleRecordId,
        movementType: 'ReservationCreated',
        quantity: qty,
        performedByUserId: actor.userId,
        notes: 'Allocation recorded against batch on-hand balance.',
      })
      const audit = pushAudit(
        actor,
        'CREATE_ALLOCATION',
        'SALES_RECORD',
        saleRecordId,
        `Allocated ${qty} Tonnes on ${batchId} for ${customerName.trim()} (${customerSegment}), dispatch ${expectedDispatchDate.trim()}.`,
      )
      return {
        state: {
          ...state,
          salesRecords: [...state.salesRecords, sr],
          movements: [...state.movements, movement],
          audit: [...state.audit, audit],
        },
      }
    }

    case 'MODIFY_ALLOCATION': {
      const { saleRecordId, newQty, actor } = action.payload
      if (actor.role !== 'SALES_OFFICER')
        return { state, error: 'Only a Sales Officer may modify allocations.' }
      const sr = state.salesRecords.find((s) => s.saleRecordId === saleRecordId)
      if (!sr) return { state, error: 'Sales record not found.' }
      if (sr.status === 'Cancelled' || sr.status === 'Dispatched')
        return { state, error: 'This allocation can no longer be modified.' }
      if (newQty < sr.dispatchedQty)
        return {
          state,
          error: 'Confirmed quantity cannot be less than the quantity already dispatched.',
        }
      const cap = maxConfirmableQty(state, sr)
      if (newQty > cap)
        return {
          state,
          error: `Cannot raise allocation beyond ${cap} Tonnes given current stock and other reservations.`,
        }
      const nextSr = state.salesRecords.map((s) => {
        if (s.saleRecordId !== saleRecordId) return s
        const newStatus =
          s.dispatchedQty > 0 && newQty <= s.dispatchedQty
            ? ('Dispatched' as const)
            : s.dispatchedQty > 0
              ? ('PartiallyDispatched' as const)
              : ('Reserved' as const)
        return {
          ...s,
          confirmedQty: newQty,
          requestedQty: newQty,
          status: newStatus,
        }
      })
      const movement = pushMovement({
        saleRecordId,
        movementType: 'ReservationModified',
        quantity: newQty - sr.confirmedQty,
        performedByUserId: actor.userId,
        notes: 'Allocation quantity adjusted.',
      })
      const audit = pushAudit(
        actor,
        'MODIFY_ALLOCATION',
        'SALES_RECORD',
        saleRecordId,
        `Changed confirmed quantity from ${sr.confirmedQty} to ${newQty}.`,
      )
      return {
        state: {
          ...state,
          salesRecords: nextSr,
          movements: [...state.movements, movement],
          audit: [...state.audit, audit],
        },
      }
    }

    case 'CANCEL_ALLOCATION': {
      const { saleRecordId, actor } = action.payload
      if (actor.role !== 'SALES_OFFICER')
        return { state, error: 'Only a Sales Officer may cancel allocations.' }
      const sr = state.salesRecords.find((s) => s.saleRecordId === saleRecordId)
      if (!sr) return { state, error: 'Sales record not found.' }
      if (sr.dispatchedQty > 0)
        return {
          state,
          error: 'Cannot cancel an allocation after dispatch has occurred; reduce the confirmed quantity instead.',
        }
      const nextSr = state.salesRecords.map((s) =>
        s.saleRecordId === saleRecordId ? { ...s, status: 'Cancelled' as const } : s,
      )
      const movement = pushMovement({
        saleRecordId,
        movementType: 'ReservationCancelled',
        quantity: sr.confirmedQty,
        performedByUserId: actor.userId,
      })
      const audit = pushAudit(
        actor,
        'CANCEL_ALLOCATION',
        'SALES_RECORD',
        saleRecordId,
        'Allocation cancelled before dispatch.',
      )
      return {
        state: {
          ...state,
          salesRecords: nextSr,
          movements: [...state.movements, movement],
          audit: [...state.audit, audit],
        },
      }
    }

    case 'CONFIRM_DISPATCH': {
      const { saleRecordId, qty, actor } = action.payload
      if (actor.role !== 'DISTRIBUTION_OFFICER')
        return { state, error: 'Only a Distribution Officer may confirm dispatch.' }
      if (qty <= 0) return { state, error: 'Dispatch quantity must be positive.' }
      const sr = state.salesRecords.find((s) => s.saleRecordId === saleRecordId)
      if (!sr) return { state, error: 'Allocation not found.' }
      if (sr.status === 'Cancelled')
        return { state, error: 'Cannot dispatch a cancelled allocation.' }
      const undispatched = sr.confirmedQty - sr.dispatchedQty
      if (qty > undispatched)
        return {
          state,
          error: 'Dispatch quantity cannot exceed the remaining allocated quantity.',
        }
      const b = state.batches.find((x) => x.batchId === sr.batchId)
      if (!b || b.batchStatus !== 'Active')
        return { state, error: 'Source batch is not available for dispatch.' }
      if (qty > b.remainingQty)
        return {
          state,
          error: 'Insufficient stock on the batch to complete this dispatch.',
        }
      const nextRem = b.remainingQty - qty
      if (nextRem < 0)
        return { state, error: 'Stock cannot go negative after dispatch.' }
      const nextBatches = state.batches.map((x) =>
        x.batchId === b.batchId
          ? {
              ...x,
              remainingQty: nextRem,
              batchStatus: nextRem === 0 ? ('Depleted' as const) : x.batchStatus,
            }
          : x,
      )
      const movement = pushMovement({
        batchId: b.batchId,
        saleRecordId,
        movementType: 'Dispatch',
        quantity: qty,
        performedByUserId: actor.userId,
        notes: 'Dispatch deducted from allocated batch.',
      })
      const newDispatched = sr.dispatchedQty + qty
      const newStatus =
        newDispatched >= sr.confirmedQty
          ? ('Dispatched' as const)
          : ('PartiallyDispatched' as const)
      const nextSr = state.salesRecords.map((s) =>
        s.saleRecordId === saleRecordId
          ? { ...s, dispatchedQty: newDispatched, status: newStatus }
          : s,
      )
      const audit = pushAudit(
        actor,
        'CONFIRM_DISPATCH',
        'SALES_RECORD',
        saleRecordId,
        `Dispatched ${qty} Tonnes from batch ${b.batchId}.`,
      )
      return {
        state: {
          ...state,
          batches: nextBatches,
          salesRecords: nextSr,
          movements: [...state.movements, movement],
          audit: [...state.audit, audit],
        },
      }
    }

    case 'STOCK_ADJUSTMENT': {
      const { batchId, delta, actor } = action.payload
      if (actor.role !== 'DISTRIBUTION_OFFICER')
        return {
          state,
          error: 'Only a Distribution Officer may record stock handover.',
        }
      const d = Number(delta)
      if (!Number.isFinite(d) || d === 0)
        return { state, error: 'Handover quantity must be a non-zero number.' }
      const b = state.batches.find((x) => x.batchId === batchId)
      if (!b) return { state, error: 'Batch not found.' }
      if (b.batchStatus !== 'Active')
        return { state, error: 'Stock handover applies only to active inventory batches.' }
      const nextRem = b.remainingQty + d
      if (nextRem < 0)
        return { state, error: 'Stock cannot go negative after handover.' }
      const nextBatches = state.batches.map((x) =>
        x.batchId === batchId
          ? {
              ...x,
              remainingQty: nextRem,
              batchStatus: nextRem === 0 ? ('Depleted' as const) : x.batchStatus,
            }
          : x,
      )
      const movement = pushMovement({
        batchId,
        movementType: 'Adjustment',
        quantity: d,
        performedByUserId: actor.userId,
        notes: 'Stock handover recorded.',
      })
      const audit = pushAudit(
        actor,
        'STOCK_ADJUSTMENT',
        'INVENTORY_BATCH',
        batchId,
        `Stock handover ${d > 0 ? '+' : ''}${d} Tonnes; on hand after posting: ${nextRem} Tonnes.`,
      )
      return {
        state: {
          ...state,
          batches: nextBatches,
          movements: [...state.movements, movement],
          audit: [...state.audit, audit],
        },
      }
    }

    case 'ADMIN_UPSERT_USER': {
      const p = action.payload
      if (p.actor.role !== 'SYSTEM_ADMINISTRATOR')
        return { state, error: 'Only a System Administrator may manage users.' }
      if ('user' in p) {
        if (state.users.some((u) => u.username === p.user.username))
          return { state, error: 'Username already exists.' }
        const audit = pushAudit(
          p.actor,
          'CREATE_USER',
          'APP_USER',
          p.user.userId,
          `Created user ${p.user.username} (${p.user.role}).`,
        )
        return {
          state: {
            ...state,
            users: [...state.users, p.user],
            audit: [...state.audit, audit],
          },
        }
      }
      const { userId, patch, actor } = p
      if (!userId) return { state, error: 'Missing user identifier.' }
      const nextUsers = state.users.map((u) =>
        u.userId === userId ? { ...u, ...patch } : u,
      )
      const audit = pushAudit(
        actor,
        'UPDATE_USER',
        'APP_USER',
        userId,
        `Updated user fields: ${Object.keys(patch).join(', ')}`,
      )
      return {
        state: { ...state, users: nextUsers, audit: [...state.audit, audit] },
      }
    }

    case 'ADMIN_UPSERT_VARIETY': {
      const { variety, actor } = action.payload
      if (actor.role !== 'SYSTEM_ADMINISTRATOR')
        return { state, error: 'Only a System Administrator may edit reference data.' }
      const exists = state.varieties.some((v) => v.varietyId === variety.varietyId)
      if (!exists && state.varieties.length >= 4)
        return {
          state,
          error: 'The variety catalog is fixed at four varieties for this programme.',
        }
      const next = exists
        ? state.varieties.map((v) =>
            v.varietyId === variety.varietyId ? variety : v,
          )
        : [...state.varieties, variety]
      const audit = pushAudit(
        actor,
        exists ? 'UPDATE_VARIETY' : 'CREATE_VARIETY',
        'PRODUCT_VARIETY',
        variety.varietyId,
        variety.varietyName,
      )
      return {
        state: { ...state, varieties: next, audit: [...state.audit, audit] },
      }
    }

    case 'ADMIN_UPSERT_SUPPLIER': {
      const { supplier, actor } = action.payload
      if (actor.role !== 'SYSTEM_ADMINISTRATOR')
        return { state, error: 'Only a System Administrator may edit reference data.' }
      const exists = state.suppliers.some((s) => s.supplierId === supplier.supplierId)
      if (!exists && state.suppliers.length >= 2)
        return {
          state,
          error: 'The supplier catalog is fixed at two suppliers for this programme.',
        }
      const next = exists
        ? state.suppliers.map((s) =>
            s.supplierId === supplier.supplierId ? supplier : s,
          )
        : [...state.suppliers, supplier]
      const audit = pushAudit(
        actor,
        exists ? 'UPDATE_SUPPLIER' : 'CREATE_SUPPLIER',
        'SUPPLIER',
        supplier.supplierId,
        supplier.supplierName,
      )
      return {
        state: { ...state, suppliers: next, audit: [...state.audit, audit] },
      }
    }

    case 'ADMIN_UPSERT_CUSTOMER': {
      const { customer, actor } = action.payload
      if (actor.role !== 'SYSTEM_ADMINISTRATOR')
        return { state, error: 'Only a System Administrator may edit reference data.' }
      const exists = state.customers.some(
        (c) => c.customerId === customer.customerId,
      )
      const next = exists
        ? state.customers.map((c) =>
            c.customerId === customer.customerId ? customer : c,
          )
        : [...state.customers, customer]
      const audit = pushAudit(
        actor,
        exists ? 'UPDATE_CUSTOMER' : 'CREATE_CUSTOMER',
        'CUSTOMER',
        customer.customerId,
        customer.customerName,
      )
      return {
        state: { ...state, customers: next, audit: [...state.audit, audit] },
      }
    }

    default:
      return { state }
  }
}

const STORAGE_KEY = 'goldenSeedsIms.v11'

export function loadPersistedState(): ImsState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeImsState(JSON.parse(raw) as ImsState)
  } catch {
    return null
  }
}

export function persistState(state: ImsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetPersistedState(): ImsState {
  const fresh = buildInitialState()
  persistState(fresh)
  return fresh
}
