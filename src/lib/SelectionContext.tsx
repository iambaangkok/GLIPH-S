/**
 * Lightweight UI-only selection context for Tweet Typer.
 *
 * Holds the currently selected thread id. This is ephemeral UI state — it is
 * NOT persisted to localStorage.  The navigator (left pane) writes to it on
 * thread click; the editor (center pane, ticket 10) reads from it.
 *
 * Usage:
 *   • Wrap the app in `<SelectionProvider>` (inside <StoreProvider>).
 *   • Call `useSelection()` in any component to get / set the selected id.
 */

import {
  createContext,
  use,
  useState,
  type ReactNode,
} from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectionAPI {
  selectedThreadId: string | null
  setSelectedThreadId: (id: string | null) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const SelectionContext = createContext<SelectionAPI | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

  const api: SelectionAPI = { selectedThreadId, setSelectedThreadId }

  return (
    <SelectionContext value={api}>
      {children}
    </SelectionContext>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Access the current thread selection from any component inside
 * `<SelectionProvider>`.
 *
 * @example
 *   const { selectedThreadId, setSelectedThreadId } = useSelection()
 */
export function useSelection(): SelectionAPI {
  const ctx = use(SelectionContext)
  if (ctx === null) {
    throw new Error('useSelection must be called inside <SelectionProvider>')
  }
  return ctx
}
