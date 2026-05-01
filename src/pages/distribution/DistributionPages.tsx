import { lazy, Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GsDashCard } from '../../components/dashboard/GsDashCard'
import { GsFilterToolbar } from '../../components/dashboard/GsFilterToolbar'
import { useIms } from '../../context/ImsContext'
import {
  allocationBySegmentForSalesDash,
  defaultUiFilters,
  salesDashKpis,
  type UiFilters,
} from '../../domain/dashboardAnalytics'
import { salesRecordStatusLabel } from '../../domain/displayLabels'
import { routes } from '../../rbac'

export { SalesDispatch as DistributionDispatch } from '../sales/SalesPages'

const TonnesDonutChart = lazy(() =>
  import('../../components/dashboard/Charts').then((m) => ({
    default: m.TonnesDonutChart,
  })),
)

export function DistributionDashboard() {
  const { ims } = useIms()
  const nav = useNavigate()
  const [filters, setFilters] = useState<UiFilters>(defaultUiFilters)
  const k = useMemo(() => salesDashKpis(ims, filters), [ims, filters])
  const segChart = useMemo(
    () => allocationBySegmentForSalesDash(k.sales),
    [k.sales],
  )

  const upcomingRows = useMemo(() => {
    return [...k.sales]
      .filter((r) => r.status === 'Reserved' || r.status === 'PartiallyDispatched')
      .sort((a, b) => a.expectedDispatchDate.localeCompare(b.expectedDispatchDate))
      .slice(0, 8)
  }, [k.sales])

  const recentDispatches = useMemo(() => {
    return ims.movements
      .filter((m) => m.movementType === 'Dispatch')
      .slice()
      .sort((a, b) => b.movementDate.localeCompare(a.movementDate))
      .slice(0, 8)
  }, [ims.movements])

  return (
    <div className="gs-stack">
      <h1>Dashboard</h1>
      <p className="gs-lead">
        Dispatch schedule and outbound activity for the selected filters.
      </p>

      <GsFilterToolbar
        ims={ims}
        filters={filters}
        onChange={setFilters}
        dateHint="Open lines use dispatch dates; stock views follow batch fields."
        includeCustomerSegment
      />

      <div className="gs-dash-cards">
        <GsDashCard
          label="Pending dispatches"
          value={k.pendingDispatches}
          hint="Open allocation lines"
          onClick={() => nav(routes.distributionDispatch)}
        />
        <GsDashCard
          label="Upcoming dispatches"
          value={k.upcomingDispatches}
          hint="Within three weeks"
          onClick={() => nav(routes.distributionDispatch)}
        />
        <GsDashCard
          label="Allocated quantity"
          value={`${k.allocatedTonnes.toLocaleString()} Tonnes`}
          hint="Reserved in current filter"
        />
        <GsDashCard
          label="Available stock"
          value={`${k.availableStockTonnes.toLocaleString()} Tonnes`}
          hint="Active batches in view"
        />
      </div>

      <div className="gs-dash-charts gs-dash-charts-single">
        <div className="gs-dash-chart-cell gs-dash-chart-cell-narrow">
          <Suspense
            fallback={
              <p className="gs-muted gs-dash-chart-fallback">Loading chart…</p>
            }
          >
            <TonnesDonutChart title="Allocation by segment" data={segChart} />
          </Suspense>
        </div>
      </div>

      <div className="gs-grid-2">
        <section className="gs-panel">
          <h2>Upcoming dispatches</h2>
          <div className="gs-table-wrap">
            <table className="gs-table gs-table-compact">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Segment</th>
                  <th>Expected dispatch</th>
                  <th>Status</th>
                  <th>Open (Tonnes)</th>
                </tr>
              </thead>
              <tbody>
                {upcomingRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="gs-muted">
                      No open lines in this filter.
                    </td>
                  </tr>
                ) : (
                  upcomingRows.map((r) => (
                    <tr key={r.saleRecordId}>
                      <td>{r.customerName}</td>
                      <td>{r.customerSegment}</td>
                      <td>{r.expectedDispatchDate}</td>
                      <td>{salesRecordStatusLabel(r.status)}</td>
                      <td>{r.confirmedQty - r.dispatchedQty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="gs-panel">
          <h2>Recent dispatches</h2>
          <div className="gs-table-wrap">
            <table className="gs-table gs-table-compact">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shipment</th>
                  <th>Customer</th>
                  <th>Quantity (Tonnes)</th>
                </tr>
              </thead>
              <tbody>
                {recentDispatches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="gs-muted">
                      No dispatches recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentDispatches.map((m) => {
                    const b = ims.batches.find((x) => x.batchId === m.batchId)
                    const sr = ims.salesRecords.find(
                      (x) => x.saleRecordId === m.saleRecordId,
                    )
                    return (
                      <tr key={m.movementId}>
                        <td>{m.movementDate.slice(0, 10)}</td>
                        <td>{b?.shipmentReference ?? '—'}</td>
                        <td>{sr?.customerName ?? '—'}</td>
                        <td>{m.quantity}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
