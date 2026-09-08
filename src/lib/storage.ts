/**
 * Thin localStorage sync layer — per-collection keys under the `tt:` namespace.
 *
 * Schema decided in: .scratch/tweet-typer/issues/03-localstorage-schema.md
 * ADR: docs/adr/0001-localstorage-persistence-schema.md
 *
 * Keys
 *   tt:projects  — Record<string, Project>
 *   tt:threads   — Record<string, Thread>
 *   tt:posts     — Record<string, Post>
 *   tt:templates — Record<string, Template>
 *   tt:settings  — Settings
 *   tt:symbols   — { favorites: string[]; recents: string[] }
 *   tt:ui        — { favoritesCollapsed, recentsCollapsed, selected*Id }
 *   tt:meta      — { schemaVersion: number }
 *
 * This module owns ONLY the read/write plumbing (get/set/remove).
 * Domain shapes, auto-save debounce, and migration runner live in ticket 08.
 */

// ── Key registry ────────────────────────────────────────────────────────────

export const StorageKey = {
  projects:  'tt:projects',
  threads:   'tt:threads',
  posts:     'tt:posts',
  templates: 'tt:templates',
  settings:  'tt:settings',
  symbols:   'tt:symbols',
  ui:        'tt:ui',
  meta:      'tt:meta',
} as const

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey]

// ── Primitives ───────────────────────────────────────────────────────────────

/**
 * Read a collection from localStorage and parse its JSON.
 * Returns `null` on miss or invalid JSON (never throws).
 */
export function storageGet<T>(key: StorageKey): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Serialize `value` to JSON and write it under `key`.
 * Catches `QuotaExceededError` and re-throws as a typed error so callers
 * can warn the user (never silently drops data).
 */
export function storageSet<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new StorageQuotaError(key)
    }
    throw err
  }
}

/**
 * Remove a single collection key.
 */
export function storageRemove(key: StorageKey): void {
  localStorage.removeItem(key)
}

/**
 * Snapshot the entire store for pre-migration backup.
 * Returns an opaque map of every `tt:*` key currently present.
 */
export function storageSnapshot(): Record<string, unknown> {
  const snap: Record<string, unknown> = {}
  for (const k of Object.values(StorageKey)) {
    const raw = localStorage.getItem(k)
    if (raw !== null) {
      try {
        snap[k] = JSON.parse(raw)
      } catch {
        snap[k] = raw
      }
    }
  }
  return snap
}

// ── Typed error ─────────────────────────────────────────────────────────────

export class StorageQuotaError extends Error {
  key: StorageKey
  constructor(key: StorageKey) {
    super(`localStorage quota exceeded writing "${key}"`)
    this.name = 'StorageQuotaError'
    this.key = key
  }
}

// ── Meta helpers ─────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 1 as const

export function readSchemaVersion(): number {
  const meta = storageGet<{ schemaVersion: number }>(StorageKey.meta)
  return meta?.schemaVersion ?? 0
}

export function writeSchemaVersion(v: number): void {
  storageSet(StorageKey.meta, { schemaVersion: v })
}
