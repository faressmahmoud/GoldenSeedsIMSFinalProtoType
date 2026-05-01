import type {
  ImsState,
  InventoryBatch,
  SalesRecord,
  StockMovement,
} from './types'
import { availableToAllocateOnBatch } from './selectors'

/** Shared filter state for management and reports screens. */
export type UiFilters = {
  dateFrom: string
  dateTo: string
  supplierId: string
  varietyId: string
  customerSegment: string
}

export function defaultUiFilters(): UiFilters {
  return {
    dateFrom: '',
    dateTo: '',
    supplierId: '',
    varietyId: '',
    customerSegment: '',
  }
}

function dateInRange(
  isoDate: string,
  from: string,
  to: string,
): boolean {
  if (from && isoDate < from) return false
  if (to && isoDate > to) return false
  return true
}

/** Batches visible under management-style filters (reference date on submission / approval). */
export function filterBatchesMgmt(ims: ImsState, f: UiFilters): InventoryBatch[] {
  return ims.batches.filter((b) => {
    if (f.supplierId && b.supplierId !== f.supplierId) return false
    if (f.varietyId && b.varietyId !== f.varietyId) return false
    const ref =
      b.batchStatus === 'Active'
        ? b.approvalDate ?? b.receivedDate
        : b.batchStatus === 'InspectionCompleted' && b.inspectionDate
          ? b.inspectionDate
          : b.submittedDate ?? b.receivedDate
    return dateInRange(ref, f.dateFrom, f.dateTo)
  })
}

/** Sales lines for management analytics (allocation / dispatch dates). */
export function filterSalesMgmt(ims: ImsState, f: UiFilters): SalesRecord[] {
  return ims.salesRecords.filter((r) => {
    if (f.customerSegment && r.customerSegment !== f.customerSegment) return false
    if (!dateInRange(r.saleDate, f.dateFrom, f.dateTo)) return false
    const b = ims.batches.find((x) => x.batchId === r.batchId)
    if (!b) return false
    if (f.supplierId && b.supplierId !== f.supplierId) return false
    if (f.varietyId && b.varietyId !== f.varietyId) return false
    return true
  })
}

/** Sales dashboard: filters by batch supplier/variety, segment, and expected dispatch window. */
export function filterSalesOperational(ims: ImsState, f: UiFilters): SalesRecord[] {
  return ims.salesRecords.filter((r) => {
    if (f.customerSegment && r.customerSegment !== f.customerSegment) return false
    if (!dateInRange(r.expectedDispatchDate, f.dateFrom, f.dateTo)) return false
    const b = ims.batches.find((x) => x.batchId === r.batchId)
    if (!b) return false
    if (f.supplierId && b.supplierId !== f.supplierId) return false
    if (f.varietyId && b.varietyId !== f.varietyId) return false
    return true
  })
}

export function filterBatchesOperational(ims: ImsState, f: UiFilters): InventoryBatch[] {
  return ims.batches.filter((b) => {
    if (b.batchStatus !== 'Active') return false
    if (f.supplierId && b.supplierId !== f.supplierId) return false
    if (f.varietyId && b.varietyId !== f.varietyId) return false
    if (f.dateFrom || f.dateTo) {
      const ref = b.approvalDate ?? b.receivedDate
      if (!dateInRange(ref, f.dateFrom, f.dateTo)) return false
    }
    return true
  })
}

export type TonnesPoint = { name: string; tonnes: number }

export function stockByVarietyFromBatches(
  ims: ImsState,
  batches: InventoryBatch[],
): TonnesPoint[] {
  const active = batches.filter((b) => b.batchStatus === 'Active')
  const map = new Map<string, number>()
  for (const b of active) {
    const v = ims.varieties.find((x) => x.varietyId === b.varietyId)
    const label = v?.varietyName ?? b.varietyId
    map.set(label, (map.get(label) ?? 0) + b.remainingQty)
  }
  return [...map.entries()].map(([name, tonnes]) => ({ name, tonnes }))
}

export function stockByOriginFromBatches(batches: InventoryBatch[]): TonnesPoint[] {
  const active = batches.filter((b) => b.batchStatus === 'Active')
  const map = new Map<string, number>()
  for (const b of active) {
    map.set(b.origin, (map.get(b.origin) ?? 0) + b.remainingQty)
  }
  return [...map.entries()].map(([name, tonnes]) => ({ name, tonnes }))
}

export function stockBySupplierFromBatches(
  ims: ImsState,
  batches: InventoryBatch[],
): TonnesPoint[] {
  const active = batches.filter((b) => b.batchStatus === 'Active')
  const map = new Map<string, number>()
  for (const b of active) {
    const s = ims.suppliers.find((x) => x.supplierId === b.supplierId)
    const label = s?.supplierName ?? b.supplierId
    map.set(label, (map.get(label) ?? 0) + b.remainingQty)
  }
  return [...map.entries()].map(([name, tonnes]) => ({ name, tonnes }))
}

/** Daily inbound (approval) vs dispatch tonnes for trend visualization. */
export type MovementTrendPoint = {
  period: string
  inbound: number
  dispatch: number
}

export function movementTrendInboundVsDispatch(
  movements: StockMovement[],
): MovementTrendPoint[] {
  const map = new Map<string, { inbound: number; dispatch: number }>()
  for (const m of movements) {
    const day = m.movementDate.slice(0, 10)
    if (m.movementType === 'InboundApproval') {
      const cur = map.get(day) ?? { inbound: 0, dispatch: 0 }
      cur.inbound += m.quantity
      map.set(day, cur)
    } else if (m.movementType === 'Dispatch') {
      const cur = map.get(day) ?? { inbound: 0, dispatch: 0 }
      cur.dispatch += m.quantity
      map.set(day, cur)
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      inbound: v.inbound,
      dispatch: v.dispatch,
    }))
}

export function allocationBySegmentFromSales(sales: SalesRecord[]): TonnesPoint[] {
  const map = new Map<string, number>()
  for (const r of sales) {
    if (r.status === 'Cancelled' || r.status === 'Dispatched') continue
    const open = r.confirmedQty - r.dispatchedQty
    if (open <= 0) continue
    map.set(r.customerSegment, (map.get(r.customerSegment) ?? 0) + open)
  }
  return [...map.entries()].map(([name, tonnes]) => ({ name, tonnes }))
}

export function dispatchBySegmentFromSales(sales: SalesRecord[]): TonnesPoint[] {
  const map = new Map<string, number>()
  for (const r of sales) {
    if (r.dispatchedQty <= 0) continue
    map.set(r.customerSegment, (map.get(r.customerSegment) ?? 0) + r.dispatchedQty)
  }
  return [...map.entries()].map(([name, tonnes]) => ({ name, tonnes }))
}

export function allocationBySegmentForSalesDash(sales: SalesRecord[]): TonnesPoint[] {
  const map = new Map<string, number>()
  for (const r of sales) {
    if (r.status === 'Cancelled') continue
    const open = r.confirmedQty - r.dispatchedQty
    if (open <= 0) continue
    map.set(r.customerSegment, (map.get(r.customerSegment) ?? 0) + open)
  }
  return [...map.entries()].map(([name, tonnes]) => ({ name, tonnes }))
}

export function mgmtKpisFromFilters(ims: ImsState, f: UiFilters) {
  const batches = filterBatchesMgmt(ims, f)
  const sales = filterSalesMgmt(ims, f)
  const awaitingRelease = batches.filter(
    (b) => b.batchStatus === 'InspectionCompleted',
  ).length
  const activeStockTonnes = batches
    .filter((b) => b.batchStatus === 'Active')
    .reduce((s, b) => s + b.remainingQty, 0)
  const allocatedTonnes = sales
    .filter((r) => r.status === 'Reserved' || r.status === 'PartiallyDispatched')
    .reduce((s, r) => s + (r.confirmedQty - r.dispatchedQty), 0)
  const dispatchedTonnes = sales.reduce((s, r) => s + r.dispatchedQty, 0)
  return {
    awaitingRelease,
    activeStockTonnes,
    allocatedTonnes,
    dispatchedTonnes,
    batches,
    sales,
  }
}

export function reportsKpisFromFilters(ims: ImsState, f: UiFilters) {
  const k = mgmtKpisFromFilters(ims, f)
  return {
    totalActiveStockTonnes: k.activeStockTonnes,
    totalAllocatedTonnes: k.allocatedTonnes,
    totalDispatchedTonnes: k.dispatchedTonnes,
    awaitingRelease: k.awaitingRelease,
    batches: k.batches,
    sales: k.sales,
  }
}

export function totalAvailableStockTonnes(state: ImsState): number {
  let s = 0
  for (const b of state.batches) {
    if (b.batchStatus !== 'Active') continue
    s += b.remainingQty
  }
  return s
}

export function totalAvailableToAllocateTonnes(state: ImsState): number {
  let s = 0
  for (const b of state.batches) {
    if (b.batchStatus !== 'Active') continue
    s += availableToAllocateOnBatch(state, b.batchId)
  }
  return s
}

export function salesDashKpis(ims: ImsState, f: UiFilters) {
  const sales = filterSalesOperational(ims, f)
  const activeBatches = ims.batches.filter((b) => {
    if (b.batchStatus !== 'Active') return false
    if (f.supplierId && b.supplierId !== f.supplierId) return false
    if (f.varietyId && b.varietyId !== f.varietyId) return false
    return true
  })
  const availableStockTonnes = activeBatches.reduce((s, b) => s + b.remainingQty, 0)
  const allocatedTonnes = sales
    .filter((r) => r.status === 'Reserved' || r.status === 'PartiallyDispatched')
    .reduce((s, r) => s + (r.confirmedQty - r.dispatchedQty), 0)
  const pendingDispatches = sales.filter(
    (r) => r.status === 'Reserved' || r.status === 'PartiallyDispatched',
  ).length
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + 21)
  const limit = horizon.toISOString().slice(0, 10)
  const upcomingDispatches = sales.filter((r) => {
    if (r.status !== 'Reserved' && r.status !== 'PartiallyDispatched') return false
    return r.expectedDispatchDate <= limit
  }).length

  return {
    availableStockTonnes,
    allocatedTonnes,
    pendingDispatches,
    upcomingDispatches,
    sales,
    activeBatches,
  }
}

export function supplierOriginTable(
  ims: ImsState,
  batches: InventoryBatch[],
): { supplier: string; origin: string; tonnes: number }[] {
  const rows: { supplier: string; origin: string; tonnes: number }[] = []
  for (const b of batches.filter((x) => x.batchStatus === 'Active')) {
    const sup = ims.suppliers.find((s) => s.supplierId === b.supplierId)
    rows.push({
      supplier: sup?.supplierName ?? b.supplierId,
      origin: b.origin,
      tonnes: b.remainingQty,
    })
  }
  return rows
}
