/**
 * Domain types for Tweet Typer.
 *
 * Decisions locked in:
 *   .scratch/tweet-typer/issues/03-localstorage-schema.md (Resolution)
 *   docs/adr/0001-localstorage-persistence-schema.md
 *
 * All entities carry a nanoid `id` plus `createdAt`/`updatedAt` epoch-millis.
 * Child order is held as ID-arrays on the parent (Project → threadIds, Thread → postIds).
 * Projects are flat — no nesting.
 */

// ── Base ─────────────────────────────────────────────────────────────────────

export interface Entity {
  id: string
  createdAt: number
  updatedAt: number
}

// ── Domain entities ──────────────────────────────────────────────────────────

export interface Project extends Entity {
  name: string
  /** Ordered list of Thread IDs belonging to this project. */
  threadIds: string[]
  /**
   * When true the project may not be deleted or renamed.
   * Exactly one project (the seed "Unfiled") carries this flag.
   */
  isDefault: boolean
}

export interface Thread extends Entity {
  title: string
  /** ID of the owning Project — every Thread belongs to exactly one Project. */
  projectId: string
  /** Ordered list of Post IDs in this thread. */
  postIds: string[]
}

export interface Post extends Entity {
  /** ID of the owning Thread. */
  threadId: string
  /** Raw text content of the post (Lexical serialised state stored separately by the editor). */
  content: string
}

export interface Template extends Entity {
  name: string
  content: string
  /**
   * Sort position in the (flat) templates list, ascending. Renormalized to
   * 0..n-1 on every reorder. Templates have no parent to hold an order array,
   * so ordering lives on the entity itself.
   */
  order: number
}

export interface Settings extends Entity {
  /** Any future settings fields go here. */
  [key: string]: unknown
}

// ── Symbols store ────────────────────────────────────────────────────────────

/** Persisted under `tt:symbols`. Recents is capped at 24. */
export interface SymbolsStore {
  favorites: string[]
  /** Insertion-ordered; most-recent first; capped at 24. */
  recents: string[]
}

// ── Normalized collection maps ────────────────────────────────────────────────

export type ProjectMap  = Record<string, Project>
export type ThreadMap   = Record<string, Thread>
export type PostMap     = Record<string, Post>
export type TemplateMap = Record<string, Template>

// ── Export/import envelope ───────────────────────────────────────────────────

export interface ExportEnvelope {
  format: 'tweet-typer-export'
  schemaVersion: number
  exportedAt: number
  data: {
    projects:  ProjectMap
    threads:   ThreadMap
    posts:     PostMap
    templates: TemplateMap
    settings:  Settings
    symbols:   SymbolsStore
  }
}
