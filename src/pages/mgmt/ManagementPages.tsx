import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GsDashCard } from '../../components/dashboard/GsDashCard'
import { MgmtAnalyticsCharts } from '../../components/dashboard/MgmtAnalyticsCharts'
import { useIms } from '../../context/ImsContext'
import {
  batchStatusChipClass,
  batchStatusLabel,
  batchStatusShort,
  movementTypeLabel,
} from '../../domain/displayLabels'
import { defaultUiFilters, mgmtKpisFromFilters } from '../../domain/dashboardAnalytics'
import { buildReorderAlertRows } from '../../domain/reorderAlerts'
import { routes } from '../../rbac'

export function MgmtDashboard() {
  const { ims } = useIms()
  const nav = useNavigate()
  const k = useMemo(() => mgmtKpisFromFilters(ims, defaultUiFilters()), [ims])
  const recent = useMemo(
    () =>
      [...ims.movements]
        .sort((a, b) => b.movementDate.localeCompare(a.movementDate))
        .slice(0, 4),
    [ims.movements],
  )
  const reorderRows = useMemo(() => buildReorderAlertRows(ims), [ims])

  return (
    <div className="gs-stack gs-exec-dashboard">
      <h1>Executive Dashboard</h1>

      <div className="gs-dash-cards gs-dash-cards-exec-kpi">
        <GsDashCard
          label="Active Stock (Tonnes)"
          value={k.activeStockTonnes.toLocaleString()}
          onClick={() => nav(routes.mgmtAvailability)}
        />
        <GsDashCard
          label="Allocated (Tonnes)"
          value={k.allocatedTonnes.toLocaleString()}
          onClick={() => nav(routes.mgmtAvailability)}
        />
        <GsDashCard
          label="Dispatched (Tonnes)"
          value={k.dispatchedTonnes.toLocaleString()}
          onClick={() => nav(routes.mgmtAvailability)}
        />
      </div>

      {reorderRows.length > 0 && (
        <section className="gs-reorder-alerts" aria-label="Reorder alerts">
          <h2 className="gs-reorder-alerts-title">Reorder alerts</h2>
          <div className="gs-reorder-alerts-grid">
            {reorderRows.map((r) => (
              <div key={r.varietyId} className="gs-reorder-card">
                <div className="gs-reorder-card-head">
                  <span className="gs-reorder-variety">{r.varietyName}</span>
                  <span
                    className={
                      r.status === 'ReorderSuggested'
                        ? 'gs-reorder-badge gs-reorder-badge--suggested'
                        : 'gs-reorder-badge gs-reorder-badge--monitor'
                    }
                  >
                    {r.status === 'ReorderSuggested'
                      ? 'Reorder Suggested'
                      : 'Monitor Closely'}
                  </span>
                </div>
                <dl className="gs-reorder-dl">
                  <div>
                    <dt>Current stock (Tonnes)</dt>
                    <dd>{r.currentStockTonnes.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Reorder point (Tonnes)</dt>
                    <dd>{r.reorderPointTonnes.toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      <MgmtAnalyticsCharts ims={ims} />

      <section className="gs-panel gs-recent-activity">
        <h2>Recent Activity</h2>
        <div className="gs-table-wrap">
          <table className="gs-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Movement</th>
                <th>Quantity (Tonnes)</th>
                <th>Shipment</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => {
                const b = m.batchId
                  ? ims.batches.find((x) => x.batchId === m.batchId)
                  : undefined
                return (
                  <tr key={m.movementId}>
                    <td>{new Date(m.movementDate).toLocaleString()}</td>
                    <td>{movementTypeLabel(m.movementType)}</td>
                    <td>{m.quantity}</td>
                    <td>{b?.shipmentReference ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export function MgmtAvailabilityReview() {
  const { ims } = useIms()

  return (
    <div className="gs-stack">
      <h1>Inventory Overview</h1>
      <div className="gs-table-wrap">
        <table className="gs-table">
          <thead>
            <tr>
              <th>Shipment reference</th>
              <th>Batch</th>
              <th>Variety</th>
              <th>Supplier</th>
              <th>Origin</th>
              <th>Remaining quantity (Tonnes)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ims.batches.map((b) => {
              const v = ims.varieties.find((x) => x.varietyId === b.varietyId)
              const s = ims.suppliers.find((x) => x.supplierId === b.supplierId)
              return (
                <tr key={b.batchId}>
                  <td>{b.shipmentReference}</td>
                  <td>{b.batchId}</td>
                  <td>{v?.varietyName ?? b.varietyId}</td>
                  <td>{s?.supplierName ?? b.supplierId}</td>
                  <td>{b.origin}</td>
                  <td>{b.remainingQty}</td>
                  <td>
                    <span
                      className={batchStatusChipClass(b.batchStatus)}
                      title={batchStatusLabel(b.batchStatus)}
                    >
                      {batchStatusShort(b.batchStatus)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
