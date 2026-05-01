import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MovementTrendPoint, TonnesPoint } from '../../domain/dashboardAnalytics'

const PALETTE = ['#1d3557', '#2a9d8f', '#e9c46a', '#f4a261', '#457b9d', '#264653']

function nonEmpty(data: TonnesPoint[]) {
  return data.filter((d) => d.tonnes > 0)
}

export function TonnesBarChart({
  title,
  data,
  chartHeight = 220,
}: {
  title: string
  data: TonnesPoint[]
  chartHeight?: number
}) {
  const show = nonEmpty(data)
  if (!show.length) {
    return (
      <div className="gs-dash-chart">
        <h3 className="gs-dash-chart-title">{title}</h3>
        <p className="gs-muted gs-chart-empty">No data.</p>
      </div>
    )
  }
  return (
    <div className="gs-dash-chart">
      <h3 className="gs-dash-chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={show} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={show.some((d) => d.name.length > 10) ? -16 : 0}
            textAnchor={show.some((d) => d.name.length > 10) ? 'end' : 'middle'}
            height={show.some((d) => d.name.length > 10) ? 52 : 28}
          />
          <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => String(v)} />
          <Tooltip formatter={(value: number) => [`${value} Tonnes`, 'Quantity']} />
          <Bar dataKey="tonnes" radius={[4, 4, 0, 0]}>
            {show.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TonnesDonutChart({
  title,
  data,
  chartHeight = 220,
  pieInnerRadius = 56,
  pieOuterRadius = 82,
}: {
  title: string
  data: TonnesPoint[]
  chartHeight?: number
  /** Set to `0` for a full pie chart. */
  pieInnerRadius?: number
  pieOuterRadius?: number
}) {
  const show = nonEmpty(data)
  if (!show.length) {
    return (
      <div className="gs-dash-chart">
        <h3 className="gs-dash-chart-title">{title}</h3>
        <p className="gs-muted gs-chart-empty">No data.</p>
      </div>
    )
  }
  return (
    <div className="gs-dash-chart">
      <h3 className="gs-dash-chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Pie
            data={show}
            dataKey="tonnes"
            nameKey="name"
            innerRadius={pieInnerRadius}
            outerRadius={pieOuterRadius}
            paddingAngle={2}
          >
            {show.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value} Tonnes`} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function InboundDispatchTrendChart({
  title,
  data,
}: {
  title: string
  data: MovementTrendPoint[]
}) {
  if (!data.length) {
    return (
      <div className="gs-dash-chart">
        <h3 className="gs-dash-chart-title">{title}</h3>
        <p className="gs-muted gs-chart-empty">No data.</p>
      </div>
    )
  }
  return (
    <div className="gs-dash-chart">
      <h3 className="gs-dash-chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8ede9" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) => {
              const d = new Date(`${v}T12:00:00`)
              return Number.isNaN(d.getTime())
                ? v
                : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }}
          />
          <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => String(v)} />
          <Tooltip
            formatter={(value: number) => [`${value} Tonnes`, '']}
            labelFormatter={(label) => String(label)}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey="inbound"
            name="Inbound"
            stroke={PALETTE[0]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="dispatch"
            name="Dispatch"
            stroke={PALETTE[2]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
