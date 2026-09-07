# localStorage persistence schema

Status: accepted

Tweet Typer is client-side only, so localStorage is the system of record. We persist to
**per-collection keys** (`tt:projects`, `tt:threads`, `tt:posts`, `tt:templates`,
`tt:settings`, `tt:symbols`, `tt:meta`), each holding a normalized `id → entity` map, with
child order carried as ID-arrays on the parent (`Project.threadIds`, `Thread.postIds`).
Entities use nanoid IDs and `createdAt`/`updatedAt` epoch-millis timestamps. In-memory state
is the working copy; a **250 ms** debounced writer syncs only the touched collection and
flushes on `visibilitychange`/`beforeunload`. A `schemaVersion` in `tt:meta` drives a
boot-time sequential migration runner (backs up before migrating, refuses to migrate down).

## Considered Options

- **Single JSON blob under one key** — trivially atomic and simplest export, but every
  debounced save re-serializes the entire store and it sits as one indivisible lump against
  the ~5 MB quota. Rejected: no write scoping.
- **Per-entity keys (`tt:post:<id>`)** — true per-record scoped writes regardless of count,
  but needs a key index, N `getItem`s on load, and key enumeration for export. Rejected as
  over-engineered for realistic scale (hundreds of short Posts), where a collection rewrite
  under the debounce is sub-millisecond.
- **Per-collection keys (chosen)** — middle ground: writes scoped to the changed collection,
  naturally normalized to match parent-held ordering, fixed key set for simple export.

## Consequences

- Editing one Post rewrites the whole `tt:posts` collection string; acceptable under the
  debounce at realistic scale, but the cost grows with total Post count — the boundary case
  coincides with approaching the 5 MB quota anyway.
- Cross-key writes are not transactionally atomic; acceptable for a single-tab client app.
- `QuotaExceededError` is caught and surfaced (warn + preserve in-memory + push to JSON
  export); user content is never auto-evicted. Only `symbols.recents` is bounded (cap 50).
