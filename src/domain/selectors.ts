import type { ImsState, InventoryBatch, SalesRecord } from './types'

export function physicalRemainingForVariety(
  state: ImsState,
  varietyId: string,
): number {
  return state.batches
    .filter((b) => b.varietyId === varietyId && b.batchStatus === 'Active')
    .reduce((sum, b) => sum + b.remainingQty, 0)
}

/** Reserved quantity still on the shelf against a specific batch. */
export function reservedQtyOnBatch(
  state: ImsState,
  batchId: string,
  excludeSaleRecordId?: string,
): number {
  return state.salesRecords
    .filter(
      (sr) =>
        sr.batchId === batchId &&
        sr.status !== 'Cancelled' &&
        sr.status !== 'Dispatched' &&
        sr.saleRecordId !== excludeSaleRecordId,
    )
    .reduce((sum, sr) => sum + (sr.confirmedQty - sr.dispatchedQty), 0)
}

/** Physical on batch minus reservations (other + current line’s own hold counts toward cap). */
export function availableToAllocateOnBatch(
  state: ImsState,
  batchId: string,
  excludeSaleRecordId?: string,
): number {
  const b = state.batches.find((x) => x.batchId === batchId)
  if (!b || b.batchStatus !== 'Active') return 0
  const reserved = reservedQtyOnBatch(state, batchId, excludeSaleRecordId)
  return b.remainingQty - reserved
}

export function maxConfirmableQty(state: ImsState, record: SalesRecord): number {
  const b = state.batches.find((x) => x.batchId === record.batchId)
  if (!b || b.batchStatus !== 'Active') return record.dispatchedQty
  const others = reservedQtyOnBatch(state, record.batchId, record.saleRecordId)
  return record.dispatchedQty + (b.remainingQty - others)
}

export function batchesAvailableForAllocation(
  batches: InventoryBatch[],
): InventoryBatch[] {
  return batches
    .filter((b) => b.batchStatus === 'Active' && b.remainingQty > 0)
    .slice()
    .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate))
}

/** Total dispatched units across all sales lines. */
export function totalDispatchedUnits(state: ImsState): number {
  return state.salesRecords.reduce((s, r) => s + r.dispatchedQty, 0)
}

/** Sum of on-hand quantity (t) across active import batches. */
export function totalActiveStockTonnes(state: ImsState): number {
  return state.batches
    .filter((b) => b.batchStatus === 'Active')
    .reduce((s, b) => s + b.remainingQty, 0)
}

/** Open allocation quantity (t): reserved on the shelf, not yet fully dispatched. */
export function totalOpenAllocatedTonnes(state: ImsState): number {
  return state.salesRecords
    .filter((r) => r.status === 'Reserved' || r.status === 'PartiallyDispatched')
    .reduce((s, r) => s + (r.confirmedQty - r.dispatchedQty), 0)
}

/** Count of batches with at least one open allocation (allocated but not fully dispatched). */
export function batchesWithOpenAllocations(state: ImsState): number {
  const ids = new Set(
    state.salesRecords
      .filter((r) => r.status === 'Reserved' || r.status === 'PartiallyDispatched')
      .map((r) => r.batchId),
  )
  return ids.size
}
