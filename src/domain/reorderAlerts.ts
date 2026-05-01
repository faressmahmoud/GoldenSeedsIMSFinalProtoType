import type { ImsState } from './types'

/** Fixed reorder points (Tonnes) by variety — management decision-support only. */
export const REORDER_POINT_TONNES: Record<string, number> = {
  'VAR-SPUNTA': 1000,
  'VAR-CARA-SHE': 700,
  'VAR-CARA-ELF': 600,
  'VAR-HERMES': 500,
  'VAR-LADY-ROS': 500,
}

export type ReorderAlertStatus = 'ReorderSuggested' | 'MonitorClosely'

export type ReorderAlertRow = {
  varietyId: string
  varietyName: string
  currentStockTonnes: number
  reorderPointTonnes: number
  status: ReorderAlertStatus
}

/** Sum remaining quantity on Active batches, by variety. */
export function activeStockTonnesByVariety(ims: ImsState): Map<string, number> {
  const m = new Map<string, number>()
  for (const b of ims.batches) {
    if (b.batchStatus !== 'Active') continue
    m.set(b.varietyId, (m.get(b.varietyId) ?? 0) + b.remainingQty)
  }
  return m
}

function classify(stock: number, point: number): ReorderAlertStatus | null {
  if (stock <= point) return 'ReorderSuggested'
  if (stock <= point * 1.2) return 'MonitorClosely'
  return null
}

const DISPLAY_ORDER = [
  'VAR-SPUNTA',
  'VAR-CARA-SHE',
  'VAR-CARA-ELF',
  'VAR-HERMES',
  'VAR-LADY-ROS',
] as const

/** Varieties with reorder points that are at or within 20% above the reorder level. */
export function buildReorderAlertRows(ims: ImsState): ReorderAlertRow[] {
  const stockByV = activeStockTonnesByVariety(ims)
  const rows: ReorderAlertRow[] = []
  for (const varietyId of DISPLAY_ORDER) {
    const point = REORDER_POINT_TONNES[varietyId]
    if (point === undefined) continue
    const stock = stockByV.get(varietyId) ?? 0
    const status = classify(stock, point)
    if (!status) continue
    const v = ims.varieties.find((x) => x.varietyId === varietyId)
    const fallbackName =
      varietyId === 'VAR-LADY-ROS' ? 'Lady Rosetta' : varietyId.replace(/^VAR-/, '')
    rows.push({
      varietyId,
      varietyName: v?.varietyName ?? fallbackName,
      currentStockTonnes: stock,
      reorderPointTonnes: point,
      status,
    })
  }
  return rows
}
