/**
 * Template editor — center pane (ticket 12).
 *
 * A Template "behaves like a Post": when one is selected in the navigator it
 * takes over the center pane and is edited in the exact same card + Lexical
 * surface + weighted counter as a Post (shared via WeightedTextEditor).
 *
 * Unlike a Post (which auto-saves), a Template requires **manual saving**: edits
 * live in a local `draft` and are only persisted when the user hits **Save**
 * (which does not close the editor). A **status pill** in the title bar shows
 * `● unsaved` (amber) while the draft differs from the stored snippet, or `saved`
 * otherwise, so the user always knows whether their edits are committed. The card
 * footer carries a **copy** button that copies the current text to the clipboard
 * (flashes "copied"), mirroring the prototype's per-post copy.
 *
 * This component is remounted per template (keyed on the id in ThreadEditor), so
 * `draft` always initialises from the freshly-selected template's content.
 */

import {
  useCallback,
  useState,
  type JSX,
} from 'react'

import { useStore } from './lib/StoreContext.tsx'
import { useSelection } from './lib/SelectionContext.tsx'
import {
  EditableTextBody,
  RulerGauge,
  parseWeighted,
} from './WeightedTextEditor.tsx'

export function TemplateEditor({ limit }: { limit: number }): JSX.Element {
  const { state, updateTemplate } = useStore()
  const { selectedTemplateId } = useSelection()

  const template = selectedTemplateId ? state.templates[selectedTemplateId] : null

  // Local draft — edits are NOT written to the store until the user saves.
  const [draft, setDraft] = useState(template?.content ?? '')
  const [copied, setCopied] = useState(false)

  const handleChangeText = useCallback((text: string) => {
    setDraft(text)
  }, [])

  const handleSave = useCallback(() => {
    if (selectedTemplateId) updateTemplate(selectedTemplateId, { content: draft })
  }, [selectedTemplateId, draft, updateTemplate])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable (insecure context / denied) — silently ignore.
    }
  }, [draft])

  // Template vanished (deleted elsewhere) — bounce back to the empty state.
  if (!template) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: 0.45,
        }}
      >
        <div className="label-mono" style={{ fontSize: 10 }}>
          — template not found —
        </div>
      </div>
    )
  }

  const dirty = draft !== template.content

  const parsed = parseWeighted(draft, limit)
  const { weightedLength } = parsed
  const overLimit = weightedLength > limit

  const label = template.name.trim() === '' ? '(untitled)' : template.name

  return (
    <>
      {/* Title bar — mirrors the thread title bar, with a "template" tag,
          the save-state pill, and the Done (save + close) button. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.08em',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: 'var(--accent)' }}>▤</span>
          {' '}
          <span style={{ color: 'var(--fg)', opacity: 0.85 }}>{label}</span>
          {' '}
          <span style={{ opacity: 0.4 }}>template</span>
        </div>

        {/* Save-state indicator */}
        <span
          className="label-mono"
          aria-live="polite"
          style={{
            fontSize: 9,
            color: dirty ? 'var(--warn)' : 'var(--muted)',
            opacity: dirty ? 0.95 : 0.55,
          }}
        >
          {dirty ? '● unsaved' : 'saved'}
        </span>

        <button
          type="button"
          className="chip chip--accent"
          aria-label="Save template"
          title="Save"
          disabled={!dirty}
          onClick={handleSave}
        >
          save
        </button>
      </div>

      {/* Ruler hairline */}
      <div className="ruler" style={{ marginBottom: 12 }} />

      {/* Single template card — same chrome as a Post */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '5px 8px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <span className="label-mono" style={{ flex: 1, fontSize: 9, opacity: 0.55 }}>
            snippet
          </span>
        </div>

        <EditableTextBody
          id={`template-${template.id}`}
          content={template.content}
          limit={limit}
          ariaLabel={`Template ${label} editor`}
          onChangeText={handleChangeText}
        />

        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px 8px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <RulerGauge
            weightedLength={weightedLength}
            limit={limit}
            overLimit={overLimit}
          />
          <div style={{ flex: 1 }} />
          {overLimit && (
            <span
              className="label-mono"
              style={{ fontSize: 9, color: 'var(--warn)', opacity: 0.9 }}
            >
              over limit
            </span>
          )}
          {copied && (
            <span
              className="label-mono"
              style={{ fontSize: 9, color: 'var(--accent)' }}
            >
              copied
            </span>
          )}
          <button
            type="button"
            className="chip"
            aria-label="Copy template to clipboard"
            title="Copy to clipboard"
            onClick={() => void handleCopy()}
          >
            ⧉ copy
          </button>
        </footer>
      </div>
    </>
  )
}
