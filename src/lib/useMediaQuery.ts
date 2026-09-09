/**
 * useMediaQuery — subscribe a component to a CSS media query (ticket 18).
 *
 * The responsive spec (#16/#17) flips the whole shell at a single 768px
 * breakpoint, and the two layouts are structurally different (the mobile layout
 * reparents the symbol browser into an in-editor glyph dock, which pure CSS
 * can't do), so we branch in React on the query result rather than in CSS.
 *
 * @example
 *   const isMobile = useMediaQuery('(max-width: 767px)')
 */
import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    // SSR fallback (unused in this client-only app) — assume desktop.
    () => false,
  )
}

/** The single responsive breakpoint for the whole app (#16). */
export const MOBILE_QUERY = '(max-width: 767px)'
