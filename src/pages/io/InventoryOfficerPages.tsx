import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GsActionSuccess } from '../../components/GsActionSuccess'
import { GsDashCard } from '../../components/dashboard/GsDashCard'
import { useIms } from '../../context/ImsContext'
import {
  INBOUND_QUANTITY_CORRECTION_REASONS,
  QUARANTINE_INSPECTING_BODY,
  STORAGE_CATEGORIES,
  SUPPLIER_DEFAULT_ORIGIN,
} from '../../domain/businessConstants'
import {
  SimulatedShipmentAttach,
  shipmentDocumentAttachmentNote,
  formatDocumentNoteDisplay,
  type DemoAttachment,
} from '../../components/SimulatedShipmentAttach'
import {
  batchStatusChipClass,
  batchStatusLabel,
  batchStatusShort,
  inspectionOutcomeLabel,
} from '../../domain/displayLabels'
import { availableToAllocateOnBatch } from '../../domain/selectors'
import type { InspectionOutcome, InventoryBatch } from '../../domain/types'
import { routes } from '../../rbac'

export function IODashboard() {
  const { ims } = useIms()
  const nav = useNavigate()
  const aq = ims.batches.filter(
    (b) => b.batchStatus === 'PendingAgriculturalQuarantine',
  ).length
  const inspectionDone = ims.batches.filter(
    (b) => b.batchStatus === 'InspectionCompleted',
  ).length
  const active = ims.batches.filter((b) => b.batchStatus === 'Active').length

  const recentEntries = useMemo(
    () =>
      [...ims.batches]
        .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate))
        .slice(0, 8),
    [ims.batches],
  )

  return (
    <div className="gs-stack">
      <h1>Dashboard</h1>
      <p className="gs-lead">
        Receipts, quarantine, release to active stock, and inventory moves.
      </p>
      <div className="gs-dash-cards">
        <GsDashCard
          label="Pending Agricultural Quarantine"
          value={aq}
          hint="Inspection required"
          onClick={() => nav(routes.ioQuarantine)}
        />
        <GsDashCard
          label="Inspection Completed"
          value={inspectionDone}
          hint="Release when ready"
          onClick={() => nav(routes.ioQuarantine)}
        />
        <GsDashCard
          label="Active batches"
          value={active}
          hint="Browse lots"
          onClick={() => nav(routes.ioSearch)}
        />
      </div>

      <section className="gs-panel">
        <h2>Recent entries</h2>
        <div className="gs-table-wrap">
          <table className="gs-table gs-table-compact">
            <thead>
              <tr>
                <th>Shipment reference</th>
                <th>Variety</th>
                <th>Status</th>
                <th>Quantity (Tonnes)</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recentEntries.map((b) => {
                const v = ims.varieties.find((x) => x.varietyId === b.varietyId)
                return (
                  <tr key={b.batchId}>
                    <td>{b.shipmentReference}</td>
                    <td>{v?.varietyName ?? b.varietyId}</td>
                    <td>
                      <span
                        className={batchStatusChipClass(b.batchStatus)}
                        title={batchStatusLabel(b.batchStatus)}
                      >
                        {batchStatusShort(b.batchStatus)}
                      </span>
                    </td>
                    <td>{b.proposedQty}</td>
                    <td>{b.submittedDate}</td>
                    <td>
                      <Link className="gs-link" to={`${routes.ioRecord}/${b.batchId}`}>
                        Open
                      </Link>
                    </td>
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

export function IOInventoryEntry() {
  const { ims, session, commit } = useIms()
  const [shipmentReference, setShipmentReference] = useState('')
  const [supplierId, setSupplierId] = useState(ims.suppliers[0]?.supplierId ?? '')
  const [origin, setOrigin] = useState<string>(
    SUPPLIER_DEFAULT_ORIGIN[ims.suppliers[0]?.supplierId ?? ''] ?? 'France',
  )
  const [varietyId, setVarietyId] = useState(ims.varieties[0]?.varietyId ?? '')
  const [receivedQty, setReceivedQty] = useState('')
  const [docAttachment, setDocAttachment] = useState<DemoAttachment | null>(null)
  const [inboundSuccess, setInboundSuccess] = useState<{
    title: string
    body: string
  } | null>(null)
  const [err, setErr] = useState<string | undefined>()

  const onSupplier = (id: string) => {
    setSupplierId(id)
    setOrigin(SUPPLIER_DEFAULT_ORIGIN[id] ?? origin)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    if (!docAttachment) {
      setErr('Attach a shipment document before submitting.')
      return
    }
    const receivedDate = new Date().toISOString().slice(0, 10)
    const storageCategory = STORAGE_CATEGORIES[0]
    const error = commit({
      type: 'SUBMIT_INVENTORY_ENTRY',
      payload: {
        shipmentReference,
        varietyId,
        supplierId,
        origin,
        receivedQty: Number(receivedQty),
        receivedDate,
        storageCategory,
        shipmentDocumentNote: shipmentDocumentAttachmentNote(docAttachment),
        actor: session,
      },
    })
    if (error) setErr(error)
    else {
      setErr(undefined)
      setDocAttachment(null)
      const vLabel =
        ims.varieties.find((v) => v.varietyId === varietyId)?.varietyName ?? varietyId
      const sup = ims.suppliers.find((s) => s.supplierId === supplierId)?.supplierName
      setInboundSuccess({
        title: 'Inbound receipt registered',
        body: `Received ${receivedQty} Tonnes of ${vLabel} from ${sup ?? supplierId}, origin ${origin}. Shipment ${shipmentReference.trim()} is pending agricultural quarantine. Release from Quarantine after inspection when cleared.`,
      })
    }
  }

  return (
    <div className="gs-stack">
      <h1>Inbound Shipments</h1>
      <p className="gs-lead">
        Register received imports. Hold in quarantine until inspection and release.
      </p>
      <form className="gs-form gs-panel" onSubmit={submit}>
        <label>
          Shipment reference <span className="gs-req">*</span>
          <input
            value={shipmentReference}
            onChange={(e) => setShipmentReference(e.target.value)}
            required
            placeholder="SHP-2401"
          />
        </label>
        <div className="gs-grid-2">
          <label>
            Supplier <span className="gs-req">*</span>
            <select
              value={supplierId}
              onChange={(e) => onSupplier(e.target.value)}
              required
            >
              {ims.suppliers.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>
                  {s.supplierName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Origin <span className="gs-req">*</span>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              required
            >
              <option value="France">France</option>
              <option value="Scotland">Scotland</option>
            </select>
          </label>
        </div>
        <label>
          Variety <span className="gs-req">*</span>
          <select
            value={varietyId}
            onChange={(e) => setVarietyId(e.target.value)}
            required
          >
            {ims.varieties.map((v) => (
              <option key={v.varietyId} value={v.varietyId}>
                {v.varietyName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity (Tonnes) <span className="gs-req">*</span>
          <input
            value={receivedQty}
            onChange={(e) => setReceivedQty(e.target.value)}
            inputMode="decimal"
            required
          />
        </label>
        <SimulatedShipmentAttach attachment={docAttachment} onChange={setDocAttachment} />
        {err && <p className="gs-error">{err}</p>}
        {inboundSuccess && (
          <GsActionSuccess title={inboundSuccess.title}>
            <p>{inboundSuccess.body}</p>
          </GsActionSuccess>
        )}
        <button className="gs-btn primary" type="submit">
          Register shipment
        </button>
      </form>
    </div>
  )
}

function quarantineApprovalFileLabel(note: string): string {
  const p = 'Quarantine approval: '
  return note.startsWith(p) ? note.slice(p.length) : note
}

type InboundQtyModalProps = {
  batch: InventoryBatch | null
  open: boolean
  onClose: () => void
  onSuccess?: (detail: {
    shipmentReference: string
    correctedQtyTonnes: number
    varietyName: string
  }) => void
}

/** Quantity correction before quarantine inspection is finalised (Pending Agricultural Quarantine only). */
function InboundQuantityCorrectionModal({
  batch,
  open,
  onClose,
  onSuccess,
}: InboundQtyModalProps) {
  const { session, commit, ims } = useIms()
  const [correctedQtyStr, setCorrectedQtyStr] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')
  const [modalErr, setModalErr] = useState<string | undefined>()

  useEffect(() => {
    if (open && batch) {
      setCorrectedQtyStr(String(batch.proposedQty))
      setCorrectionReason('')
      setModalErr(undefined)
    }
  }, [open, batch?.batchId, batch?.proposedQty])

  if (!open || !batch) return null
  if (batch.batchStatus !== 'PendingAgriculturalQuarantine') return null

  const saveQtyCorrection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    const q = Number(correctedQtyStr)
    if (!Number.isFinite(q) || q <= 0) {
      setModalErr('Corrected quantity must be greater than zero.')
      return
    }
    const reasonTrim = correctionReason.trim()
    if (!reasonTrim) {
      setModalErr('Correction reason is required.')
      return
    }
    const err = commit({
      type: 'CORRECT_INBOUND_QUANTITY',
      payload: {
        batchId: batch.batchId,
        correctedQtyTonnes: q,
        reason: reasonTrim,
        actor: session,
      },
    })
    if (err) setModalErr(err)
    else {
      const varietyName =
        ims.varieties.find((w) => w.varietyId === batch.varietyId)?.varietyName ??
        batch.varietyId
      onClose()
      onSuccess?.({
        shipmentReference: batch.shipmentReference,
        correctedQtyTonnes: q,
        varietyName,
      })
    }
  }

  return (
    <div
      className="gs-modal-backdrop"
      role="presentation"
      onClick={() => {
        onClose()
        setModalErr(undefined)
      }}
    >
      <div
        className="gs-modal gs-modal-compact"
        role="dialog"
        aria-labelledby="inbound-qty-correct-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="inbound-qty-correct-title" className="gs-modal-title">
          Correct quantity
        </h2>
        <p className="gs-muted gs-modal-lead-tight">
          For logistics issues (misrouted load, unloading discrepancy, quantity mismatch)
          before quarantine inspection is finalised.
        </p>
        <form className="gs-form" onSubmit={saveQtyCorrection}>
          <label>
            Corrected Quantity (Tonnes) <span className="gs-req">*</span>
            <input
              value={correctedQtyStr}
              onChange={(e) => setCorrectedQtyStr(e.target.value)}
              inputMode="decimal"
              required
            />
          </label>
          <label>
            Correction Reason <span className="gs-req">*</span>
            <select
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {INBOUND_QUANTITY_CORRECTION_REASONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          {modalErr && <p className="gs-error">{modalErr}</p>}
          <div className="gs-row gs-row-tight">
            <button type="submit" className="gs-btn primary">
              Save Correction
            </button>
            <button
              type="button"
              className="gs-btn outline"
              onClick={() => {
                onClose()
                setModalErr(undefined)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function openInspectionDefaults(
  b: InventoryBatch,
  outcome: InspectionOutcome,
): { ap: string; rj: string } {
  const p = b.proposedQty
  if (outcome === 'Approved') return { ap: String(p), rj: '0' }
  if (outcome === 'Rejected') return { ap: '0', rj: String(p) }
  const half = Math.floor(p / 2)
  return { ap: String(half), rj: String(p - half) }
}

export function IOQuarantineQueue() {
  const { ims, session, commit } = useIms()
  const [err, setErr] = useState<string | undefined>()
  const [quarantineSuccess, setQuarantineSuccess] = useState<{
    title: string
    body: string
  } | null>(null)
  const [qtyModalBatchId, setQtyModalBatchId] = useState<string | null>(null)
  const qtyModalBatch = useMemo(
    () =>
      qtyModalBatchId
        ? ims.batches.find((b) => b.batchId === qtyModalBatchId) ?? null
        : null,
    [ims.batches, qtyModalBatchId],
  )
  const awaiting = ims.batches.filter(
    (b) => b.batchStatus === 'PendingAgriculturalQuarantine',
  )
  const inspected = ims.batches.filter((b) => b.batchStatus === 'InspectionCompleted')

  const [modalBatch, setModalBatch] = useState<InventoryBatch | null>(null)
  const [outcome, setOutcome] = useState<InspectionOutcome>('Approved')
  const [apStr, setApStr] = useState('')
  const [rjStr, setRjStr] = useState('')
  const [inspectionDate, setInspectionDate] = useState('')
  const [approvalFile, setApprovalFile] = useState<File | null>(null)
  const approvalInputRef = useRef<HTMLInputElement>(null)

  const resetApprovalFile = () => {
    setApprovalFile(null)
    if (approvalInputRef.current) approvalInputRef.current.value = ''
  }

  const openInspection = (b: InventoryBatch) => {
    setModalBatch(b)
    setOutcome('Approved')
    const d = openInspectionDefaults(b, 'Approved')
    setApStr(d.ap)
    setRjStr(d.rj)
    setInspectionDate(new Date().toISOString().slice(0, 10))
    resetApprovalFile()
    setErr(undefined)
    setQuarantineSuccess(null)
  }

  const onApprovalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) {
      setApprovalFile(null)
      return
    }
    const n = f.name.toLowerCase()
    if (!/\.(pdf|jpe?g|png)$/.test(n)) {
      setErr('Quarantine approval document must be a PDF, JPG, or PNG file.')
      e.target.value = ''
      setApprovalFile(null)
      return
    }
    setErr(undefined)
    setApprovalFile(f)
  }

  const onOutcomeChange = (o: InspectionOutcome) => {
    setOutcome(o)
    if (!modalBatch) return
    const d = openInspectionDefaults(modalBatch, o)
    setApStr(d.ap)
    setRjStr(d.rj)
  }

  const submitInspection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !modalBatch) return
    if (!approvalFile) {
      setErr('Quarantine Approval Document is required.')
      return
    }
    const error = commit({
      type: 'RECORD_QUARANTINE_INSPECTION',
      payload: {
        batchId: modalBatch.batchId,
        outcome,
        approvedQtyTonnes: Number(apStr),
        rejectedQtyTonnes: Number(rjStr),
        inspectingBody: QUARANTINE_INSPECTING_BODY,
        inspectionDate,
        quarantineApprovalDocumentFileName: approvalFile.name,
        actor: session,
      },
    })
    if (error) setErr(error)
    else {
      const ref = modalBatch.shipmentReference
      const vName =
        ims.varieties.find((v) => v.varietyId === modalBatch.varietyId)?.varietyName ??
        modalBatch.varietyId
      const ocLabel = inspectionOutcomeLabel(outcome)
      setErr(undefined)
      setQuarantineSuccess({
        title: 'Inspection saved',
        body: `Quarantine inspection recorded for shipment ${ref} (${vName}), outcome ${ocLabel}. Release approved quantity to active stock when ready; batch balances update on release.`,
      })
      setModalBatch(null)
      resetApprovalFile()
    }
  }

  const releaseToInventory = (batchId: string) => {
    if (!session) return
    const b = ims.batches.find((x) => x.batchId === batchId)
    const vName =
      b &&
      (ims.varieties.find((v) => v.varietyId === b.varietyId)?.varietyName ?? b.varietyId)
    const error = commit({
      type: 'RELEASE_AFTER_QUARANTINE_INSPECTION',
      payload: { batchId, actor: session },
    })
    if (error) setErr(error)
    else {
      setErr(undefined)
      setQuarantineSuccess({
        title: 'Released to active stock',
        body: b
          ? `Approved quantity from quarantine for shipment ${b.shipmentReference} (${vName}) is now Active. Batch balances have been updated.`
          : 'Batch balances have been updated.',
      })
    }
  }

  return (
    <div className="gs-stack">
      <h1>Quarantine & Inspection</h1>
      <p className="gs-lead">Inspect, then release approved quantity to active stock.</p>
      {err && !modalBatch && !qtyModalBatchId && <p className="gs-error">{err}</p>}
      {quarantineSuccess && (
        <GsActionSuccess title={quarantineSuccess.title}>
          <p>{quarantineSuccess.body}</p>
        </GsActionSuccess>
      )}

      <section className="gs-panel">
        <h2>Awaiting inspection</h2>
        {awaiting.length === 0 ? (
          <p className="gs-muted">None.</p>
        ) : (
          <div className="gs-table-wrap">
            <table className="gs-table">
              <thead>
                <tr>
                  <th>Shipment reference</th>
                  <th>Variety</th>
                  <th>Supplier</th>
                  <th className="gs-th-numeric">Received (Tonnes)</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {awaiting.map((b) => {
                  const v = ims.varieties.find((x) => x.varietyId === b.varietyId)
                  const s = ims.suppliers.find((x) => x.supplierId === b.supplierId)
                  return (
                    <tr key={b.batchId}>
                      <td>{b.shipmentReference}</td>
                      <td>{v?.varietyName ?? b.varietyId}</td>
                      <td>{s?.supplierName ?? b.supplierId}</td>
                      <td className="gs-awaiting-qty-cell">
                        <span className="gs-awaiting-qty-num">{b.proposedQty}</span>
                        <button
                          type="button"
                          className="gs-qty-edit-btn gs-qty-edit-btn--table"
                          onClick={() => setQtyModalBatchId(b.batchId)}
                          aria-label="Correct received quantity"
                          title="Correct quantity"
                        >
                          ✎
                        </button>
                      </td>
                      <td>{b.submittedDate}</td>
                      <td>
                        <button
                          type="button"
                          className="gs-btn primary"
                          onClick={() => openInspection(b)}
                        >
                          Record inspection
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="gs-panel">
        <h2>Inspection completed</h2>
        {inspected.length === 0 ? (
          <p className="gs-muted">None.</p>
        ) : (
          <div className="gs-table-wrap">
            <table className="gs-table">
              <thead>
                <tr>
                  <th>Shipment reference</th>
                  <th>Outcome</th>
                  <th>Approved (Tonnes)</th>
                  <th>Rejected (Tonnes)</th>
                  <th>Inspection date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {inspected.map((b) => {
                  const oc = b.inspectionOutcome
                  const canRelease =
                    oc === 'Approved' || oc === 'PartiallyApproved'
                  return (
                    <tr key={b.batchId}>
                      <td>{b.shipmentReference}</td>
                      <td>{oc ? inspectionOutcomeLabel(oc) : '—'}</td>
                      <td>{b.inspectionApprovedQtyTonnes ?? '—'}</td>
                      <td>{b.inspectionRejectedQtyTonnes ?? '—'}</td>
                      <td>{b.inspectionDate ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="gs-btn primary"
                          disabled={!canRelease}
                          title={
                            canRelease
                              ? 'Post approved quantity to active stock'
                              : 'Not releasable'
                          }
                          onClick={() => releaseToInventory(b.batchId)}
                        >
                          Release to inventory
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalBatch && (
        <div
          className="gs-modal-backdrop"
          role="presentation"
          onClick={() => {
            setModalBatch(null)
            resetApprovalFile()
            setErr(undefined)
          }}
        >
          <div
            className="gs-modal"
            role="dialog"
            aria-labelledby="inspection-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="inspection-title" className="gs-modal-title">
              Inspection
            </h2>
            <p className="gs-muted">
              Shipment {modalBatch.shipmentReference} — received {modalBatch.proposedQty}{' '}
              Tonnes.
            </p>
            <form className="gs-form" onSubmit={submitInspection}>
              <label>
                Inspection outcome <span className="gs-req">*</span>
                <select
                  value={outcome}
                  onChange={(e) => onOutcomeChange(e.target.value as InspectionOutcome)}
                  required
                >
                  <option value="Approved">Approved</option>
                  <option value="PartiallyApproved">Partially Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>
              <div className="gs-grid-2">
                <label>
                  Approved quantity (Tonnes) <span className="gs-req">*</span>
                  <input
                    value={apStr}
                    onChange={(e) => setApStr(e.target.value)}
                    inputMode="decimal"
                    required
                  />
                </label>
                <label>
                  Rejected quantity (Tonnes) <span className="gs-req">*</span>
                  <input
                    value={rjStr}
                    onChange={(e) => setRjStr(e.target.value)}
                    inputMode="decimal"
                    required
                  />
                </label>
              </div>
              <label>
                Inspecting body <span className="gs-req">*</span>
                <input value={QUARANTINE_INSPECTING_BODY} readOnly />
              </label>
              <label>
                Inspection date <span className="gs-req">*</span>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  required
                />
              </label>
              <div className="gs-quarantine-doc-field">
                <label
                  className="gs-quarantine-doc-label"
                  htmlFor="quarantine-approval-document"
                >
                  Quarantine Approval Document <span className="gs-req">*</span>
                </label>
                <input
                  id="quarantine-approval-document"
                  ref={approvalInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="gs-quarantine-file-input"
                  onChange={onApprovalFileChange}
                  aria-required="true"
                />
                {approvalFile && (
                  <div className="gs-quarantine-doc-meta" aria-live="polite">
                    <span className="gs-quarantine-doc-name">{approvalFile.name}</span>
                    <span className="gs-uploaded-indicator">Uploaded</span>
                  </div>
                )}
              </div>
              {err && modalBatch && <p className="gs-error">{err}</p>}
              <div className="gs-row gs-row-tight">
                <button type="submit" className="gs-btn primary">
                  Save inspection
                </button>
                <button
                  type="button"
                  className="gs-btn outline"
                  onClick={() => {
                    setModalBatch(null)
                    resetApprovalFile()
                    setErr(undefined)
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <InboundQuantityCorrectionModal
        open={
          qtyModalBatchId !== null &&
          qtyModalBatch !== null &&
          qtyModalBatch.batchStatus === 'PendingAgriculturalQuarantine'
        }
        batch={
          qtyModalBatch &&
          qtyModalBatch.batchStatus === 'PendingAgriculturalQuarantine'
            ? qtyModalBatch
            : null
        }
        onClose={() => setQtyModalBatchId(null)}
        onSuccess={(d) =>
          setQuarantineSuccess({
            title: 'Quantity correction saved',
            body: `Corrected received quantity for shipment ${d.shipmentReference} (${d.varietyName}) to ${d.correctedQtyTonnes} Tonnes. The change is recorded on this batch.`,
          })
        }
      />
    </div>
  )
}

export function IOSearch() {
  const { ims } = useIms()
  const [q, setQ] = useState('')
  const [statusKey, setStatusKey] = useState<string>('all')
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return ims.batches.filter((b) => {
      if (statusKey !== 'all') {
        if (statusKey === 'closed') {
          if (b.batchStatus !== 'Rejected' && b.batchStatus !== 'Depleted') return false
        } else if (b.batchStatus !== statusKey) return false
      }
      if (!needle) return true
      return (
        b.batchId.toLowerCase().includes(needle) ||
        b.shipmentReference.toLowerCase().includes(needle) ||
        b.varietyId.toLowerCase().includes(needle)
      )
    })
  }, [ims.batches, q, statusKey])

  return (
    <div className="gs-stack">
      <h1>Browse Inventory</h1>
      <p className="gs-lead">Filter by shipment, batch, or variety.</p>
      <div className="gs-panel gs-filter-toolbar">
        <div className="gs-filter-grid">
          <label className="gs-filter-field">
            <span className="gs-filter-label">Search</span>
            <input
              placeholder="Shipment, batch, variety"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="gs-filter-field">
            <span className="gs-filter-label">Status</span>
            <select value={statusKey} onChange={(e) => setStatusKey(e.target.value)}>
              <option value="all">All</option>
              <option value="PendingAgriculturalQuarantine">
                Pending Agricultural Quarantine
              </option>
              <option value="InspectionCompleted">Inspection Completed</option>
              <option value="Active">Active</option>
              <option value="closed">Rejected / Depleted</option>
            </select>
          </label>
        </div>
      </div>
      <div className="gs-table-wrap">
        <table className="gs-table">
          <thead>
            <tr>
              <th>Shipment reference</th>
              <th>Batch</th>
              <th>Variety</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Remaining quantity (Tonnes)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const v = ims.varieties.find((x) => x.varietyId === b.varietyId)
              const s = ims.suppliers.find((x) => x.supplierId === b.supplierId)
              return (
                <tr key={b.batchId}>
                  <td>{b.shipmentReference}</td>
                  <td>{b.batchId}</td>
                  <td>{v?.varietyName ?? b.varietyId}</td>
                  <td>{s?.supplierName ?? b.supplierId}</td>
                  <td>
                    <span
                      className={batchStatusChipClass(b.batchStatus)}
                      title={batchStatusLabel(b.batchStatus)}
                    >
                      {batchStatusShort(b.batchStatus)}
                    </span>
                  </td>
                  <td>{b.remainingQty}</td>
                  <td>
                    <Link className="gs-link" to={`${routes.ioRecord}/${b.batchId}`}>
                      Open
                    </Link>
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

export function IORecordDetails() {
  const { batchId } = useParams()
  const { ims } = useIms()
  const batch = ims.batches.find((b) => b.batchId === batchId)
  const variety = ims.varieties.find((v) => v.varietyId === batch?.varietyId)
  const supplier = ims.suppliers.find((s) => s.supplierId === batch?.supplierId)

  const [qtyModalOpen, setQtyModalOpen] = useState(false)
  const [qtySuccess, setQtySuccess] = useState<{
    title: string
    body: string
  } | null>(null)

  useEffect(() => {
    if (!qtySuccess) return
    const t = window.setTimeout(() => setQtySuccess(null), 5000)
    return () => window.clearTimeout(t)
  }, [qtySuccess])

  if (!batch) {
    return <p className="gs-muted">Lot not found.</p>
  }

  const avail = availableToAllocateOnBatch(ims, batch.batchId)
  const canCorrectQty = batch.batchStatus === 'PendingAgriculturalQuarantine'

  const lastCorrectedBy = batch.lastInboundQuantityCorrectionByUserId
    ? ims.users.find((u) => u.userId === batch.lastInboundQuantityCorrectionByUserId)
        ?.displayName
    : undefined

  return (
    <div className="gs-stack">
      <h1>Inbound shipment</h1>
      {qtySuccess && (
        <div className="gs-flash-confirm">
          <GsActionSuccess title={qtySuccess.title}>
            <p>{qtySuccess.body}</p>
          </GsActionSuccess>
        </div>
      )}
      <div className="gs-panel">
        <dl className="gs-dl">
          <div>
            <dt>Shipment reference number</dt>
            <dd>{batch.shipmentReference}</dd>
          </div>
          <div>
            <dt>Supplier</dt>
            <dd>{supplier?.supplierName ?? batch.supplierId}</dd>
          </div>
          <div>
            <dt>Origin</dt>
            <dd>{batch.origin}</dd>
          </div>
          <div>
            <dt>Variety</dt>
            <dd>{variety?.varietyName ?? batch.varietyId}</dd>
          </div>
          <div>
            <dt>Quantity (Tonnes)</dt>
            <dd className="gs-qty-dd">
              <span className="gs-qty-value">{batch.proposedQty}</span>
              {canCorrectQty && (
                <button
                  type="button"
                  className="gs-qty-edit-btn"
                  onClick={() => setQtyModalOpen(true)}
                  aria-label="Correct quantity"
                  title="Correct quantity"
                >
                  ✎
                </button>
              )}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span
                className={batchStatusChipClass(batch.batchStatus)}
                title={batchStatusLabel(batch.batchStatus)}
              >
                {batchStatusShort(batch.batchStatus)}
              </span>
            </dd>
          </div>
          <div>
            <dt>Batch</dt>
            <dd>{batch.batchId}</dd>
          </div>
          {(batch.approvedQty > 0 || batch.remainingQty > 0) && (
            <div>
              <dt>Approved / remaining (Tonnes)</dt>
              <dd>
                {batch.approvedQty} / {batch.remainingQty}
              </dd>
            </div>
          )}
          <div>
            <dt>Available to allocate (Tonnes)</dt>
            <dd>{avail}</dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>{batch.storageCategory}</dd>
          </div>
          {(batch.inspectionOutcome ||
            batch.inspectionDate ||
            batch.quarantineApprovalDocumentNote) && (
            <>
              <div>
                <dt>Inspection outcome</dt>
                <dd>
                  {batch.inspectionOutcome
                    ? inspectionOutcomeLabel(batch.inspectionOutcome)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Approved quantity (Tonnes)</dt>
                <dd>{batch.inspectionApprovedQtyTonnes ?? '—'}</dd>
              </div>
              <div>
                <dt>Rejected quantity (Tonnes)</dt>
                <dd>{batch.inspectionRejectedQtyTonnes ?? '—'}</dd>
              </div>
              <div>
                <dt>Inspecting body</dt>
                <dd>{batch.inspectingBody ?? '—'}</dd>
              </div>
              <div>
                <dt>Inspection date</dt>
                <dd>{batch.inspectionDate ?? '—'}</dd>
              </div>
              {batch.quarantineApprovalDocumentNote && (
                <div>
                  <dt>Quarantine Approval Document</dt>
                  <dd>
                    {quarantineApprovalFileLabel(batch.quarantineApprovalDocumentNote)}
                  </dd>
                </div>
              )}
            </>
          )}
          {batch.shipmentDocumentNote && (
            <div>
              <dt>Shipment document</dt>
              <dd>{formatDocumentNoteDisplay(batch.shipmentDocumentNote)}</dd>
            </div>
          )}
        </dl>
        {batch.lastInboundQuantityCorrectionAt && (
          <div className="gs-correction-below-dl">
            <p className="gs-muted gs-correction-line">
              Last quantity update{' '}
              {new Date(batch.lastInboundQuantityCorrectionAt).toLocaleString()}
              {lastCorrectedBy ? ` · ${lastCorrectedBy}` : ''}
            </p>
            {batch.lastInboundQuantityCorrectionReason && (
              <p className="gs-muted gs-correction-reason">
                {batch.lastInboundQuantityCorrectionReason}
              </p>
            )}
          </div>
        )}
      </div>

      <InboundQuantityCorrectionModal
        open={qtyModalOpen && canCorrectQty}
        batch={qtyModalOpen && canCorrectQty ? batch : null}
        onClose={() => setQtyModalOpen(false)}
        onSuccess={(d) =>
          setQtySuccess({
            title: 'Quantity correction saved',
            body: `Corrected received quantity for shipment ${d.shipmentReference} (${d.varietyName}) to ${d.correctedQtyTonnes} Tonnes. The change is recorded on this batch.`,
          })
        }
      />
    </div>
  )
}
