/**
 * Selection context for Tweet Typer.
 *
 * Holds what the center pane is currently editing: either the selected thread
 * (its posts) or the selected template (ticket 12 — a template behaves like a
 * Post). The two are **mutually exclusive** — selecting one clears the other —
 * so the center pane and the navigator highlight stay unambiguous.
 *
 * The navigator (left pane) writes to it on click; the editor (center pane)
 * reads it.
 *
 * **Persistence (ticket 15):** the active selection now survives a reload. It is
 * mirrored into the persisted `tt:ui` store (`selectedThreadId` /
 * `selectedTemplateId`). On boot the initial selection is read back from there
 * and **validated against the live store** — a dangling id (its thread/template
 * was deleted, or is gone after an import) re-hydrates to null. A running-session
 * delete/import is caught by the same guard via an effect.
 *
 * Usage:
 *   • Wrap the app in `<SelectionProvider>` (inside <StoreProvider>).
 *   • Call `useSelection()` in any component to get / set the selection.
 */

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { useStore } from './StoreContext.tsx'

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
  const { state, updateUi } = useStore()

  // Seed from the persisted ui store, but only honour an id that still resolves
  // to a live entity (guards against a stale selection after an import/delete).
  // The store hydrates synchronously in StoreProvider (our parent), so
  // `state.ui` / `state.threads` / `state.templates` are already populated here.
  const [selectedThreadId, setThread] = useState<string | null>(() => {
    const id = state.ui.selectedThreadId
    return id !== null && state.threads[id] ? id : null
  })
  const [selectedTemplateId, setTemplate] = useState<string | null>(() => {
    const id = state.ui.selectedTemplateId
    return id !== null && state.templates[id] ? id : null
  })

  // Selecting an actual thread clears any template selection (and vice versa);
  // clearing to null leaves the other side untouched. Every change is mirrored
  // into the persisted ui store so it survives a reload.
  const setSelectedThreadId = useCallback((id: string | null) => {
    setThread(id)
    if (id !== null) {
      setTemplate(null)
      updateUi({ selectedThreadId: id, selectedTemplateId: null })
    } else {
      updateUi({ selectedThreadId: null })
    }
  }, [updateUi])

  const setSelectedTemplateId = useCallback((id: string | null) => {
    setTemplate(id)
    if (id !== null) {
      setThread(null)
      updateUi({ selectedTemplateId: id, selectedThreadId: null })
    } else {
      updateUi({ selectedTemplateId: null })
    }
  }, [updateUi])

  // Drop a selection whose target has disappeared (deleted this session, or gone
  // after a replace-on-import). Runs whenever the relevant collections change.
  useEffect(() => {
    if (selectedThreadId !== null && !state.threads[selectedThreadId]) {
      setSelectedThreadId(null)
    }
    if (selectedTemplateId !== null && !state.templates[selectedTemplateId]) {
      setSelectedTemplateId(null)
    }
  }, [
    state.threads,
    state.templates,
    selectedThreadId,
    selectedTemplateId,
    setSelectedThreadId,
    setSelectedTemplateId,
  ])

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
