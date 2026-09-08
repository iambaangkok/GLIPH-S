/**
 * Focused round-trip tests for the GLIPH-S persistence layer.
 *
 * Asserts:
 *   1. Entities survive a simulated reload (write → re-hydrate → read).
 *   2. "Unfiled" project is seeded on first load and remains non-deletable/renameable.
 *   3. symbols.recents is capped at 24.
 *   4. export→import replace round-trip preserves all data.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  _resetHydration,
  addFavorite,
  addRecent,
  createPost,
  createProject,
  createTemplate,
  createThread,
  deleteProject,
  exportStore,
  forceFlush,
  getDefaultProjectId,
  getState,
  hydrate,
  importStore,
  moveThread,
  renameProject,
  reorderFavorite,
  reorderPost,
  reorderTemplate,
  reorderThread,
  updatePost,
  updateSettings,
  updateUi,
  type StoreState,
} from './store.ts'
import { storageGet, StorageKey } from './storage.ts'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulate a full app reload: flush → reset → re-hydrate. */
function simulateReload(): StoreState {
  forceFlush()
  _resetHydration()
  hydrate()
  return getState()
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
  _resetHydration()
  hydrate()
})

afterEach(() => {
  forceFlush()
  localStorage.clear()
  _resetHydration()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Unfiled seeding invariant', () => {
  it('seeds exactly one default Project named "Unfiled" on first load', () => {
    const projects = Object.values(getState().projects)
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Unfiled')
    expect(projects[0].isDefault).toBe(true)
  })

  it('does not seed a second Unfiled on reload', () => {
    const after = simulateReload()
    const defaults = Object.values(after.projects).filter((p) => p.isDefault)
    expect(defaults).toHaveLength(1)
  })

  it('Unfiled cannot be deleted', () => {
    const id = getDefaultProjectId()
    expect(() => deleteProject(id)).toThrow('Cannot delete the default Unfiled project')
  })

  it('Unfiled cannot be renamed', () => {
    const id = getDefaultProjectId()
    expect(() => renameProject(id, 'My Projects')).toThrow(
      'Cannot rename the default Unfiled project',
    )
  })
})

describe('Entity round-trip through localStorage (reload survival)', () => {
  it('Projects survive a reload', () => {
    const p = createProject('Science')
    forceFlush()

    const after = simulateReload()
    expect(after.projects[p.id]).toBeDefined()
    expect(after.projects[p.id].name).toBe('Science')
  })

  it('Threads survive a reload', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'My Thread')
    forceFlush()

    const after = simulateReload()
    expect(after.threads[thread.id]).toBeDefined()
    expect(after.threads[thread.id].title).toBe('My Thread')
    // Parent threadIds updated
    expect(after.projects[projectId].threadIds).toContain(thread.id)
  })

  it('Posts survive a reload', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'Thread 1')
    const post = createPost(thread.id, 'Hello world')
    forceFlush()

    const after = simulateReload()
    expect(after.posts[post.id]).toBeDefined()
    expect(after.posts[post.id].content).toBe('Hello world')
    expect(after.threads[thread.id].postIds).toContain(post.id)
  })

  it('Post content updates survive a reload', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'T')
    const post = createPost(thread.id, 'Original')
    updatePost(post.id, 'Updated content')
    forceFlush()

    const after = simulateReload()
    expect(after.posts[post.id].content).toBe('Updated content')
  })

  it('Templates survive a reload', () => {
    const t = createTemplate('Intro', 'Hello, {{name}}!')
    forceFlush()

    const after = simulateReload()
    expect(after.templates[t.id]).toBeDefined()
    expect(after.templates[t.id].content).toBe('Hello, {{name}}!')
  })

  it('Settings survive a reload', () => {
    updateSettings({ theme: 'dark' })
    forceFlush()

    const after = simulateReload()
    expect((after.settings as Record<string, unknown>)['theme']).toBe('dark')
  })

  it('localStorage actually contains the data after flush', () => {
    const projectId = getDefaultProjectId()
    createThread(projectId, 'Persisted thread')
    forceFlush()

    const raw = storageGet<Record<string, unknown>>(StorageKey.threads)
    expect(raw).not.toBeNull()
    expect(Object.keys(raw ?? {})).toHaveLength(1)
  })
})

describe('symbols.recents cap at 24', () => {
  it('caps recents at 24 entries', () => {
    // Add 40 unique symbols
    for (let i = 0; i < 40; i++) {
      addRecent(`sym-${i}`)
    }
    const { recents } = getState().symbols
    expect(recents).toHaveLength(24)
    // Most-recent first
    expect(recents[0]).toBe('sym-39')
  })

  it('deduplicates: re-adding an existing symbol moves it to front', () => {
    addRecent('A')
    addRecent('B')
    addRecent('C')
    addRecent('A') // re-add A
    const { recents } = getState().symbols
    expect(recents[0]).toBe('A')
    expect(recents.filter((s) => s === 'A')).toHaveLength(1)
  })

  it('recents survive a reload', () => {
    addRecent('★')
    addRecent('♥')
    forceFlush()

    const after = simulateReload()
    expect(after.symbols.recents).toContain('★')
    expect(after.symbols.recents[0]).toBe('♥') // most-recent first
  })
})

describe('export → import replace round-trip', () => {
  it('full export→import round-trip preserves all collections', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'Export test thread')
    const post = createPost(thread.id, 'Post content')
    const template = createTemplate('T1', 'Template body')
    updateSettings({ lang: 'en' })
    addRecent('∑')
    forceFlush()

    const json = exportStore()
    const envelope = JSON.parse(json) as Record<string, unknown>

    // Envelope shape
    expect(envelope['format']).toBe('tweet-typer-export')
    expect(envelope['schemaVersion']).toBe(1)
    expect(typeof envelope['exportedAt']).toBe('number')

    // Clear everything and import.
    localStorage.clear()
    _resetHydration()
    hydrate()

    // Now the store has only the seeded Unfiled (fresh state).
    importStore(json)

    const after = getState()
    expect(after.threads[thread.id]).toBeDefined()
    expect(after.posts[post.id].content).toBe('Post content')
    expect(after.templates[template.id].name).toBe('T1')
    expect((after.settings as Record<string, unknown>)['lang']).toBe('en')
    expect(after.symbols.recents).toContain('∑')
  })

  it('import re-seeds Unfiled if the imported data has no default project', () => {
    // Export a state where we manually strip isDefault (unlikely in practice but defensive).
    const projectId = getDefaultProjectId()
    const json = exportStore()
    const env = JSON.parse(json) as {
      data: { projects: Record<string, { isDefault: boolean }> }
    }
    env.data.projects[projectId].isDefault = false
    const mangled = JSON.stringify(env)

    localStorage.clear()
    _resetHydration()
    hydrate()
    importStore(mangled)

    const defaults = Object.values(getState().projects).filter((p) => p.isDefault)
    expect(defaults).toHaveLength(1)
  })

  it('import throws on bad JSON', () => {
    expect(() => importStore('not json')).toThrow('Import failed: invalid JSON')
  })

  it('import throws on wrong format', () => {
    expect(() =>
      importStore(JSON.stringify({ format: 'other', schemaVersion: 1, exportedAt: 0, data: {} })),
    ).toThrow('unrecognised format')
  })

  it('import throws if schema version is newer than code', () => {
    const json = exportStore()
    const env = JSON.parse(json) as { schemaVersion: number }
    env.schemaVersion = 999
    expect(() => importStore(JSON.stringify(env))).toThrow('newer than code')
  })

  it('imported recents are capped at 24', () => {
    // Build a state with 80 recents and export it.
    for (let i = 0; i < 80; i++) addRecent(`s${i}`)
    // Manually jam 80 into the exported envelope.
    const json = exportStore()
    const env = JSON.parse(json) as {
      data: { symbols: { recents: string[] } }
    }
    // exportStore itself already caps from addRecent, so set manually:
    env.data.symbols.recents = Array.from({ length: 80 }, (_, i) => `x${i}`)
    const padded = JSON.stringify(env)

    localStorage.clear()
    _resetHydration()
    hydrate()
    importStore(padded)

    expect(getState().symbols.recents).toHaveLength(24)
  })
})

describe('reorderPost', () => {
  it('moves a post within its thread (forward)', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'Reorder test thread')
    const p1 = createPost(thread.id, 'Post 1')
    const p2 = createPost(thread.id, 'Post 2')
    const p3 = createPost(thread.id, 'Post 3')

    reorderPost(thread.id, 0, 2)

    const postIds = getState().threads[thread.id].postIds
    expect(postIds).toEqual([p2.id, p3.id, p1.id])
  })

  it('moves a post within its thread (backward)', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'Reorder test thread 2')
    const p1 = createPost(thread.id, 'Post A')
    const p2 = createPost(thread.id, 'Post B')
    const p3 = createPost(thread.id, 'Post C')

    reorderPost(thread.id, 2, 0)

    const postIds = getState().threads[thread.id].postIds
    expect(postIds).toEqual([p3.id, p1.id, p2.id])
  })

  it('is a no-op when fromIndex === toIndex', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'Reorder no-op')
    const p1 = createPost(thread.id, 'P1')
    const p2 = createPost(thread.id, 'P2')
    const before = [...getState().threads[thread.id].postIds]

    reorderPost(thread.id, 1, 1)

    expect(getState().threads[thread.id].postIds).toEqual(before)
    void p1; void p2  // suppress unused var warning
  })

  it('is a no-op when index is out of range', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'Reorder OOB')
    createPost(thread.id, 'Only post')
    const before = [...getState().threads[thread.id].postIds]

    reorderPost(thread.id, 0, 5)

    expect(getState().threads[thread.id].postIds).toEqual(before)
  })

  it('throws when thread does not exist', () => {
    expect(() => reorderPost('nonexistent', 0, 1)).toThrow('Thread nonexistent not found')
  })

  it('reordered posts survive a reload', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'Persist reorder')
    const p1 = createPost(thread.id, 'First')
    const p2 = createPost(thread.id, 'Second')

    reorderPost(thread.id, 0, 1)
    forceFlush()

    const after = simulateReload()
    expect(after.threads[thread.id].postIds).toEqual([p2.id, p1.id])
  })

  it('reorderThread still works as before (regression guard)', () => {
    const projectId = getDefaultProjectId()
    const t1 = createThread(projectId, 'T1')
    const t2 = createThread(projectId, 'T2')
    const t3 = createThread(projectId, 'T3')

    reorderThread(projectId, 0, 2)

    const threadIds = getState().projects[projectId].threadIds
    expect(threadIds).toEqual([t2.id, t3.id, t1.id])
  })
})

describe('moveThread (drag reorder + cross-project)', () => {
  it('reorders within a project by inserting before a sibling', () => {
    const projectId = getDefaultProjectId()
    const t1 = createThread(projectId, 'A')
    const t2 = createThread(projectId, 'B')
    const t3 = createThread(projectId, 'C')

    // Move C before A → [C, A, B]
    moveThread(t3.id, projectId, t1.id)

    expect(getState().projects[projectId].threadIds).toEqual([t3.id, t1.id, t2.id])
  })

  it('appends within a project when beforeThreadId is null', () => {
    const projectId = getDefaultProjectId()
    const t1 = createThread(projectId, 'A')
    const t2 = createThread(projectId, 'B')

    moveThread(t1.id, projectId, null)

    expect(getState().projects[projectId].threadIds).toEqual([t2.id, t1.id])
  })

  it('moves a thread across projects and updates its projectId', () => {
    const src = getDefaultProjectId()
    const dst = createProject('Destination').id
    const t1 = createThread(src, 'stays')
    const t2 = createThread(src, 'moves')
    const d1 = createThread(dst, 'target')

    // Move t2 into dst, before d1.
    moveThread(t2.id, dst, d1.id)

    expect(getState().projects[src].threadIds).toEqual([t1.id])
    expect(getState().projects[dst].threadIds).toEqual([t2.id, d1.id])
    expect(getState().threads[t2.id].projectId).toBe(dst)
  })

  it('cross-project move survives a reload', () => {
    const src = getDefaultProjectId()
    const dst = createProject('Persisted destination').id
    const t = createThread(src, 'traveller')

    moveThread(t.id, dst, null)
    forceFlush()

    const after = simulateReload()
    expect(after.projects[src].threadIds).toEqual([])
    expect(after.projects[dst].threadIds).toEqual([t.id])
    expect(after.threads[t.id].projectId).toBe(dst)
  })

  it('is a no-op when dropping a thread on itself', () => {
    const projectId = getDefaultProjectId()
    const t1 = createThread(projectId, 'A')
    const t2 = createThread(projectId, 'B')
    const before = [...getState().projects[projectId].threadIds]

    moveThread(t1.id, projectId, t1.id)

    expect(getState().projects[projectId].threadIds).toEqual(before)
    void t2
  })
})

describe('reorderFavorite (drag reorder)', () => {
  it('moves a favorite before another', () => {
    addFavorite('α')
    addFavorite('β')
    addFavorite('γ')

    // Move γ before α → [γ, α, β]
    reorderFavorite('γ', 'α')

    expect(getState().symbols.favorites).toEqual(['γ', 'α', 'β'])
  })

  it('appends to the end when beforeSymbol is null', () => {
    addFavorite('α')
    addFavorite('β')

    reorderFavorite('α', null)

    expect(getState().symbols.favorites).toEqual(['β', 'α'])
  })

  it('is a no-op when the symbol is not a favorite', () => {
    addFavorite('α')
    reorderFavorite('β', 'α')
    expect(getState().symbols.favorites).toEqual(['α'])
  })

  it('is a no-op when nothing actually moves', () => {
    addFavorite('α')
    addFavorite('β')
    // α is already first; dropping it before β leaves order unchanged.
    reorderFavorite('α', 'β')
    expect(getState().symbols.favorites).toEqual(['α', 'β'])
  })

  it('reordered favorites survive a reload', () => {
    addFavorite('α')
    addFavorite('β')
    addFavorite('γ')
    reorderFavorite('γ', 'α')
    forceFlush()

    const after = simulateReload()
    expect(after.symbols.favorites).toEqual(['γ', 'α', 'β'])
  })
})

describe('UI state (collapse flags + persisted selection)', () => {
  it('defaults to nothing collapsed / nothing selected', () => {
    expect(getState().ui).toEqual({
      favoritesCollapsed: false,
      recentsCollapsed: false,
      selectedThreadId: null,
      selectedTemplateId: null,
    })
  })

  it('collapse flags survive a reload', () => {
    updateUi({ favoritesCollapsed: true, recentsCollapsed: true })
    forceFlush()

    const after = simulateReload()
    expect(after.ui.favoritesCollapsed).toBe(true)
    expect(after.ui.recentsCollapsed).toBe(true)
  })

  it('active selection survives a reload', () => {
    const projectId = getDefaultProjectId()
    const thread = createThread(projectId, 'Selected thread')
    updateUi({ selectedThreadId: thread.id, selectedTemplateId: null })
    forceFlush()

    const after = simulateReload()
    expect(after.ui.selectedThreadId).toBe(thread.id)
  })

  it('is included in the export/import round-trip', () => {
    updateUi({ favoritesCollapsed: true })
    forceFlush()
    const json = exportStore()

    localStorage.clear()
    _resetHydration()
    hydrate()
    importStore(json)

    expect(getState().ui.favoritesCollapsed).toBe(true)
  })

  it('import defaults ui when the envelope predates ticket 15', () => {
    const json = exportStore()
    const env = JSON.parse(json) as { data: { ui?: unknown } }
    delete env.data.ui // simulate a pre-ticket-15 export

    localStorage.clear()
    _resetHydration()
    hydrate()
    importStore(JSON.stringify(env))

    expect(getState().ui.favoritesCollapsed).toBe(false)
    expect(getState().ui.selectedThreadId).toBeNull()
  })

  it('import drops a selection whose target it did not bring in', () => {
    // Persist a selection pointing at a thread id, then import an envelope that
    // has no such thread — the dangling id must not survive.
    updateUi({ selectedThreadId: 'ghost-thread' })
    forceFlush()
    const json = exportStore()
    // exportStore captured the ghost id; strip the thread map so it can't resolve.
    const env = JSON.parse(json) as { data: { threads: Record<string, unknown> } }
    env.data.threads = {}

    localStorage.clear()
    _resetHydration()
    hydrate()
    importStore(JSON.stringify(env))

    expect(getState().ui.selectedThreadId).toBeNull()
  })
})

describe('reorderTemplate (drag reorder)', () => {
  it('assigns ascending order on create', () => {
    const a = createTemplate('A', '1')
    const b = createTemplate('B', '2')
    expect(a.order).toBe(0)
    expect(b.order).toBe(1)
  })

  it('moves a template before another and renormalizes order', () => {
    const a = createTemplate('A', '1')
    const b = createTemplate('B', '2')
    const c = createTemplate('C', '3')

    // Move C before A → [C, A, B]
    reorderTemplate(c.id, a.id)

    const ordered = Object.values(getState().templates)
      .sort((x, y) => x.order - y.order)
      .map((t) => t.id)
    expect(ordered).toEqual([c.id, a.id, b.id])
    expect(getState().templates[c.id].order).toBe(0)
    expect(getState().templates[b.id].order).toBe(2)
  })

  it('appends to the end when beforeId is null', () => {
    const a = createTemplate('A', '1')
    const b = createTemplate('B', '2')

    reorderTemplate(a.id, null)

    const ordered = Object.values(getState().templates)
      .sort((x, y) => x.order - y.order)
      .map((t) => t.id)
    expect(ordered).toEqual([b.id, a.id])
  })

  it('reordered templates survive a reload', () => {
    const a = createTemplate('A', '1')
    const b = createTemplate('B', '2')
    reorderTemplate(b.id, a.id)
    forceFlush()

    const after = simulateReload()
    const ordered = Object.values(after.templates)
      .sort((x, y) => x.order - y.order)
      .map((t) => t.id)
    expect(ordered).toEqual([b.id, a.id])
  })
})
