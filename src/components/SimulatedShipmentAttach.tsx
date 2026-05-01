import { useEffect, useState } from 'react'

/** File names aligned to catalog shipments SHP-2401–SHP-2404. */
export const CATALOG_SHIPMENT_FILES = [
  { filename: 'SHP-2401-bol.pdf', kind: 'PDF' as const },
  { filename: 'SHP-2402-coa.pdf', kind: 'PDF' as const },
  { filename: 'SHP-2403-bol.pdf', kind: 'PDF' as const },
  { filename: 'SHP-2404-bol.pdf', kind: 'PDF' as const },
]

export type DemoAttachment = { filename: string; kind: 'PDF' | 'JPG' | 'PNG' }

const ATTACH_PREFIX = 'Attachment: '

type Props = {
  attachment: DemoAttachment | null
  onChange: (next: DemoAttachment | null) => void
}

/** Stored on the batch as a single-line document reference. */
export function shipmentDocumentAttachmentNote(
  a: DemoAttachment | null,
): string | undefined {
  if (!a) return undefined
  return `${ATTACH_PREFIX}${a.filename}`
}

/** Parse a stored note back into an attachment when it uses the standard prefix. */
export function parseAttachmentFromNote(note?: string): DemoAttachment | null {
  if (!note) return null
  const legacy = 'Attachment (simulated): '
  const prefixes = [ATTACH_PREFIX, legacy]
  for (const prefix of prefixes) {
    const idx = note.indexOf(prefix)
    if (idx >= 0) {
      const filename = note.slice(idx + prefix.length).trim()
      if (!filename) return null
      const lower = filename.toLowerCase()
      const kind: DemoAttachment['kind'] = lower.endsWith('.pdf')
        ? 'PDF'
        : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
          ? 'JPG'
          : 'PNG'
      return { filename, kind }
    }
  }
  return null
}

/** User-facing line for lot detail screens. */
export function formatDocumentNoteDisplay(note: string): string {
  const parsed = parseAttachmentFromNote(note)
  if (parsed) return `On file: ${parsed.filename}`
  return note
}

export function SimulatedShipmentAttach({ attachment, onChange }: Props) {
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [attachStatus, setAttachStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!attachStatus) return
    const t = window.setTimeout(() => setAttachStatus(null), 4500)
    return () => window.clearTimeout(t)
  }, [attachStatus])

  const confirmFile = (filename: string, kind: DemoAttachment['kind']) => {
    onChange({ filename, kind })
    setShowAttachModal(false)
    setAttachStatus('Document selected.')
  }

  return (
    <>
      <div className="gs-attach-card">
        <h2 className="gs-attach-title">Shipment document</h2>
        <p className="gs-muted gs-attach-hint">
          Select a file reference to attach to this receipt (reference only in this build).
        </p>
        <button
          type="button"
          className="gs-btn primary"
          onClick={() => setShowAttachModal(true)}
        >
          Choose file
        </button>
      </div>

      {(attachStatus || attachment) && (
        <div className="gs-attach-below">
          {attachStatus && <p className="gs-success gs-attach-status">{attachStatus}</p>}
          {attachment && (
            <div className="gs-file-chip" aria-label="Attached file">
              <span className="gs-file-chip-icon" aria-hidden="true">
                {attachment.kind}
              </span>
              <div className="gs-file-chip-body">
                <span className="gs-file-chip-name">{attachment.filename}</span>
                <span className="gs-file-chip-meta">Reference on record</span>
              </div>
              <button
                type="button"
                className="gs-file-chip-remove"
                onClick={() => {
                  onChange(null)
                  setAttachStatus(null)
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {showAttachModal && (
        <div
          className="gs-modal-backdrop"
          role="presentation"
          onClick={() => setShowAttachModal(false)}
        >
          <div
            className="gs-modal"
            role="dialog"
            aria-labelledby="attach-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="attach-modal-title" className="gs-modal-title">
              Select file
            </h2>
            <p className="gs-muted">Pick one reference to store with the shipment.</p>
            <ul className="gs-modal-list">
              {CATALOG_SHIPMENT_FILES.map((f) => (
                <li key={f.filename}>
                  <div className="gs-modal-row">
                    <span className="gs-modal-filename">{f.filename}</span>
                    <span className="gs-modal-kind">{f.kind}</span>
                    <button
                      type="button"
                      className="gs-btn primary"
                      onClick={() => confirmFile(f.filename, f.kind)}
                    >
                      Use
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="gs-btn outline gs-modal-close"
              onClick={() => setShowAttachModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
