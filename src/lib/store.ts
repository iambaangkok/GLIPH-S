/**
 * Normalized in-memory store + typed API for Tweet Typer.
 *
 * Architecture (locked in ADR-0001):
 *   • In-memory state is authoritative; localStorage is the sync target.
 *   • localStorage is read ONCE on `hydrate()` (boot).
 *   • Writes are debounced 250 ms per touched collection and force-flushed
 *     on `visibilitychange` (hidden) and `beforeunload`.
 *   • `StorageQuotaError` is caught → warn + preserve in-memory + surface.
 *   • `symbols.recents` is capped at 24.
 *   • "Unfiled" default Project is seeded on first load and is non-deletable
 *     and non-renameable.
 *
 * Primitives (`storageGet`, `storageSet`, …) are imported from `./storage.ts`
 * and never duplicated here.
 */

import { nanoid } from 'nanoid'
import {
  SCHEMA_VERSION,
  StorageKey,
  StorageQuotaError,
  storageGet,
  storageSet,
  writeSchemaVersion,
} from './storage.ts'
import { runMigrations, migrateEnvelope } from './migrate.ts'
import type {
  ExportEnvelope,
  Post,
  PostMap,
  Project,
  ProjectMap,
  Settings,
  SymbolsStore,
  Template,
  TemplateMap,
  Thread,
  ThreadMap,
} from './types.ts'

// ── Constants ────────────────────────────────────────────────────────────────

const UNFILED_NAME    = 'Unfiled'
const RECENTS_CAP     = 24
const DEBOUNCE_MS     = 250

// ── Helpers ───────────────────────────────────────────────────────────────────

function now(): number {
  return Date.now()
}

function makeId(): string {
  return nanoid()
}

function makeBase() {
  const ts = now()
  return { id: makeId(), createdAt: ts, updatedAt: ts }
}

// ── State ────────────────────────────────────────────────────────────────────

export interface StoreState {
  projects:  ProjectMap
  threads:   ThreadMap
  posts:     PostMap
  templates: TemplateMap
  settings:  Settings
  symbols:   SymbolsStore
}

let state: StoreState = {
  projects:  {},
  threads:   {},
  posts:     {},
  templates: {},
  settings:  { ...makeBase() },
  symbols:   { favorites: [], recents: [] },
}

// ── Change listeners ──────────────────────────────────────────────────────────

type Listener = (next: StoreState) => void
const listeners = new Set<Listener>()

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  for (const fn of listeners) fn(state)
}

/** Return a snapshot of the current store state. */
export function getState(): StoreState {
  return state
}

// ── Dirty-collection tracking + debounced flush ───────────────────────────────

type CollectionKey = 'projects' | 'threads' | 'posts' | 'templates' | 'settings' | 'symbols'

const dirty = new Set<CollectionKey>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/** Surface quota errors to subscribers without losing in-memory data. */
export type QuotaWarning = { collection: string; error: StorageQuotaError }
const quotaListeners = new Set<(w: QuotaWarning) => void>()

export function onQuotaWarning(fn: (w: QuotaWarning) => void): () => void {
  quotaListeners.add(fn)
  return () => quotaListeners.delete(fn)
}

function writeCollection(col: CollectionKey): void {
  const keyMap: Record<CollectionKey, StorageKey> = {
    projects:  StorageKey.projects,
    threads:   StorageKey.threads,
    posts:     StorageKey.posts,
    templates: StorageKey.templates,
    settings:  StorageKey.settings,
    symbols:   StorageKey.symbols,
  }
  try {
    storageSet(keyMap[col], state[col])
  } catch (err) {
    if (err instanceof StorageQuotaError) {
      const warning: QuotaWarning = { collection: col, error: err }
      for (const fn of quotaListeners) fn(warning)
      // Do NOT drop in-memory data; just skip the write.
    } else {
      throw err
    }
  }
}

function flush(): void {
  for (const col of dirty) {
    writeCollection(col)
  }
  dirty.clear()
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function markDirty(col: CollectionKey): void {
  dirty.add(col)
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flush, DEBOUNCE_MS)
}

// ── Lifecycle hooks (visibilitychange / beforeunload) ─────────────────────────

let lifecycleAttached = false

function attachLifecycle(): void {
  if (lifecycleAttached || typeof window === 'undefined') return
  lifecycleAttached = true

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('beforeunload', () => {
    flush()
  })
}

// ── Mutation helpers ──────────────────────────────────────────────────────────

function mutate(col: CollectionKey, fn: () => void): void {
  fn()
  // Mint a fresh top-level state reference so React's useState bailout
  // (Object.is on the snapshot) does not swallow the re-render. Mutations
  // above edit the collections in place; this makes the change observable.
  state = { ...state }
  markDirty(col)
  notify()
}

// ── Seeding ───────────────────────────────────────────────────────────────────

/**
 * Ensure the mandatory "Unfiled" default Project exists.
 * Called on first load when the projects collection is empty.
 */
function seedUnfiled(): Project {
  const ts = now()
  const project: Project = {
    id:        makeId(),
    name:      UNFILED_NAME,
    threadIds: [],
    isDefault: true,
    createdAt: ts,
    updatedAt: ts,
  }
  state.projects[project.id] = project
  markDirty('projects')
  return project
}

function ensureUnfiled(): void {
  const hasDefault = Object.values(state.projects).some((p) => p.isDefault)
  if (!hasDefault) seedUnfiled()
}

// ── Hydration ──────────────────────────────────────────────────────────────────

/**
 * Read the store from localStorage (once, at boot).
 * Runs migrations first, then seeds "Unfiled" if needed.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
let hydrated = false

export function hydrate(): void {
  if (hydrated) return
  hydrated = true

  // Run migration runner (no-op at v1).
  runMigrations()

  const projects  = storageGet<ProjectMap>(StorageKey.projects)
  const threads   = storageGet<ThreadMap>(StorageKey.threads)
  const posts     = storageGet<PostMap>(StorageKey.posts)
  const templates = storageGet<TemplateMap>(StorageKey.templates)
  const settings  = storageGet<Settings>(StorageKey.settings)
  const symbols   = storageGet<SymbolsStore>(StorageKey.symbols)

  state = {
    projects:  projects  ?? {},
    threads:   threads   ?? {},
    posts:     posts     ?? {},
    templates: templates ?? {},
    settings:  settings  ?? { ...makeBase() },
    symbols:   symbols   ?? { favorites: [], recents: [] },
  }

  // Write schema version if this is a first-ever load.
  writeSchemaVersion(SCHEMA_VERSION)

  ensureUnfiled()
  attachLifecycle()
  notify()
}

/** Reset hydration state (for tests only). */
export function _resetHydration(): void {
  hydrated = false
  lifecycleAttached = false
  state = {
    projects:  {},
    threads:   {},
    posts:     {},
    templates: {},
    settings:  { ...makeBase() },
    symbols:   { favorites: [], recents: [] },
  }
  dirty.clear()
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

// ── Project CRUD ──────────────────────────────────────────────────────────────

/**
 * Return the mandatory "Unfiled" project id.
 */
export function getDefaultProjectId(): string {
  const found = Object.values(state.projects).find((p) => p.isDefault)
  if (!found) throw new Error('Unfiled project missing — store is corrupt')
  return found.id
}

/**
 * Create a new Project.
 */
export function createProject(name: string): Project {
  const project: Project = { ...makeBase(), name, threadIds: [], isDefault: false }
  mutate('projects', () => { state.projects[project.id] = project })
  return project
}

/**
 * Rename a Project.
 * Throws if the project is the default "Unfiled" project.
 */
export function renameProject(id: string, name: string): Project {
  const project = state.projects[id]
  if (!project) throw new Error(`Project ${id} not found`)
  if (project.isDefault) throw new Error('Cannot rename the default Unfiled project')
  const updated = { ...project, name, updatedAt: now() }
  mutate('projects', () => { state.projects[id] = updated })
  return updated
}

/**
 * Delete a Project.
 * Throws if it is the only project or the default "Unfiled" project.
 * All threads (and their posts) belonging to the project are also deleted.
 */
export function deleteProject(id: string): void {
  const project = state.projects[id]
  if (!project) throw new Error(`Project ${id} not found`)
  if (project.isDefault) throw new Error('Cannot delete the default Unfiled project')
  if (Object.keys(state.projects).length <= 1) {
    throw new Error('Cannot delete the last project')
  }

  const threadIdsToDelete = [...project.threadIds]
  const postIdsToDelete: string[] = []

  for (const tid of threadIdsToDelete) {
    const thread = state.threads[tid]
    if (thread) postIdsToDelete.push(...thread.postIds)
  }

  mutate('projects', () => { delete state.projects[id] })
  mutate('threads', () => {
    for (const tid of threadIdsToDelete) delete state.threads[tid]
  })
  mutate('posts', () => {
    for (const pid of postIdsToDelete) delete state.posts[pid]
  })
}

// ── Thread CRUD ───────────────────────────────────────────────────────────────

/**
 * Create a Thread in a Project.
 */
export function createThread(projectId: string, title: string = ''): Thread {
  const project = state.projects[projectId]
  if (!project) throw new Error(`Project ${projectId} not found`)

  const thread: Thread = { ...makeBase(), title, projectId, postIds: [] }

  mutate('threads', () => { state.threads[thread.id] = thread })
  mutate('projects', () => {
    state.projects[projectId] = {
      ...project,
      threadIds: [...project.threadIds, thread.id],
      updatedAt: now(),
    }
  })
  return thread
}

/**
 * Update thread metadata (title).
 */
export function updateThread(id: string, patch: Partial<Pick<Thread, 'title' | 'projectId'>>): Thread {
  const thread = state.threads[id]
  if (!thread) throw new Error(`Thread ${id} not found`)
  const updated = { ...thread, ...patch, updatedAt: now() }
  mutate('threads', () => { state.threads[id] = updated })
  return updated
}

/**
 * Delete a Thread and its Posts.
 */
export function deleteThread(id: string): void {
  const thread = state.threads[id]
  if (!thread) throw new Error(`Thread ${id} not found`)

  const project = state.projects[thread.projectId]

  mutate('threads', () => { delete state.threads[id] })
  mutate('posts', () => {
    for (const pid of thread.postIds) delete state.posts[pid]
  })
  if (project) {
    mutate('projects', () => {
      state.projects[project.id] = {
        ...project,
        threadIds: project.threadIds.filter((tid) => tid !== id),
        updatedAt: now(),
      }
    })
  }
}

/**
 * Reorder a Thread within its Project by moving it from one index to another.
 * Both indices are 0-based positions within `project.threadIds`.
 * No-op if fromIndex === toIndex or either index is out of range.
 */
export function reorderThread(projectId: string, fromIndex: number, toIndex: number): void {
  const project = state.projects[projectId]
  if (!project) throw new Error(`Project ${projectId} not found`)
  const ids = project.threadIds
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= ids.length ||
    toIndex >= ids.length
  ) return

  const next = [...ids]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)

  mutate('projects', () => {
    state.projects[projectId] = {
      ...project,
      threadIds: next,
      updatedAt: now(),
    }
  })
}

/**
 * Move a Thread to `toProjectId`, positioned immediately before
 * `beforeThreadId`, or appended when `beforeThreadId` is null.
 *
 * Handles both same-project reordering and cross-project moves (the drag-and-
 * drop path). On a cross-project move the thread's `projectId` is updated and it
 * is spliced out of the source project's `threadIds` and into the target's.
 * No-op when nothing changes.
 */
export function moveThread(
  threadId: string,
  toProjectId: string,
  beforeThreadId: string | null,
): void {
  if (threadId === beforeThreadId) return

  const thread = state.threads[threadId]
  if (!thread) throw new Error(`Thread ${threadId} not found`)
  const toProject = state.projects[toProjectId]
  if (!toProject) throw new Error(`Project ${toProjectId} not found`)
  const fromProject = state.projects[thread.projectId]
  if (!fromProject) throw new Error(`Project ${thread.projectId} not found`)

  if (fromProject.id === toProject.id) {
    const ids = fromProject.threadIds.filter((id) => id !== threadId)
    let insertAt = beforeThreadId === null ? ids.length : ids.indexOf(beforeThreadId)
    if (insertAt === -1) insertAt = ids.length
    ids.splice(insertAt, 0, threadId)

    // No-op guard.
    if (
      ids.length === fromProject.threadIds.length &&
      ids.every((id, i) => id === fromProject.threadIds[i])
    ) return

    mutate('projects', () => {
      state.projects[toProject.id] = { ...toProject, threadIds: ids, updatedAt: now() }
    })
    return
  }

  // Cross-project move.
  const srcIds = fromProject.threadIds.filter((id) => id !== threadId)
  const dstIds = [...toProject.threadIds]
  let insertAt = beforeThreadId === null ? dstIds.length : dstIds.indexOf(beforeThreadId)
  if (insertAt === -1) insertAt = dstIds.length
  dstIds.splice(insertAt, 0, threadId)

  mutate('projects', () => {
    state.projects[fromProject.id] = { ...fromProject, threadIds: srcIds, updatedAt: now() }
    state.projects[toProject.id] = { ...toProject, threadIds: dstIds, updatedAt: now() }
  })
  mutate('threads', () => {
    state.threads[threadId] = { ...thread, projectId: toProjectId, updatedAt: now() }
  })
}

/**
 * Reorder a Post within its Thread by moving it from one index to another.
 * Both indices are 0-based positions within `thread.postIds`.
 * No-op if fromIndex === toIndex or either index is out of range.
 */
export function reorderPost(threadId: string, fromIndex: number, toIndex: number): void {
  const thread = state.threads[threadId]
  if (!thread) throw new Error(`Thread ${threadId} not found`)
  const ids = thread.postIds
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= ids.length ||
    toIndex >= ids.length
  ) return

  const next = [...ids]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)

  mutate('threads', () => {
    state.threads[threadId] = {
      ...thread,
      postIds: next,
      updatedAt: now(),
    }
  })
}

// ── Post CRUD ─────────────────────────────────────────────────────────────────

/**
 * Create a Post in a Thread, appended at the end.
 */
export function createPost(threadId: string, content: string = ''): Post {
  const thread = state.threads[threadId]
  if (!thread) throw new Error(`Thread ${threadId} not found`)

  const post: Post = { ...makeBase(), threadId, content }

  mutate('posts', () => { state.posts[post.id] = post })
  mutate('threads', () => {
    state.threads[threadId] = {
      ...thread,
      postIds: [...thread.postIds, post.id],
      updatedAt: now(),
    }
  })
  return post
}

/**
 * Update a Post's content.
 */
export function updatePost(id: string, content: string): Post {
  const post = state.posts[id]
  if (!post) throw new Error(`Post ${id} not found`)
  const updated = { ...post, content, updatedAt: now() }
  mutate('posts', () => { state.posts[id] = updated })
  return updated
}

/**
 * Delete a Post.
 */
export function deletePost(id: string): void {
  const post = state.posts[id]
  if (!post) throw new Error(`Post ${id} not found`)

  const thread = state.threads[post.threadId]

  mutate('posts', () => { delete state.posts[id] })
  if (thread) {
    mutate('threads', () => {
      state.threads[thread.id] = {
        ...thread,
        postIds: thread.postIds.filter((pid) => pid !== id),
        updatedAt: now(),
      }
    })
  }
}

// ── Template CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a Template, appended at the end of the list.
 */
export function createTemplate(name: string, content: string): Template {
  const maxOrder = Object.values(state.templates).reduce(
    (m, t) => Math.max(m, t.order ?? 0),
    -1,
  )
  const template: Template = { ...makeBase(), name, content, order: maxOrder + 1 }
  mutate('templates', () => { state.templates[template.id] = template })
  return template
}

/**
 * Reorder a Template so it sits immediately before `beforeId`, or at the end of
 * the list when `beforeId` is null. Order values are renormalized to 0..n-1.
 * No-op when the resulting order is unchanged.
 */
export function reorderTemplate(templateId: string, beforeId: string | null): void {
  if (templateId === beforeId) return

  const currentIds = Object.values(state.templates)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id)

  if (!currentIds.includes(templateId)) return

  const nextIds = currentIds.filter((id) => id !== templateId)
  let insertAt = beforeId === null ? nextIds.length : nextIds.indexOf(beforeId)
  if (insertAt === -1) insertAt = nextIds.length
  nextIds.splice(insertAt, 0, templateId)

  // No-op guard — skip the write if nothing actually moved.
  if (nextIds.every((id, i) => id === currentIds[i])) return

  mutate('templates', () => {
    nextIds.forEach((id, i) => {
      const t = state.templates[id]
      if (t && t.order !== i) state.templates[id] = { ...t, order: i, updatedAt: now() }
    })
  })
}

/**
 * Update a Template.
 */
export function updateTemplate(id: string, patch: Partial<Pick<Template, 'name' | 'content'>>): Template {
  const template = state.templates[id]
  if (!template) throw new Error(`Template ${id} not found`)
  const updated = { ...template, ...patch, updatedAt: now() }
  mutate('templates', () => { state.templates[id] = updated })
  return updated
}

/**
 * Delete a Template.
 */
export function deleteTemplate(id: string): void {
  const template = state.templates[id]
  if (!template) throw new Error(`Template ${id} not found`)
  mutate('templates', () => { delete state.templates[id] })
}

// ── Settings ──────────────────────────────────────────────────────────────────

/**
 * Merge a partial settings patch into the current settings.
 */
export function updateSettings(patch: Partial<Settings>): Settings {
  const updated = { ...state.settings, ...patch, updatedAt: now() }
  mutate('settings', () => { state.settings = updated })
  return updated
}

// ── Symbols ───────────────────────────────────────────────────────────────────

/**
 * Add a symbol to favorites (idempotent).
 */
export function addFavorite(symbol: string): void {
  if (state.symbols.favorites.includes(symbol)) return
  mutate('symbols', () => {
    state.symbols = {
      ...state.symbols,
      favorites: [...state.symbols.favorites, symbol],
    }
  })
}

/**
 * Remove a symbol from favorites.
 */
export function removeFavorite(symbol: string): void {
  mutate('symbols', () => {
    state.symbols = {
      ...state.symbols,
      favorites: state.symbols.favorites.filter((s) => s !== symbol),
    }
  })
}

/**
 * Record a recently used symbol. Most-recent first; capped at 24.
 */
export function addRecent(symbol: string): void {
  mutate('symbols', () => {
    const filtered = state.symbols.recents.filter((s) => s !== symbol)
    state.symbols = {
      ...state.symbols,
      recents: [symbol, ...filtered].slice(0, RECENTS_CAP),
    }
  })
}

// ── Export / Import ───────────────────────────────────────────────────────────

/**
 * Serialize the entire store to an export envelope JSON string.
 */
export function exportStore(): string {
  const envelope: ExportEnvelope = {
    format:        'tweet-typer-export',
    schemaVersion: SCHEMA_VERSION,
    exportedAt:    now(),
    data: {
      projects:  state.projects,
      threads:   state.threads,
      posts:     state.posts,
      templates: state.templates,
      settings:  state.settings,
      symbols:   state.symbols,
    },
  }
  return JSON.stringify(envelope, null, 2)
}

/**
 * Replace the entire store with the contents of an export envelope.
 * Runs the migration runner on the envelope before committing.
 *
 * This is REPLACE semantics — all existing data is discarded.
 * The caller is responsible for confirming with the user before calling this.
 *
 * @throws {Error} if the envelope format is unrecognised or schema is too new.
 */
export function importStore(json: string): void {
  let envelope: ExportEnvelope
  try {
    envelope = JSON.parse(json) as ExportEnvelope
  } catch {
    throw new Error('Import failed: invalid JSON')
  }

  if (envelope.format !== 'tweet-typer-export') {
    throw new Error(`Import failed: unrecognised format "${String(envelope.format)}"`)
  }

  // Run migration runner on the envelope data.
  const migrated = migrateEnvelope(envelope)

  state = {
    projects:  migrated.data.projects,
    threads:   migrated.data.threads,
    posts:     migrated.data.posts,
    templates: migrated.data.templates,
    settings:  migrated.data.settings,
    symbols:   migrated.data.symbols,
  }

  // Ensure "Unfiled" invariant is maintained after import.
  ensureUnfiled()

  // Cap recents just in case the import had more than the cap.
  if (state.symbols.recents.length > RECENTS_CAP) {
    state.symbols = {
      ...state.symbols,
      recents: state.symbols.recents.slice(0, RECENTS_CAP),
    }
  }

  writeSchemaVersion(SCHEMA_VERSION)

  // Flush all collections.
  dirty.add('projects')
  dirty.add('threads')
  dirty.add('posts')
  dirty.add('templates')
  dirty.add('settings')
  dirty.add('symbols')
  flush()

  notify()
}

/** Force-flush all dirty collections immediately (exposed for tests). */
export function forceFlush(): void {
  flush()
}
