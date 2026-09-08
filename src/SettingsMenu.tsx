/**
 * Settings / misc cluster in the top bar (ticket #13).
 *
 * Layout (V7.4, per the prototype top bar):
 *   [ 280 ]  [ ⚙ ]
 *   readout   settings popover
 *
 *   • The `280` chip is a live readout of the global character limit — it
 *     reflects `settings.charLimit` and updates the moment the limit changes.
 *     Clicking it opens the same settings popover as the gear.
 *   • The gear (⚙) opens a popover holding the settings/misc controls:
 *       – Character limit — a single global value (default 280) that feeds the
 *         weighted counter in the editor (which reads `settings.charLimit ?? 280`).
 *       – Export JSON — superset round-trip download of the whole store.
 *       – Import JSON — replace-on-import from a file, behind a danger confirm.
 *     Import/export lives here (not as a primary top-bar control) per the ticket.
 *
 * Per-thread limits and merge-by-id import stay out of scope (see the map's fog).
 */
import { useEffect, useRef, useState, type JSX } from 'react'
import { useStore } from './lib/StoreContext.tsx'
import { useDialog } from './DialogProvider.tsx'

const DEFAULT_LIMIT = 280

/** Read the global weighted-character limit, falling back to the default. */
function readLimit(settings: Record<string, unknown>): number {
  const raw = settings['charLimit']
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 1
    ? raw
    : DEFAULT_LIMIT
}

export function SettingsMenu(): JSX.Element {
  const { state, updateSettings, exportStore, importStore } = useStore()
  const dialog = useDialog()

  const limit = readLimit(state.settings as Record<string, unknown>)

  const [open, setOpen] = useState(false)
  // Draft of the limit field, kept as a string so the input can be transiently
  // empty / invalid while typing. Committed to the store only when it parses.
  const [limitDraft, setLimitDraft] = useState(String(limit))
  // Transient status line shown inside the popover (import result / errors).
  const [status, setStatus] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Re-seed the draft from the store whenever the popover opens, so it always
  // shows the persisted value (e.g. after an import changed it).
  useEffect(() => {
    if (open) {
      setLimitDraft(String(limit))
      setStatus(null)
    }
  }, [open, limit])

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // ── Char-limit editing ──────────────────────────────────────────────────
  function commitLimit(next: string) {
    setLimitDraft(next)
    const n = Number.parseInt(next.trim(), 10)
    if (Number.isFinite(n) && n >= 1 && n <= 100000) {
      if (n !== limit) updateSettings({ charLimit: n })
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const json = exportStore()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tweet-typer-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setStatus({ tone: 'ok', text: 'Exported workspace to JSON.' })
  }

  // ── Import (replace-on-import, with a confirm) ─────────────────────────────
  async function handleFile(file: File) {
    const text = await file.text()
    const ok = await dialog.confirm({
      title: 'Replace everything?',
      message:
        'Importing replaces your entire workspace — every Project, Thread, Post, ' +
        'Template and setting is discarded and swapped for the file’s contents. ' +
        'This cannot be undone.',
      confirmLabel: 'Replace',
      danger: true,
    })
    if (!ok) return
    try {
      importStore(text)
      setStatus({ tone: 'ok', text: 'Workspace replaced from import.' })
    } catch (err) {
      setStatus({
        tone: 'warn',
        text: err instanceof Error ? err.message : 'Import failed.',
      })
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex', gap: 10 }}>
      {/* Live char-limit readout — click to edit. */}
      <button
        type="button"
        className="chip"
        title="Character limit — click to change"
        aria-label={`Character limit ${limit} — click to change`}
        onClick={() => setOpen((v) => !v)}
      >
        {limit}
      </button>

      {/* Settings / misc popover trigger. */}
      <button
        type="button"
        className={open ? 'chip chip--accent' : 'chip'}
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Settings"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙
      </button>

      {open && (
        <div className="popover" role="dialog" aria-label="Settings">
          {/* Character limit */}
          <div className="label-mono">Character limit</div>
          <div className="popover-hint">
            Global weighted limit for every Post. Default {DEFAULT_LIMIT}.
          </div>
          <input
            className="modal-input"
            type="number"
            min={1}
            max={100000}
            value={limitDraft}
            onChange={(e) => commitLimit(e.target.value)}
            onBlur={() => setLimitDraft(String(limit))}
            aria-label="Global character limit"
          />

          <div className="popover-sep" />

          {/* Import / export */}
          <div className="label-mono">Data</div>
          <div className="popover-hint">
            Round-trip JSON. Import replaces the whole workspace.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="chip" onClick={handleExport}>
              ↧ export
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => fileRef.current?.click()}
            >
              ↥ import
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              // Reset so picking the same file again re-fires onChange.
              e.target.value = ''
              if (file) void handleFile(file)
            }}
          />

          {status && (
            <div
              className="popover-status"
              style={{ color: status.tone === 'warn' ? 'var(--warn)' : 'var(--muted)' }}
            >
              {status.text}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
