/**
 * React binding for the Tweet Typer store.
 *
 * Usage:
 *   • Wrap the app in `<StoreProvider>` (done in App.tsx).
 *   • Call `useStore()` in any component to get the current state snapshot
 *     and the full API surface.
 *
 * The hook re-renders only when the store state object reference changes
 * (i.e. after any mutation). The API functions are stable references.
 */

import {
  createContext,
  use,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  addFavorite,
  addRecent,
  createPost,
  createProject,
  createTemplate,
  createThread,
  deletePost,
  deleteProject,
  deleteTemplate,
  deleteThread,
  exportStore,
  forceFlush,
  getDefaultProjectId,
  getState,
  hydrate,
  importStore,
  onQuotaWarning,
  removeFavorite,
  renameProject,
  subscribe,
  updatePost,
  updateSettings,
  updateTemplate,
  updateThread,
  type QuotaWarning,
  type StoreState,
} from './store.ts'

// ── API surface ───────────────────────────────────────────────────────────────

/** All stable store API functions exposed through context. */
export interface StoreAPI {
  // Read
  state: StoreState
  getDefaultProjectId: typeof getDefaultProjectId

  // Projects
  createProject: typeof createProject
  renameProject: typeof renameProject
  deleteProject: typeof deleteProject

  // Threads
  createThread: typeof createThread
  updateThread: typeof updateThread
  deleteThread: typeof deleteThread

  // Posts
  createPost: typeof createPost
  updatePost: typeof updatePost
  deletePost: typeof deletePost

  // Templates
  createTemplate: typeof createTemplate
  updateTemplate: typeof updateTemplate
  deleteTemplate: typeof deleteTemplate

  // Settings
  updateSettings: typeof updateSettings

  // Symbols
  addFavorite:    typeof addFavorite
  removeFavorite: typeof removeFavorite
  addRecent:      typeof addRecent

  // Export / Import
  exportStore: typeof exportStore
  importStore: typeof importStore
  forceFlush:  typeof forceFlush

  // Quota warnings
  quotaWarning: QuotaWarning | null
}

// ── Context ───────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreAPI | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Mount once at the app root.
 * Hydrates the store on first render (no-op if already hydrated).
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeState, setStoreState] = useState<StoreState>(() => {
    hydrate()
    return getState()
  })

  const [quotaWarning, setQuotaWarning] = useState<QuotaWarning | null>(null)

  useEffect(() => {
    const unsubState = subscribe((next) => setStoreState(next))
    const unsubQuota = onQuotaWarning((w) => setQuotaWarning(w))
    return () => {
      unsubState()
      unsubQuota()
    }
  }, [])

  const api: StoreAPI = {
    state: storeState,
    getDefaultProjectId,
    createProject,
    renameProject,
    deleteProject,
    createThread,
    updateThread,
    deleteThread,
    createPost,
    updatePost,
    deletePost,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    updateSettings,
    addFavorite,
    removeFavorite,
    addRecent,
    exportStore,
    importStore,
    forceFlush,
    quotaWarning,
  }

  return (
    <StoreContext value={api}>
      {children}
    </StoreContext>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Access the store state and full API from any component inside `<StoreProvider>`.
 *
 * @example
 *   const { state, createThread } = useStore()
 *   const projects = Object.values(state.projects)
 */
export function useStore(): StoreAPI {
  const ctx = use(StoreContext)
  if (ctx === null) {
    throw new Error('useStore must be called inside <StoreProvider>')
  }
  return ctx
}
