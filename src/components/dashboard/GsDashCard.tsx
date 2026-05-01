import type { ReactNode } from 'react'

type Props = {
  label: string
  value: ReactNode
  hint?: string
  onClick?: () => void
}

export function GsDashCard({ label, value, hint, onClick }: Props) {
  if (onClick) {
    return (
      <button
        type="button"
        className="gs-dash-card gs-dash-card-clickable"
        onClick={onClick}
      >
        <span className="gs-dash-card-label">{label}</span>
        <span className="gs-dash-card-value">{value}</span>
        {hint ? <span className="gs-dash-card-hint">{hint}</span> : null}
      </button>
    )
  }
  return (
    <div className="gs-dash-card">
      <span className="gs-dash-card-label">{label}</span>
      <span className="gs-dash-card-value">{value}</span>
      {hint ? <span className="gs-dash-card-hint">{hint}</span> : null}
    </div>
  )
}
