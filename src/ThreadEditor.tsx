/**
 * Thread editor — center pane (ticket 10).
 *
 * Renders a vertical stack of PostEditor cards for the selected thread.
 * Shows an empty state when no thread is selected.
 *
 * When a Template is selected in the navigator instead of a thread (ticket 12,
 * "a template behaves like a Post"), this pane defers to <TemplateEditor/> —
 * the same editing surface, one card, editing the template's content.
 *
 * Features:
 *   • Add / remove / reorder Posts within the thread.
 *   • Each Post uses a Lexical contenteditable; plain text is canonical.
 *   • Weighted counting via twitter-text parseTweet (maxWeightedTweetLength
 *     from state.settings.charLimit, default 280).
 *   • Ruler-gauge counter (V7.4 amber fill bar).
 *   • Inline highlight overlay: @/#/$/URL entity tint + over-limit amber shading.
 *   • Last-focused editor registered in InsertionContext for ticket #11/#12.
 *
 * The Lexical body + counter live in the shared WeightedTextEditor module so the
 * Post and Template editors stay identical.
 */

import {
  useCallback,
  useEffect,
  useState,
  type DragEvent,
  type JSX,
} from 'react'

import { useStore } from './lib/StoreContext.tsx'
import { useSelection } from './lib/SelectionContext.tsx'
import type { Post } from './lib/types.ts'
import {
  POST_MIME,
  dropHalf,
  dropShadow,
  type DropHalf,
} from './lib/dnd.ts'
import {
  EditableTextBody,
  RulerGauge,
  parseWeighted,
} from './WeightedTextEditor.tsx'
import { TemplateEditor } from './TemplateEditor.tsx'

// ── PostEditor ────────────────────────────────────────────────────────────────

interface PostEditorProps {
  post: Post
  index: number
  total: number
  limit: number
  onReorder: (draggedId: string, half: DropHalf) => void
  onDelete: () => void
}

function PostEditor({
  post,
  index,
  total,
  limit,
  onReorder,
  onDelete,
}: PostEditorProps): JSX.Element {
  const { updatePost } = useStore()

  const [dragOver, setDragOver] = useState<DropHalf | null>(null)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)

  // Live text for the counter (separate from the Lexical editor state).
  const [liveText, setLiveText] = useState(post.content)

  // Re-sync liveText when the store's post.content changes externally
  // (e.g. after import). The EditableTextBody will also re-seed the editor.
  useEffect(() => {
    setLiveText(post.content)
  }, [post.content])

  const parsed = parseWeighted(liveText, limit)
  const { weightedLength } = parsed
  // Over-limit is a pure length check. twitter-text reports `valid: false` for
  // an *empty* post too, so `!valid` would wrongly flag a blank post as over.
  const overLimit = weightedLength > limit

  const handleChangeText = useCallback(
    (text: string) => {
      setLiveText(text)
      // Write back to the store — debounced at store layer.
      updatePost(post.id, text)
    },
    [post.id, updatePost],
  )

  // ── Output controls (ticket 14) ─────────────────────────────────────────────
  // Copy the Post's plain text; flash "copied" for 1.5 s (mirrors TemplateEditor).
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(liveText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable (insecure context / denied) — silently ignore.
    }
  }, [liveText])

  // "Open in X" intent link — X's web composer prefilled with the Post text.
  const intentHref = `https://x.com/intent/post?text=${encodeURIComponent(liveText)}`
  const isEmpty = liveText.trim() === ''

  // ── Drag to reorder (within this thread only) ───────────────────────────────
  function handleDragStart(e: DragEvent) {
    e.dataTransfer.setData(POST_MIME, post.id)
    e.dataTransfer.effectAllowed = 'move'
    setDragging(true)
  }

  function handleDragOver(e: DragEvent) {
    if (!e.dataTransfer.types.includes(POST_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(dropHalf(e))
  }

  // Only clear when the pointer truly leaves the card — dragleave also fires
  // when moving onto a child element, which would otherwise flicker the
  // drop indicator on/off.
  function handleDragLeave(e: DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setDragOver(null)
  }

  function handleDrop(e: DragEvent) {
    if (!e.dataTransfer.types.includes(POST_MIME)) return
    e.preventDefault()
    e.stopPropagation()
    const half = dragOver ?? dropHalf(e)
    setDragOver(null)
    const draggedId = e.dataTransfer.getData(POST_MIME)
    if (!draggedId || draggedId === post.id) return
    onReorder(draggedId, half)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        opacity: dragging ? 0.4 : 1,
        boxShadow: dropShadow(dragOver),
      }}
    >
      {/* Post header — drag handle + position label + delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: '5px 8px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {/* drag handle — only this grip starts a drag (reorders within thread) */}
        <span
          draggable
          onDragStart={handleDragStart}
          onDragEnd={() => { setDragging(false); setDragOver(null) }}
          aria-label="Drag handle — drag to reorder post"
          title="Drag to reorder"
          style={{ fontSize: 11, opacity: 0.5, cursor: 'grab', marginRight: 2 }}
        >
          ⠿
        </span>

        <span
          className="label-mono"
          style={{ flex: 1, fontSize: 9, opacity: 0.55 }}
        >
          {index + 1} / {total}
        </span>

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

      {/* Editor body */}
      <EditableTextBody
        id={`post-${post.id}`}
        content={post.content}
        limit={limit}
        ariaLabel={`Post ${index + 1} editor`}
        onChangeText={handleChangeText}
      />

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
          aria-label="Copy post to clipboard"
          title="Copy to clipboard"
          disabled={isEmpty}
          onClick={() => void handleCopy()}
        >
          ⧉ copy
        </button>
        <a
          className={`chip${isEmpty ? ' chip--disabled' : ''}`}
          href={isEmpty ? undefined : intentHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open post in X composer"
          title="Open in X"
          aria-disabled={isEmpty || undefined}
          onClick={(e) => { if (isEmpty) e.preventDefault() }}
        >
          ↗ 𝕏
        </a>
      </footer>
    </div>
  )
}

// ── ThreadEditor (center pane root export) ────────────────────────────────────

export function ThreadEditor(): JSX.Element {
  const { state, createPost, deletePost, reorderPost } = useStore()
  const { selectedThreadId, selectedTemplateId } = useSelection()

  const limit =
    (state.settings as Record<string, unknown>)['charLimit'] as number | undefined ?? 280

  // A selected template takes over the pane and behaves like a Post (#12).
  // Keyed on the id so switching templates remounts with a fresh local draft.
  if (selectedTemplateId) {
    return <TemplateEditor key={selectedTemplateId} limit={limit} />
  }

  const thread = selectedThreadId ? state.threads[selectedThreadId] : null
  const posts = thread
    ? (thread.postIds.map((id) => state.posts[id]).filter(Boolean) as Post[])
    : []

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
              onReorder={(draggedId, half) => {
                const fromIndex = posts.findIndex((p) => p.id === draggedId)
                if (fromIndex === -1) return
                // Insert-before this row, or -after == before the next slot.
                const insertAt = half === 'before' ? idx : idx + 1
                // reorderPost's toIndex is measured after removal, so shift down
                // by one when the dragged post sat before the insertion point.
                const toIndex = fromIndex < insertAt ? insertAt - 1 : insertAt
                reorderPost(thread.id, fromIndex, toIndex)
              }}
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
