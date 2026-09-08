# localStorage persistence layer

Type: task
Status: resolved
Blocked by: 07

## Task

Implement the persistence layer per [ticket 03](./03-localstorage-schema.md) and
[ADR-0001](../../../docs/adr/0001-localstorage-persistence-schema.md).

- Per-collection keys (`tt:projects/threads/posts/templates/settings/symbols/meta`), normalized
  `id→entity` maps, order as parent-held ID-arrays, nanoid ids + created/updated epoch-millis.
- Flat Project›Thread›Post with mandatory single Project + non-deletable "Unfiled" default.
- `schemaVersion` + boot migration runner (backup, no down-migrate).
- 250 ms debounced auto-save flushed on `visibilitychange`/`beforeunload`; quota =
  warn + preserve + export (never auto-delete); Recents capped at 50.
- Typed store API + React binding the panes consume.

Done when entities round-trip through localStorage and survive reload. (Merge-on-import stays out —
replace-on-import only; see fog.)

---

## Answer

Resolved 2026-09-08 (built by a Sonnet subagent, verified independently). Persistence layer
built on top of the existing `tt:` primitives in [storage.ts](../../../src/lib/storage.ts) — nothing
duplicated.

**Files:**
- [src/lib/types.ts](../../../src/lib/types.ts) — domain types (`Project`/`Thread`/`Post`/`Template`/
  `Settings`/`SymbolsStore`/`ExportEnvelope`) + collection-map aliases. nanoid `id`,
  `createdAt`/`updatedAt` epoch-millis, order as parent-held `threadIds`/`postIds`.
- [src/lib/migrate.ts](../../../src/lib/migrate.ts) — boot migration runner `runMigrations()`
  (no-op at v1), `migrateEnvelope()` for imports, `readBackup()`. Backup-before-migrate,
  refuses down-migration.
- [src/lib/store.ts](../../../src/lib/store.ts) — normalized in-memory store (authoritative;
  localStorage read once via `hydrate()`), full typed CRUD API, 250 ms debounced per-collection
  flush force-flushed on `visibilitychange` (hidden) + `beforeunload`, quota = warn+preserve
  (never drops in-memory) via `onQuotaWarning`, recents capped at 50, "Unfiled" default project
  seeded + non-deletable/non-renameable, superset `exportStore()` / replace-`importStore()`.
- [src/lib/StoreContext.tsx](../../../src/lib/StoreContext.tsx) — `StoreProvider` + `useStore()`
  hook (reactive state + API + `quotaWarning`). [App.tsx](../../../src/App.tsx) root wrapped in
  the provider; visual placeholders untouched.
- [src/lib/store.test.ts](../../../src/lib/store.test.ts) — 20 vitest/jsdom tests (round-trip +
  reload survival, Unfiled invariant, recents cap, export→import replace). vitest+jsdom added as
  devDeps; `pnpm test` = `vitest run`.

**Verification (all run independently, not just reported):** `pnpm test` → 20/20 pass ·
`pnpm build` (`tsc -b && vite build`) → clean, 202.5 kB bundle · `oxlint` → exit 0 (one benign
`react/only-export-components` warning on the provider+hook file).

**Deviation:** none. Merge-on-import deliberately not built (stays in fog).

**API notes for downstream tickets (09–14):**
- **09 Navigator:** `useStore()` → `Object.values(state.projects)` / `state.threads`;
  `createProject`/`renameProject`/`deleteProject`, `createThread`/`updateThread`/`deleteThread`.
  Default project id via `getDefaultProjectId()`; it has `isDefault: true` and rename/delete
  mutators throw on it (and on deleting the last project) — surface that in the UI.
- **10 Editor:** `createPost(threadId)`, `updatePost(id, content)` on every keystroke (debounce
  coalesces — call freely). Order = `state.threads[threadId].postIds`.
- **11 Symbols:** `state.symbols.favorites` / `.recents` are string arrays; `addFavorite`/
  `removeFavorite`/`addRecent` (recents auto-capped 50, most-recent-first).
- **13 Settings/Import-Export:** `exportStore()` → JSON string; `importStore(json)` is REPLACE —
  call only after user confirm. Quota via `onQuotaWarning(fn)` or reactive `useStore().quotaWarning`.
  `updateSettings(patch)` shallow-merges.
