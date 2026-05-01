import type { ReactNode } from 'react'

/** Unified success confirmation card (dispatch, allocation, handover, inbound, etc.). */
export function GsActionSuccess({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="gs-action-success" role="status">
      <strong className="gs-action-success__title">{title}</strong>
      <div className="gs-action-success__body">{children}</div>
    </div>
  )
}
