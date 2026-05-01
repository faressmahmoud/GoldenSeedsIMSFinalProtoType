import type { ImsState } from '../../domain/types'
import { CUSTOMER_SEGMENTS } from '../../domain/businessConstants'
import type { UiFilters } from '../../domain/dashboardAnalytics'
import { defaultUiFilters } from '../../domain/dashboardAnalytics'

type Props = {
  ims: ImsState
  filters: UiFilters
  onChange: (next: UiFilters) => void
  /** Shown above the date inputs for context. */
  dateHint?: string
  /** Demand-side filter: only for sales dashboards (not supply/inventory views). */
  includeCustomerSegment?: boolean
}

export function GsFilterToolbar({
  ims,
  filters,
  onChange,
  dateHint = 'Combine the date range with the selections below.',
  includeCustomerSegment = false,
}: Props) {
  const set = (patch: Partial<UiFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="gs-filter-toolbar gs-panel">
      <p className="gs-filter-toolbar-lead">{dateHint}</p>
      <div className="gs-filter-grid">
        <label className="gs-filter-field">
          <span className="gs-filter-label">From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => set({ dateFrom: e.target.value })}
          />
        </label>
        <label className="gs-filter-field">
          <span className="gs-filter-label">To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => set({ dateTo: e.target.value })}
          />
        </label>
        <label className="gs-filter-field">
          <span className="gs-filter-label">Supplier</span>
          <select
            value={filters.supplierId}
            onChange={(e) => set({ supplierId: e.target.value })}
          >
            <option value="">All suppliers</option>
            {ims.suppliers.map((s) => (
              <option key={s.supplierId} value={s.supplierId}>
                {s.supplierName}
              </option>
            ))}
          </select>
        </label>
        <label className="gs-filter-field">
          <span className="gs-filter-label">Variety</span>
          <select
            value={filters.varietyId}
            onChange={(e) => set({ varietyId: e.target.value })}
          >
            <option value="">All varieties</option>
            {ims.varieties.map((v) => (
              <option key={v.varietyId} value={v.varietyId}>
                {v.varietyName}
              </option>
            ))}
          </select>
        </label>
        {includeCustomerSegment && (
          <label className="gs-filter-field">
            <span className="gs-filter-label">Customer segment</span>
            <select
              value={filters.customerSegment}
              onChange={(e) => set({ customerSegment: e.target.value })}
            >
              <option value="">All segments</option>
              {CUSTOMER_SEGMENTS.map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="gs-filter-actions">
        <button
          type="button"
          className="gs-btn outline"
          onClick={() => onChange({ ...defaultUiFilters() })}
        >
          Clear filters
        </button>
      </div>
    </div>
  )
}
