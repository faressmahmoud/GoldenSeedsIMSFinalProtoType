import { useMemo } from 'react'
import type { ImsState } from '../../domain/types'
import {
  allocationBySegmentFromSales,
  defaultUiFilters,
  dispatchBySegmentFromSales,
  movementTrendInboundVsDispatch,
  mgmtKpisFromFilters,
  stockByOriginFromBatches,
  stockBySupplierFromBatches,
} from '../../domain/dashboardAnalytics'
import {
  InboundDispatchTrendChart,
  TonnesBarChart,
  TonnesDonutChart,
} from './Charts'

const CH = 268

export function MgmtAnalyticsCharts({ ims }: { ims: ImsState }) {
  const f = defaultUiFilters()
  const k = useMemo(() => mgmtKpisFromFilters(ims, f), [ims])
  const stockSupplier = useMemo(
    () => stockBySupplierFromBatches(ims, k.batches),
    [ims, k.batches],
  )
  const stockOrigin = useMemo(() => stockByOriginFromBatches(k.batches), [k.batches])
  const allocSeg = useMemo(() => allocationBySegmentFromSales(k.sales), [k.sales])
  const dispSeg = useMemo(() => dispatchBySegmentFromSales(k.sales), [k.sales])
  const trend = useMemo(
    () => movementTrendInboundVsDispatch(ims.movements),
    [ims.movements],
  )

  return (
    <div className="gs-dash-charts gs-dash-charts-exec">
      <div className="gs-dash-chart-cell">
        <TonnesBarChart
          title="Stock by Supplier"
          data={stockSupplier}
          chartHeight={CH}
        />
      </div>
      <div className="gs-dash-chart-cell">
        <TonnesDonutChart
          title="Stock by Origin"
          data={stockOrigin}
          chartHeight={CH}
          pieInnerRadius={0}
          pieOuterRadius={96}
        />
      </div>
      <div className="gs-dash-chart-cell">
        <TonnesBarChart
          title="Allocation by Customer Segment"
          data={allocSeg}
          chartHeight={CH}
        />
      </div>
      <div className="gs-dash-chart-cell">
        <TonnesBarChart
          title="Dispatch by Customer Segment"
          data={dispSeg}
          chartHeight={CH}
        />
      </div>
      <div className="gs-dash-chart-cell gs-dash-chart-cell--wide">
        <InboundDispatchTrendChart
          title="Movement Trend (Inbound vs Dispatch)"
          data={trend}
        />
      </div>
    </div>
  )
}
