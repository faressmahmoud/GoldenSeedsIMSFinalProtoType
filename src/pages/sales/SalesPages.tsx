import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GsActionSuccess } from '../../components/GsActionSuccess'
import { GsDashCard } from '../../components/dashboard/GsDashCard'
import { GsFilterToolbar } from '../../components/dashboard/GsFilterToolbar'
import { useIms } from '../../context/ImsContext'
import { CUSTOMER_SEGMENTS } from '../../domain/businessConstants'
import {
  allocationBySegmentForSalesDash,
  defaultUiFilters,
  salesDashKpis,
  type UiFilters,
} from '../../domain/dashboardAnalytics'
import { salesRecordStatusLabel } from '../../domain/displayLabels'
import {
  availableToAllocateOnBatch,
  batchesAvailableForAllocation,
} from '../../domain/selectors'
import { routes } from '../../rbac'
import type { ImsState, SalesRecord } from '../../domain/types'

const TonnesDonutChart = lazy(() =>
  import('../../components/dashboard/Charts').then((m) => ({
    default: m.TonnesDonutChart,
  })),
)

export function SalesDashboard() {
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

  const recentAlloc = useMemo(() => {
    return [...ims.salesRecords]
      .filter((r) => fMatchesSalesFilters(ims, r, filters))
      .sort((a, b) => b.saleDate.localeCompare(a.saleDate))
      .slice(0, 8)
  }, [ims, filters])

  return (
    <div className="gs-stack">
      <h1>Dashboard</h1>
      <p className="gs-lead">
        Available stock, allocations, and outbound activity for the selected filters.
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
          label="Available stock"
          value={`${k.availableStockTonnes.toLocaleString()} Tonnes`}
          hint="Active batches in view"
          onClick={() => nav(routes.salesCheckStock)}
        />
        <GsDashCard
          label="Allocated quantity"
          value={`${k.allocatedTonnes.toLocaleString()} Tonnes`}
          hint="Reserved in current filter"
          onClick={() => nav(routes.salesAllocation)}
        />
        <GsDashCard
          label="Pending dispatches"
          value={k.pendingDispatches}
          hint="Open allocation lines"
        />
        <GsDashCard
          label="Upcoming dispatches"
          value={k.upcomingDispatches}
          hint="Within three weeks"
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
                  <th>Open (Tonnes)</th>
                </tr>
              </thead>
              <tbody>
                {upcomingRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="gs-muted">
                      No open lines in this filter.
                    </td>
                  </tr>
                ) : (
                  upcomingRows.map((r) => {
                    return (
                      <tr key={r.saleRecordId}>
                        <td>{r.customerName}</td>
                        <td>{r.customerSegment}</td>
                        <td>{r.expectedDispatchDate}</td>
                        <td>{r.confirmedQty - r.dispatchedQty}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="gs-panel">
          <h2>Recent allocations</h2>
          <div className="gs-table-wrap">
            <table className="gs-table gs-table-compact">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Segment</th>
                  <th>Quantity (Tonnes)</th>
                  <th>Shipment</th>
                </tr>
              </thead>
              <tbody>
                {recentAlloc.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="gs-muted">
                      No allocations match this filter.
                    </td>
                  </tr>
                ) : (
                  recentAlloc.map((r) => {
                    const b = ims.batches.find((x) => x.batchId === r.batchId)
                    return (
                      <tr key={r.saleRecordId}>
                        <td>{r.saleDate}</td>
                        <td>{r.customerName}</td>
                        <td>{r.customerSegment}</td>
                        <td>{r.confirmedQty}</td>
                        <td>{b?.shipmentReference ?? '—'}</td>
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

function fMatchesSalesFilters(ims: ImsState, r: SalesRecord, f: UiFilters): boolean {
  if (f.customerSegment && r.customerSegment !== f.customerSegment) return false
  if (f.dateFrom && r.expectedDispatchDate < f.dateFrom) return false
  if (f.dateTo && r.expectedDispatchDate > f.dateTo) return false
  const b = ims.batches.find((x) => x.batchId === r.batchId)
  if (!b) return false
  if (f.supplierId && b.supplierId !== f.supplierId) return false
  if (f.varietyId && b.varietyId !== f.varietyId) return false
  return true
}

export function SalesCheckStock() {
  const { ims } = useIms()
  const rows = useMemo(
    () =>
      ims.batches
        .filter((b) => b.batchStatus === 'Active')
        .map((b) => {
          const v = ims.varieties.find((x) => x.varietyId === b.varietyId)
          const s = ims.suppliers.find((x) => x.supplierId === b.supplierId)
          const avail = availableToAllocateOnBatch(ims, b.batchId)
          return { b, v, s, avail }
        }),
    [ims],
  )

  return (
    <div className="gs-stack">
      <h1>Stock Availability</h1>
      <p className="gs-lead">
        On-hand remainder and quantity still available to allocate, by batch.
      </p>
      <div className="gs-table-wrap">
        <table className="gs-table">
          <thead>
            <tr>
              <th>Shipment reference</th>
              <th>Inventory batch</th>
              <th>Variety</th>
              <th>Supplier</th>
              <th>Origin</th>
              <th>Remaining quantity (Tonnes)</th>
              <th>Available to allocate (Tonnes)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ b, v, s, avail }) => (
              <tr key={b.batchId}>
                <td>{b.shipmentReference}</td>
                <td>{b.batchId}</td>
                <td>{v?.varietyName ?? b.varietyId}</td>
                <td>{s?.supplierName ?? b.supplierId}</td>
                <td>{b.origin}</td>
                <td>{b.remainingQty}</td>
                <td>{avail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SalesAllocation() {
  const { ims, session, commit } = useIms()
  const selectable = useMemo(
    () => batchesAvailableForAllocation(ims.batches),
    [ims.batches],
  )
  const [batchId, setBatchId] = useState(selectable[0]?.batchId ?? '')
  const [qty, setQty] = useState('')
  const [customerSegment, setCustomerSegment] = useState<string>(
    CUSTOMER_SEGMENTS[0],
  )
  const [customerName, setCustomerName] = useState('')
  const [expectedDispatchDate, setExpectedDispatchDate] = useState('')
  const [err, setErr] = useState<string | undefined>()
  const [allocationDone, setAllocationDone] = useState<{
    qty: number
    customerName: string
    segment: string
    shipmentReference: string
    varietyName: string
    expectedDispatchDate: string
  } | null>(null)

  const batch = ims.batches.find((b) => b.batchId === batchId)
  const v = batch && ims.varieties.find((x) => x.varietyId === batch.varietyId)
  const s = batch && ims.suppliers.find((x) => x.supplierId === batch.supplierId)
  const avail = batch ? availableToAllocateOnBatch(ims, batch.batchId) : 0

  useEffect(() => {
    setAllocationDone(null)
    setErr(undefined)
  }, [batchId])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    const tonnes = Number(qty)
    if (Number.isNaN(tonnes) || tonnes <= 0) {
      setErr('Enter a positive allocation quantity in Tonnes.')
      return
    }
    if (tonnes > avail) {
      setErr(
        `Allocation cannot exceed available quantity on this batch (${avail} Tonnes).`,
      )
      return
    }
    if (!customerName.trim()) {
      setErr('Customer name is required.')
      return
    }
    if (!expectedDispatchDate.trim()) {
      setErr('Expected dispatch date is required.')
      return
    }
    const error = commit({
      type: 'CREATE_ALLOCATION',
      payload: {
        batchId,
        qty: tonnes,
        customerSegment,
        customerName: customerName.trim(),
        expectedDispatchDate: expectedDispatchDate.trim(),
        actor: session,
      },
    })
    if (error) setErr(error)
    else {
      setErr(undefined)
      const b = ims.batches.find((x) => x.batchId === batchId)
      const vn =
        b && ims.varieties.find((v) => v.varietyId === b.varietyId)?.varietyName
      setAllocationDone({
        qty: tonnes,
        customerName: customerName.trim(),
        segment: customerSegment,
        shipmentReference: b?.shipmentReference ?? batchId,
        varietyName: vn ?? b?.varietyId ?? '',
        expectedDispatchDate: expectedDispatchDate.trim(),
      })
    }
  }

  return (
    <div className="gs-stack">
      <h1>Stock Allocation</h1>
      <p className="gs-lead">
        Reserve quantity on an import batch for a named customer. Over-allocation is
        blocked.
      </p>
      {selectable.length === 0 ? (
        <p className="gs-muted">No batches currently accept new allocations.</p>
      ) : (
        <form className="gs-form gs-panel" onSubmit={submit}>
          <label>
            Inventory batch / stock item <span className="gs-req">*</span>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              required
            >
              {selectable.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.shipmentReference} — {b.batchId} — remaining {b.remainingQty} Tonnes
                </option>
              ))}
            </select>
          </label>
          {batch && (
            <div className="gs-summary">
              <div>
                <span className="gs-muted">Variety</span>
                <strong>{v?.varietyName}</strong>
              </div>
              <div>
                <span className="gs-muted">Supplier</span>
                <strong>{s?.supplierName}</strong>
              </div>
              <div>
                <span className="gs-muted">Origin</span>
                <strong>{batch.origin}</strong>
              </div>
              <div>
                <span className="gs-muted">Available quantity (Tonnes)</span>
                <strong>{avail}</strong>
              </div>
            </div>
          )}
          <label>
            Customer segment <span className="gs-req">*</span>
            <select
              value={customerSegment}
              onChange={(e) => setCustomerSegment(e.target.value)}
              required
            >
              {CUSTOMER_SEGMENTS.map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
          </label>
          <label>
            Customer name <span className="gs-req">*</span>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="Customer or company name"
            />
          </label>
          <label>
            Expected dispatch date <span className="gs-req">*</span>
            <input
              type="date"
              value={expectedDispatchDate}
              onChange={(e) => setExpectedDispatchDate(e.target.value)}
              required
            />
          </label>
          <label>
            Allocation quantity (Tonnes) <span className="gs-req">*</span>
            <input value={qty} onChange={(e) => setQty(e.target.value)} required />
          </label>
          {err && <p className="gs-error">{err}</p>}
          {allocationDone && (
            <GsActionSuccess title="Allocation posted">
              <p>
                Allocated <strong>{allocationDone.qty} Tonnes</strong> for{' '}
                <strong>{allocationDone.customerName}</strong> (
                <strong>{allocationDone.segment}</strong>) on shipment{' '}
                <strong>{allocationDone.shipmentReference}</strong> (
                <strong>{allocationDone.varietyName}</strong>). Expected dispatch{' '}
                <strong>{allocationDone.expectedDispatchDate}</strong>. Batch availability
                has been updated.
              </p>
            </GsActionSuccess>
          )}
          <button className="gs-btn primary" type="submit">
            Confirm allocation
          </button>
        </form>
      )}
    </div>
  )
}

function DispatchStockHandoverPanel() {
  const { ims, session, commit } = useIms()
  const active = useMemo(
    () => ims.batches.filter((b) => b.batchStatus === 'Active'),
    [ims.batches],
  )
  const [batchId, setBatchId] = useState(active[0]?.batchId ?? '')
  const [delta, setDelta] = useState('')
  const [err, setErr] = useState<string | undefined>()
  const [handoverDone, setHandoverDone] = useState<{
    qtyTonnes: number
    shipmentReference: string
    varietyName: string
  } | null>(null)

  useEffect(() => {
    if (active.length === 0) {
      setBatchId('')
      return
    }
    if (!active.some((b) => b.batchId === batchId)) {
      setBatchId(active[0]!.batchId)
    }
  }, [active, batchId])

  useEffect(() => {
    setHandoverDone(null)
    setErr(undefined)
  }, [batchId])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    const b = ims.batches.find((x) => x.batchId === batchId)
    const vn =
      b && ims.varieties.find((v) => v.varietyId === b.varietyId)?.varietyName
    const error = commit({
      type: 'STOCK_ADJUSTMENT',
      payload: { batchId, delta, actor: session },
    })
    if (error) setErr(error)
    else {
      setErr(undefined)
      const q = Math.abs(Number(delta))
      if (b) {
        setHandoverDone({
          qtyTonnes: Number.isFinite(q) ? q : 0,
          shipmentReference: b.shipmentReference,
          varietyName: vn ?? b.varietyId,
        })
      }
    }
  }

  return (
    <section id="stock-handover" className="gs-panel gs-stack">
      <h2>Stock Handover</h2>
      <p className="gs-lead">
        For stock leaving outside a normal sales line (transfer or handover). Balances
        update on post. Negative quantity reduces stock; batch cannot go below zero.
      </p>
      {active.length === 0 ? (
        <p className="gs-muted">No active batches to hand over from.</p>
      ) : (
        <form className="gs-form" onSubmit={submit}>
          <label>
            Batch <span className="gs-req">*</span>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              {active.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.shipmentReference} — remaining {b.remainingQty} Tonnes
                </option>
              ))}
            </select>
          </label>
          <label>
            Handover quantity (Tonnes) <span className="gs-req">*</span>
            <input value={delta} onChange={(e) => setDelta(e.target.value)} required />
          </label>
          {err && <p className="gs-error">{err}</p>}
          {handoverDone && (
            <GsActionSuccess title="Handover posted">
              <p>
                Handed over <strong>{handoverDone.qtyTonnes} Tonnes</strong> from shipment{' '}
                <strong>{handoverDone.shipmentReference}</strong> (
                <strong>{handoverDone.varietyName}</strong>). Batch balances have been
                updated.
              </p>
            </GsActionSuccess>
          )}
          <button className="gs-btn primary" type="submit">
            Post handover
          </button>
        </form>
      )}
    </section>
  )
}

export function SalesDispatch() {
  const { ims, session, commit } = useIms()
  const candidates = ims.salesRecords.filter(
    (s) => s.status === 'Reserved' || s.status === 'PartiallyDispatched',
  )
  const [saleRecordId, setSaleRecordId] = useState(candidates[0]?.saleRecordId ?? '')
  const sr = ims.salesRecords.find((s) => s.saleRecordId === saleRecordId)
  const batch = useMemo(
    () => (sr ? ims.batches.find((b) => b.batchId === sr.batchId) : undefined),
    [ims.batches, sr],
  )
  const variety = useMemo(
    () =>
      sr ? ims.varieties.find((v) => v.varietyId === sr.varietyId) : undefined,
    [ims.varieties, sr],
  )
  const supplier = batch
    ? ims.suppliers.find((x) => x.supplierId === batch.supplierId)
    : undefined
  const remaining = sr ? sr.confirmedQty - sr.dispatchedQty : 0
  const [qty, setQty] = useState(String(remaining || 0))
  const [err, setErr] = useState<string | undefined>()
  const [done, setDone] = useState<{
    qty: number
    shipmentReference: string
    varietyName: string
    segment: string
    customerName: string
  } | null>(null)

  useEffect(() => {
    setDone(null)
    setErr(undefined)
  }, [saleRecordId])

  useEffect(() => {
    if (!sr) return
    setQty(String(sr.confirmedQty - sr.dispatchedQty))
  }, [sr])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !sr || !batch) return
    const q = Number(qty)
    const error = commit({
      type: 'CONFIRM_DISPATCH',
      payload: { saleRecordId, qty: q, actor: session },
    })
    if (error) setErr(error)
    else {
      setErr(undefined)
      setDone({
        qty: q,
        shipmentReference: batch.shipmentReference,
        varietyName: variety?.varietyName ?? sr.varietyId,
        segment: sr.customerSegment,
        customerName: sr.customerName,
      })
    }
  }

  return (
    <div className="gs-stack">
      <h1>Stock Dispatch and Handover</h1>
      <p className="gs-lead">
        Post dispatch from an allocation, or handover when goods leave without one. Both
        update batch balances.
      </p>

      <section className="gs-panel gs-stack" id="dispatch-from-allocation">
        <h2>Dispatch From Allocation</h2>
        <p className="gs-muted">
          Select an open line, confirm the quantity in Tonnes, and post. On-hand stock
          on the source batch is reduced when you confirm.
        </p>
        {candidates.length === 0 ? (
          <p className="gs-muted">Nothing is awaiting dispatch.</p>
        ) : (
          <form className="gs-form" onSubmit={submit}>
            <label>
              Allocated line <span className="gs-req">*</span>
              <select
                value={saleRecordId}
                onChange={(e) => setSaleRecordId(e.target.value)}
              >
                {candidates.map((s) => {
                  const b = ims.batches.find((x) => x.batchId === s.batchId)
                  const open = s.confirmedQty - s.dispatchedQty
                  return (
                    <option key={s.saleRecordId} value={s.saleRecordId}>
                      {b?.shipmentReference ?? 'Shipment'} — {s.customerName} —{' '}
                      {s.customerSegment} — {salesRecordStatusLabel(s.status)} — open{' '}
                      {open} Tonnes
                    </option>
                  )
                })}
              </select>
            </label>
            {sr && batch && (
              <div className="gs-summary">
                <div>
                  <span className="gs-muted">Shipment reference</span>
                  <strong>{batch.shipmentReference}</strong>
                </div>
                <div>
                  <span className="gs-muted">Batch</span>
                  <strong>{batch.batchId}</strong>
                </div>
                <div>
                  <span className="gs-muted">Variety</span>
                  <strong>{variety?.varietyName}</strong>
                </div>
                <div>
                  <span className="gs-muted">Supplier</span>
                  <strong>{supplier?.supplierName}</strong>
                </div>
                <div>
                  <span className="gs-muted">Customer name</span>
                  <strong>{sr.customerName}</strong>
                </div>
                <div>
                  <span className="gs-muted">Customer segment</span>
                  <strong>{sr.customerSegment}</strong>
                </div>
                <div>
                  <span className="gs-muted">Expected dispatch date</span>
                  <strong>{sr.expectedDispatchDate}</strong>
                </div>
                <div>
                  <span className="gs-muted">Remaining on this allocation (Tonnes)</span>
                  <strong>{remaining}</strong>
                </div>
              </div>
            )}
            <label>
              Dispatch quantity (Tonnes) <span className="gs-req">*</span>
              <input value={qty} onChange={(e) => setQty(e.target.value)} required />
            </label>
            {err && <p className="gs-error">{err}</p>}
            {done && (
              <GsActionSuccess title="Dispatch posted">
                <p>
                  Dispatched <strong>{done.qty} Tonnes</strong> for{' '}
                  <strong>{done.customerName}</strong> (<strong>{done.segment}</strong>)
                  on shipment <strong>{done.shipmentReference}</strong> (
                  <strong>{done.varietyName}</strong>). Batch balances have been updated.
                </p>
              </GsActionSuccess>
            )}
            <button className="gs-btn primary" type="submit">
              Confirm dispatch
            </button>
          </form>
        )}
      </section>

      <DispatchStockHandoverPanel />
    </div>
  )
}
