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
export const FAVORITE_MIME = 'application/x-tt-favorite'

export type DropHalf = 'before' | 'after'

/** Which axis a drop target lays out along — vertical rows vs a horizontal grid. */
export type DropAxis = 'y' | 'x'

/**
 * Which half of a target the pointer is over — decides insert-before vs -after.
 * Vertical lists split on Y (the default); grid cells split on X.
 */
export function dropHalf(e: DragEvent, axis: DropAxis = 'y'): DropHalf {
  const rect = e.currentTarget.getBoundingClientRect()
  if (axis === 'x') {
    return e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
  }
  return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

/** Drop-indicator hairline: an inset accent line on the leading/trailing edge. */
export function dropShadow(half: DropHalf | null, axis: DropAxis = 'y'): string | undefined {
  if (axis === 'x') {
    if (half === 'before') return 'inset 2px 0 0 0 var(--accent)'
    if (half === 'after') return 'inset -2px 0 0 0 var(--accent)'
    return undefined
  }
  if (half === 'before') return 'inset 0 2px 0 0 var(--accent)'
  if (half === 'after') return 'inset 0 -2px 0 0 var(--accent)'
  return undefined
}
