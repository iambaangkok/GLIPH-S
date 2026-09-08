/**
 * App-wide modal dialogs (V7.4) — replaces native window.prompt / window.confirm.
 *
 * Promise-based so call sites read linearly:
 *
 *   const dialog = useDialog()
 *   const name = await dialog.prompt({ title: 'New project', confirmLabel: 'Create' })
 *   if (name === null) return            // cancelled / dismissed
 *
 *   const ok = await dialog.confirm({ title: 'Delete', message: '…', danger: true })
 *   if (!ok) return
 *
 * A single dialog is shown at a time. Enter confirms, Escape / backdrop cancels;
 * the prompt input autofocuses and selects its initial value.
 */

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// ── Options ─────────────────────────────────────────────────────────────────

interface PromptOptions {
  title: string
  message?: string
  initialValue?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
}

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Render the confirm action in the amber warning tone. */
  danger?: boolean
}

export interface DialogAPI {
  /** Resolves to the entered string, or `null` if cancelled. */
  prompt: (opts: PromptOptions) => Promise<string | null>
  /** Resolves to `true` if confirmed, `false` if cancelled. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

type ActiveDialog =
  | ({ kind: 'prompt' } & PromptOptions & { resolve: (v: string | null) => void })
  | ({ kind: 'confirm' } & ConfirmOptions & { resolve: (v: boolean) => void })

// ── Context ───────────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogAPI | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null)

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setActive({ kind: 'prompt', ...opts, resolve })
      }),
    [],
  )

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setActive({ kind: 'confirm', ...opts, resolve })
      }),
    [],
  )

  const api: DialogAPI = { prompt, confirm }

  return (
    <DialogContext value={api}>
      {children}
      {active && (
        <DialogView
          key={active.title + String(active.kind)}
          active={active}
          onClose={() => setActive(null)}
        />
      )}
    </DialogContext>
  )
}

// ── View ──────────────────────────────────────────────────────────────────────

function DialogView({ active, onClose }: { active: ActiveDialog; onClose: () => void }) {
  const [value, setValue] = useState(
    active.kind === 'prompt' ? active.initialValue ?? '' : '',
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const cancel = useCallback(() => {
    if (active.kind === 'prompt') active.resolve(null)
    else active.resolve(false)
    onClose()
  }, [active, onClose])

  function accept() {
    if (active.kind === 'prompt') active.resolve(value)
    else active.resolve(true)
    onClose()
  }

  // Autofocus the input on open.
  useEffect(() => {
    if (active.kind === 'prompt') {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [active.kind])

  // Escape closes from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancel])

  const danger = active.kind === 'confirm' && active.danger === true

  return (
    <div className="modal-backdrop" onMouseDown={cancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="label-mono modal-title">{active.title}</div>

        {active.message && <div className="modal-message">{active.message}</div>}

        {active.kind === 'prompt' && (
          <input
            ref={inputRef}
            className="modal-input"
            value={value}
            placeholder={active.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                accept()
              }
            }}
          />
        )}

        <div className="modal-actions">
          <button className="chip" onClick={cancel}>
            {active.cancelLabel ?? 'Cancel'}
          </button>
          <button
            className={danger ? 'chip' : 'chip chip--accent'}
            style={
              danger ? { color: 'var(--warn)', borderColor: 'var(--warn)' } : undefined
            }
            onClick={accept}
          >
            {active.confirmLabel ?? (active.kind === 'prompt' ? 'OK' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/** Access the dialog API from any component inside `<DialogProvider>`. */
export function useDialog(): DialogAPI {
  const ctx = use(DialogContext)
  if (ctx === null) {
    throw new Error('useDialog must be called inside <DialogProvider>')
  }
  return ctx
}
