/**
 * Shared weighted-text editing surface (extracted from ticket 10's ThreadEditor).
 *
 * Both the Post editor (center pane, #10) and the Template editor (#12, "a
 * template behaves like a Post") compose the same building blocks from here so
 * the editing experience — Lexical contenteditable, plain-text-canonical
 * seeding, cursor-aware insertion registration, entity/over-limit overlay, and
 * the V7.4 ruler-gauge counter — stays identical and lives in exactly one place.
 *
 * Exports:
 *   • parseWeighted(text, limit) — twitter-text weighted parse
 *   • RulerGauge — the V7.4 amber fill-bar + numeric counter
 *   • EditableTextBody — the Lexical body + highlight overlay (no card chrome)
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  type JSX,
} from 'react'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type EditorState,
  type LexicalEditor,
} from 'lexical'

import twitterText from 'twitter-text'
import type { TweetParseConfig } from 'twitter-text'

import { useInsertion } from './lib/InsertionContext.tsx'

// ── twitter-text helpers ──────────────────────────────────────────────────────

const twitterConfigs = twitterText.configs

export function parseWeighted(text: string, limit: number) {
  const opts: TweetParseConfig = {
    ...(twitterConfigs.defaults as TweetParseConfig),
    maxWeightedTweetLength: limit,
  }
  return twitterText.parseTweet(text, opts)
}

// ── Minimal ErrorBoundary for Lexical ─────────────────────────────────────────

interface LexicalEBProps {
  children: JSX.Element
  onError: (error: Error) => void
}

class LexicalErrorBoundary extends React.Component<
  LexicalEBProps,
  { hasError: boolean }
> {
  constructor(props: LexicalEBProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(err: Error): void {
    this.props.onError(err)
  }

  render(): JSX.Element {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'var(--warn)', fontSize: 11, padding: 8 }}>
          Editor error — please reload.
        </div>
      )
    }
    return this.props.children
  }
}

// ── SeedContentPlugin ─────────────────────────────────────────────────────────

/**
 * Seeds the editor with `content` on mount and re-seeds whenever `content`
 * changes externally (e.g. after store import). Uses HISTORY_MERGE_TAG to
 * avoid polluting undo history.
 */
function SeedContentPlugin({
  content,
  seededRef,
}: {
  content: string
  seededRef: React.MutableRefObject<string | null>
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (seededRef.current === content) return
    seededRef.current = content

    editor.update(
      () => {
        const root = $getRoot()
        root.clear()
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode(content))
        root.append(paragraph)
      },
      { tag: 'history-merge' },
    )
  }, [editor, content, seededRef])

  return null
}

// ── FocusRegistrationPlugin ───────────────────────────────────────────────────

/**
 * Registers this editor as the last-focused one in InsertionContext on focus.
 */
function FocusRegistrationPlugin({
  onFocus,
}: {
  onFocus: (editor: LexicalEditor) => void
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const root = editor.getRootElement()
    if (!root) return

    function handleFocus() {
      onFocus(editor)
    }

    root.addEventListener('focus', handleFocus)
    return () => root.removeEventListener('focus', handleFocus)
  }, [editor, onFocus])

  return null
}

// ── HighlightOverlayPlugin ────────────────────────────────────────────────────

type CellKind = 'plain' | 'entity' | 'over'

/**
 * After each editor state change, repaints an overlay `<div>` positioned on top
 * of the contenteditable to highlight, in a single pass:
 *
 *   • **entities** — @mentions / #hashtags / $cashtags / URLs (via twitter-text
 *     `extractEntitiesWithIndices`) are repainted in amber `var(--warn)` (a text
 *     color change, no background), the monochrome-theme stand-in for X's links.
 *   • **over-limit** — code points past the weighted limit get amber
 *     `var(--over)` background + `var(--warn)` foreground; over-limit wins over
 *     an entity tint in the overlapping region.
 *
 * The overlay is `pointer-events: none; user-select: none` so it never disturbs
 * the caret. Everything is computed in **code-point** space (`Array.from`) so it
 * aligns with twitter-text's code-point indices and stays correct across astral
 * glyphs. Hidden entirely when there is nothing to highlight.
 */
function HighlightOverlayPlugin({
  limit,
  overlayRef,
}: {
  limit: number
  overlayRef: React.RefObject<HTMLDivElement | null>
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent()
        const overlay = overlayRef.current
        if (!overlay) return

        const cps = Array.from(text)
        const { weightedLength, validRangeEnd } = parseWeighted(text, limit)
        const overFrom = weightedLength > limit ? validRangeEnd : cps.length

        // Per-code-point classification.
        const kinds: CellKind[] = cps.map((_, i) =>
          i >= overFrom ? 'over' : 'plain',
        )
        // extractEntitiesWithIndices returns UTF-16 code-unit offsets; convert
        // them to code-point offsets so they line up with the `cps` array (they
        // diverge across astral/SMP glyphs — e.g. the "fancy font" styles).
        const entities = twitterText.extractEntitiesWithIndices(text)
        twitterText.modifyIndicesFromUTF16ToUnicode(text, entities)
        for (const e of entities) {
          const [start, end] = e.indices
          for (let i = start; i < end && i < kinds.length; i++) {
            if (kinds[i] === 'plain') kinds[i] = 'entity'
          }
        }

        // Nothing to paint → hide (keeps the plain editor untouched).
        if (!kinds.some((k) => k !== 'plain')) {
          overlay.style.display = 'none'
          overlay.innerHTML = ''
          return
        }

        // Coalesce runs of like-kind code points into styled spans.
        let html = ''
        let run = ''
        let runKind: CellKind = kinds[0] ?? 'plain'
        const flush = () => {
          if (run === '') return
          html += `<span style="${STYLE_FOR[runKind]}">${escapeHtml(run).replace(/\n/g, '<br/>')}</span>`
          run = ''
        }
        for (let i = 0; i < cps.length; i++) {
          if (kinds[i] !== runKind) {
            flush()
            runKind = kinds[i]
          }
          run += cps[i]
        }
        flush()

        overlay.style.display = 'block'
        overlay.innerHTML = html
      })
    })
  }, [editor, limit, overlayRef])

  return null
}

const STYLE_FOR: Record<CellKind, string> = {
  plain: 'color:transparent',
  // Entities repaint the editor text in amber (color change, no background) —
  // same opaque-overlay technique as the over-limit span.
  entity: 'color:var(--warn)',
  over: 'color:var(--warn);background:var(--over);border-radius:2px',
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── RulerGauge ────────────────────────────────────────────────────────────────

export function RulerGauge({
  weightedLength,
  limit,
  overLimit,
}: {
  weightedLength: number
  limit: number
  overLimit: boolean
}): JSX.Element {
  const pct = Math.min(weightedLength / limit, 1) * 100
  const remaining = limit - weightedLength
  const isNearLimit = pct >= 80
  const fillColor = overLimit ? 'var(--warn)' : isNearLimit ? 'var(--warn)' : 'var(--muted)'
  const countColor = overLimit ? 'var(--warn)' : isNearLimit ? 'var(--warn)' : 'var(--muted)'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--muted)',
      }}
    >
      {/* V7.4 ruler-gauge fill bar */}
      <div
        style={{
          width: 64,
          height: 9,
          alignSelf: 'center',
          background: `
            linear-gradient(${fillColor}, ${fillColor}) left center / ${pct}% 3px no-repeat,
            linear-gradient(var(--line), var(--line)) left center / 100% 1px no-repeat,
            repeating-linear-gradient(90deg, var(--muted) 0 1px, transparent 1px 8px) center / 100% 9px no-repeat
          `,
          transition: 'background 0.1s',
        }}
      />
      {/* Numeric count: shows remaining when over-limit, weighted length otherwise */}
      <span
        style={{
          color: countColor,
          fontWeight: overLimit ? 700 : 400,
          minWidth: 28,
          textAlign: 'right',
          transition: 'color 0.1s',
        }}
      >
        {overLimit ? remaining : weightedLength}
      </span>
    </div>
  )
}

// ── EditableTextBody ────────────────────────────────────────────────────────────

/**
 * The Lexical editing body + highlight overlay, with NO surrounding card chrome
 * (header / footer are the caller's job). Plain text is canonical: `content`
 * seeds the editor and `onChangeText` fires with the live plain text on every
 * change. `id` is the Lexical namespace (unique per card).
 */
export function EditableTextBody({
  id,
  content,
  limit,
  ariaLabel,
  onChangeText,
}: {
  id: string
  content: string
  limit: number
  ariaLabel: string
  onChangeText: (text: string) => void
}): JSX.Element {
  const { registerEditor } = useInsertion()

  // Ref tracking the last content we seeded into Lexical — prevents infinite
  // re-seeding when our own onChange updates the store.
  const seededRef = useRef<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent()
        // Stamp the seeded ref so SeedContentPlugin doesn't loop.
        seededRef.current = text
        onChangeText(text)
      })
    },
    [onChangeText],
  )

  const handleFocus = useCallback(
    (editor: LexicalEditor) => registerEditor(editor),
    [registerEditor],
  )

  const initialConfig = {
    namespace: id,
    onError: (err: Error) => { console.error('EditableTextBody Lexical error:', err) },
    editorState: null as null,
  }

  return (
    <div style={{ position: 'relative', padding: '10px 12px' }}>
      <LexicalComposer initialConfig={initialConfig}>
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              aria-label={ariaLabel}
              style={{
                outline: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 13.5,
                color: 'var(--fg)',
                lineHeight: 1.55,
                minHeight: 72,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                position: 'relative',
                zIndex: 1,
              }}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <HistoryPlugin />
        <SeedContentPlugin content={content} seededRef={seededRef} />
        <FocusRegistrationPlugin onFocus={handleFocus} />
        <HighlightOverlayPlugin limit={limit} overlayRef={overlayRef} />
      </LexicalComposer>

      {/* Amber over-limit / entity overlay — pointer-events:none so editor stays clickable */}
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{
          display: 'none',
          position: 'absolute',
          inset: '10px 12px',
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 2,
        }}
      />
    </div>
  )
}
