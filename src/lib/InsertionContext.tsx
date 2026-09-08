/**
 * Ephemeral cursor-aware insertion seam for GLIPH-S.
 *
 * Holds a reference to the last-focused Lexical editor so that the symbol
 * browser / template panel (tickets #11 / #12) can call `insertAtCursor(text)`
 * and have the text land at the last caret position of the last-focused Post
 * editor without disrupting focus.
 *
 * Convention (panels call this pattern):
 *   onMouseDown={e => { e.preventDefault(); insertAtCursor(sym) }}
 *   // preventDefault keeps focus in the editor; insertAtCursor does the rest.
 *
 * This context is purely ephemeral — it is NEVER persisted to localStorage.
 *
 * Usage:
 *   • Wrap the app (inside SelectionProvider) with `<InsertionProvider>`.
 *   • Each PostEditor calls `registerEditor(editor)` on focus.
 *   • Panels call `insertAtCursor(text)` on symbol / template click.
 */

import {
  createContext,
  use,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'

import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
} from 'lexical'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InsertionAPI {
  /**
   * Register the editor that just received focus. Call this in each Post
   * editor's `onFocus` handler so the context tracks the last-focused one.
   */
  registerEditor: (editor: LexicalEditor) => void

  /**
   * Insert `text` at the last known caret position of the last-focused editor.
   * If no editor has ever been focused, this is a no-op.
   */
  insertAtCursor: (text: string) => void

  /**
   * Transform the current (non-empty) selection of the last-focused editor in
   * place: reads the selected plain text, runs it through `transform`, and
   * replaces the selection with the result. Used by the Styles tab to restyle
   * a selection ("fancy fonts").
   *
   * No-op when no editor is focused, the selection is collapsed/empty, or the
   * transform returns the input unchanged.
   */
  transformSelection: (transform: (selected: string) => string) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const InsertionContext = createContext<InsertionAPI | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function InsertionProvider({ children }: { children: ReactNode }) {
  const lastEditorRef = useRef<LexicalEditor | null>(null)

  const registerEditor = useCallback((editor: LexicalEditor) => {
    lastEditorRef.current = editor
  }, [])

  const insertAtCursor = useCallback((text: string) => {
    const editor = lastEditorRef.current
    if (!editor) return

    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        // Insert at the live selection (cursor position).
        selection.insertText(text)
      } else {
        // No range selection — append to the end of the last paragraph.
        const root = $getRoot()
        const lastChild = root.getLastChild()
        if (lastChild && 'selectEnd' in lastChild) {
          // Select the end of the last block and insert there.
          (lastChild as { selectEnd: () => typeof selection }).selectEnd()
          const newSel = $getSelection()
          if ($isRangeSelection(newSel)) {
            newSel.insertText(text)
          }
        }
      }
    })
  }, [])

  const transformSelection = useCallback(
    (transform: (selected: string) => string) => {
      const editor = lastEditorRef.current
      if (!editor) return

      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || selection.isCollapsed()) return
        const selected = selection.getTextContent()
        const next = transform(selected)
        // Skip no-op transforms so we don't churn undo history / caret.
        if (next === selected) return
        selection.insertText(next)
      })
    },
    [],
  )

  const api: InsertionAPI = { registerEditor, insertAtCursor, transformSelection }

  return (
    <InsertionContext value={api}>
      {children}
    </InsertionContext>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Access the insertion seam from any component inside `<InsertionProvider>`.
 *
 * @example
 *   const { insertAtCursor } = useInsertion()
 *   <button onMouseDown={e => { e.preventDefault(); insertAtCursor('★') }} />
 *
 *   const { transformSelection } = useInsertion()
 *   <button onMouseDown={e => { e.preventDefault(); transformSelection(s => applyStyle(s, 'bold')) }} />
 */
export function useInsertion(): InsertionAPI {
  const ctx = use(InsertionContext)
  if (ctx === null) {
    throw new Error('useInsertion must be called inside <InsertionProvider>')
  }
  return ctx
}
