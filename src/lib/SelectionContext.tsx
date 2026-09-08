/**
 * Lightweight UI-only selection context for Tweet Typer.
 *
 * Holds what the center pane is currently editing: either the selected thread
 * (its posts) or the selected template (ticket 12 — a template behaves like a
 * Post). The two are **mutually exclusive** — selecting one clears the other —
 * so the center pane and the navigator highlight stay unambiguous.
 *
 * This is ephemeral UI state — it is NOT persisted to localStorage. The
 * navigator (left pane) writes to it on click; the editor (center pane) reads it.
 *
 * Usage:
 *   • Wrap the app in `<SelectionProvider>` (inside <StoreProvider>).
 *   • Call `useSelection()` in any component to get / set the selection.
 */

import {
  createContext,
  use,
  useCallback,
  useState,
  type ReactNode,
} from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectionAPI {
  selectedThreadId: string | null
  setSelectedThreadId: (id: string | null) => void
  selectedTemplateId: string | null
  setSelectedTemplateId: (id: string | null) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const SelectionContext = createContext<SelectionAPI | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedThreadId, setThread] = useState<string | null>(null)
  const [selectedTemplateId, setTemplate] = useState<string | null>(null)

  // Selecting an actual thread clears any template selection (and vice versa);
  // clearing to null leaves the other side untouched.
  const setSelectedThreadId = useCallback((id: string | null) => {
    setThread(id)
    if (id !== null) setTemplate(null)
  }, [])

  const setSelectedTemplateId = useCallback((id: string | null) => {
    setTemplate(id)
    if (id !== null) setThread(null)
  }, [])

  const api: SelectionAPI = {
    selectedThreadId,
    setSelectedThreadId,
    selectedTemplateId,
    setSelectedTemplateId,
  }

  return (
    <SelectionContext value={api}>
      {children}
    </SelectionContext>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Access the current selection from any component inside `<SelectionProvider>`.
 *
 * @example
 *   const { selectedThreadId, setSelectedThreadId } = useSelection()
 *   const { selectedTemplateId, setSelectedTemplateId } = useSelection()
 */
export function useSelection(): SelectionAPI {
  const ctx = use(SelectionContext)
  if (ctx === null) {
    throw new Error('useSelection must be called inside <SelectionProvider>')
  }
  return ctx
}
