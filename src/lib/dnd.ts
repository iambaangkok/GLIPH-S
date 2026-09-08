/**
 * Shared native-HTML5 drag-and-drop helpers for the navigator (threads /
 * templates) and the thread editor (posts).
 *
 * Custom MIME types let a drop zone tell *what kind* of thing is being dragged
 * during `dragover` — when `dataTransfer.getData` is unreadable and only
 * `dataTransfer.types` is exposed — so e.g. a project only accepts thread drags.
 */

import type { DragEvent } from 'react'

export const THREAD_MIME = 'application/x-tt-thread'
export const TEMPLATE_MIME = 'application/x-tt-template'
export const POST_MIME = 'application/x-tt-post'

export type DropHalf = 'before' | 'after'

/** Which half of a row the pointer is over — decides insert-before vs -after. */
export function dropHalf(e: DragEvent): DropHalf {
  const rect = e.currentTarget.getBoundingClientRect()
  return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

/** Drop-indicator hairline: an inset accent line on the leading/trailing edge. */
export function dropShadow(half: DropHalf | null): string | undefined {
  if (half === 'before') return 'inset 0 2px 0 0 var(--accent)'
  if (half === 'after') return 'inset 0 -2px 0 0 var(--accent)'
  return undefined
}
