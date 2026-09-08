/**
 * Thread editor — center pane (ticket 10).
 *
 * Renders a vertical stack of PostEditor cards for the selected thread.
 * Shows an empty state when no thread is selected.
 *
 * Features:
 *   • Add / remove / reorder Posts within the thread.
 *   • Each Post uses a Lexical contenteditable; plain text is canonical.
 *   • Weighted counting via twitter-text parseTweet (maxWeightedTweetLength
 *     from state.settings.charLimit, default 280).
 *   • Ruler-gauge counter (V7.4 amber fill bar).
 *   • Inline over-limit amber shading via OverLimitHighlightPlugin.
 *   • Last-focused editor registered in InsertionContext for ticket #11/#12.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
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

import { useStore } from './lib/StoreContext.tsx'
import { useSelection } from './lib/SelectionContext.tsx'
import { useInsertion } from './lib/InsertionContext.tsx'
import type { Post } from './lib/types.ts'

// ── twitter-text helpers ──────────────────────────────────────────────────────

const twitterConfigs = twitterText.configs
import type { TweetParseConfig } from 'twitter-text'

function parseWeighted(text: string, limit: number) {
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

// ── OverLimitHighlightPlugin ─────────────────────────────────────────────────

/**
 * After each editor state change, updates an amber overlay `<div>` positioned
 * on top of the contenteditable to highlight text beyond the weighted limit.
 *
 * Implementation: the overlay is `pointer-events: none; user-select: none`
 * so it doesn't interfere with cursor placement. The "safe" text portion is
 * rendered transparent (editor text shows through); the "over" portion gets
 * `var(--over)` background + `var(--warn)` foreground.
 */
function OverLimitHighlightPlugin({
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
        const { weightedLength, validRangeEnd } = parseWeighted(text, limit)

        const overlay = overlayRef.current
        if (!overlay) return

        // Over-limit is a length check, NOT `!valid`: twitter-text also reports
        // `valid: false` for an empty tweet, which is not over-limit.
        if (weightedLength <= limit) {
          overlay.style.display = 'none'
          return
        }

        // validRangeEnd is a UTF-16 index into the raw text string.
        const safe = text.slice(0, validRangeEnd)
        const over = text.slice(validRangeEnd)

        // The "safe" span is transparent so the real editor text shows through.
        // The "over" span has amber background and foreground.
        const safeHtml = escapeHtml(safe).replace(/\n/g, '<br/>')
        const overHtml = escapeHtml(over).replace(/\n/g, '<br/>')

        overlay.style.display = 'block'
        overlay.innerHTML = `<span style="color:transparent">${safeHtml}</span><span style="background:var(--over);color:var(--warn);border-radius:2px">${overHtml}</span>`
      })
    })
  }, [editor, limit, overlayRef])

  return null
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── RulerGauge ────────────────────────────────────────────────────────────────

function RulerGauge({
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

// ── PostEditor ────────────────────────────────────────────────────────────────

interface PostEditorProps {
  post: Post
  index: number
  total: number
  limit: number
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

function PostEditor({
  post,
  index,
  total,
  limit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: PostEditorProps): JSX.Element {
  const { updatePost } = useStore()
  const { registerEditor } = useInsertion()

  // Live text for the counter (separate from the Lexical editor state).
  const [liveText, setLiveText] = useState(post.content)

  // Ref tracking the last content we seeded into Lexical — prevents infinite
  // re-seeding when our own onChange updates the store.
  const seededRef = useRef<string | null>(null)

  // Re-sync liveText when the store's post.content changes externally
  // (e.g. after import). The SeedContentPlugin will also re-seed the editor.
  useEffect(() => {
    setLiveText(post.content)
  }, [post.content])

  const parsed = parseWeighted(liveText, limit)
  const { weightedLength } = parsed
  // Over-limit is a pure length check. twitter-text reports `valid: false` for
  // an *empty* post too, so `!valid` would wrongly flag a blank post as over.
  const overLimit = weightedLength > limit

  const overlayRef = useRef<HTMLDivElement>(null)

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent()
        // Update local counter immediately.
        setLiveText(text)
        // Stamp the seeded ref so SeedContentPlugin doesn't loop.
        seededRef.current = text
        // Write back to the store — debounced at store layer.
        updatePost(post.id, text)
      })
    },
    [post.id, updatePost],
  )

  const handleFocus = useCallback(
    (editor: LexicalEditor) => {
      registerEditor(editor)
    },
    [registerEditor],
  )

  const isFirst = index === 0
  const isLast = index === total - 1

  const initialConfig = {
    namespace: `post-${post.id}`,
    onError: (err: Error) => { console.error('PostEditor Lexical error:', err) },
    editorState: null as null,
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {/* Post header — position label + reorder + delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: '5px 8px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <span
          className="label-mono"
          style={{ flex: 1, fontSize: 9, opacity: 0.55 }}
        >
          {index + 1} / {total}
        </span>

        <button
          type="button"
          aria-label="Move post up"
          className="icon-btn"
          disabled={isFirst}
          onClick={onMoveUp}
          style={{ fontSize: 9 }}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="Move post down"
          className="icon-btn"
          disabled={isLast}
          onClick={onMoveDown}
          style={{ fontSize: 9 }}
        >
          ▼
        </button>
        <button
          type="button"
          aria-label="Delete post"
          className="icon-btn icon-btn--danger"
          onClick={onDelete}
          style={{ fontSize: 10 }}
        >
          ×
        </button>
      </div>

      {/* Editor body — positioned wrapper for overlay */}
      <div style={{ position: 'relative', padding: '10px 12px' }}>
        <LexicalComposer initialConfig={initialConfig}>
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                aria-label={`Post ${index + 1} editor`}
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
          <SeedContentPlugin content={post.content} seededRef={seededRef} />
          <FocusRegistrationPlugin onFocus={handleFocus} />
          <OverLimitHighlightPlugin limit={limit} overlayRef={overlayRef} />
        </LexicalComposer>

        {/* Amber over-limit overlay — pointer-events:none so editor stays clickable */}
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

      {/* Post footer — ruler gauge */}
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
      </footer>
    </div>
  )
}

// ── ThreadEditor (center pane root export) ────────────────────────────────────

export function ThreadEditor(): JSX.Element {
  const { state, createPost, deletePost, reorderPost } = useStore()
  const { selectedThreadId } = useSelection()

  const thread = selectedThreadId ? state.threads[selectedThreadId] : null
  const posts = thread
    ? (thread.postIds.map((id) => state.posts[id]).filter(Boolean) as Post[])
    : []

  const limit =
    (state.settings as Record<string, unknown>)['charLimit'] as number | undefined ?? 280

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!thread) {
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
          — no thread selected —
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--muted)',
            letterSpacing: '0.06em',
          }}
        >
          Select a thread in the navigator to begin editing.
        </div>
      </div>
    )
  }

  function handleAddPost() {
    if (!selectedThreadId) return
    createPost(selectedThreadId, '')
  }

  return (
    <>
      {/* Thread title bar */}
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
          <span style={{ color: 'var(--accent)' }}>▸</span>
          {' '}
          <span style={{ color: 'var(--fg)', opacity: 0.85 }}>
            {thread.title.trim() === '' ? '(untitled)' : thread.title}
          </span>
          {' '}
          <span style={{ opacity: 0.4 }}>
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          type="button"
          aria-label="Add post"
          className="chip chip--accent"
          onClick={handleAddPost}
        >
          + post
        </button>
      </div>

      {/* Ruler hairline */}
      <div className="ruler" style={{ marginBottom: 12 }} />

      {/* Post stack */}
      {posts.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '32px 16px',
            opacity: 0.4,
          }}
        >
          <div className="label-mono" style={{ fontSize: 10 }}>
            — empty thread —
          </div>
          <button
            type="button"
            className="chip chip--accent"
            onClick={handleAddPost}
          >
            + add first post
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map((post, idx) => (
            <PostEditor
              key={post.id}
              post={post}
              index={idx}
              total={posts.length}
              limit={limit}
              onMoveUp={() => reorderPost(thread.id, idx, idx - 1)}
              onMoveDown={() => reorderPost(thread.id, idx, idx + 1)}
              onDelete={() => deletePost(post.id)}
            />
          ))}

          {/* Add another post link */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
            <button
              type="button"
              className="chip"
              onClick={handleAddPost}
              style={{ opacity: 0.65 }}
            >
              + post
            </button>
          </div>
        </div>
      )}
    </>
  )
}
