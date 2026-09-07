# localStorage schema & persistence

Type: grilling
Status: closed (resolved)
Blocked by: —

## Question

Pin down how Projects, Threads, Posts, Templates, settings, and symbol Favorites/Recents are
persisted in localStorage. Decisions to settle:

1. **Key layout** — one big JSON blob under a single key, vs. per-entity keys
   (`tt:projects`, `tt:threads`, `tt:templates`, `tt:settings`, `tt:symbols:favorites`,
   `tt:symbols:recents`). Trade-offs: atomic writes, quota, partial-load.
2. **Entity shapes & ids** — id scheme (uuid/nanoid), timestamps, ordering fields for
   Threads within a Project and Posts within a Thread.
3. **Project relationship (open sub-questions from charting):**
   - Must every Thread belong to exactly one Project?
   - Is there a default "Unfiled" Project?
   - Can Projects nest, or is it one flat level?
4. **Schema versioning / migration** — a `schemaVersion` field and a migration strategy so
   future changes don't wipe user data.
5. **Quota handling** — localStorage is ~5MB; what happens on `QuotaExceededError`, and do
   we need it for realistic usage?
6. **Export/import JSON shape** — the format for the settings/misc backup feature (should be
   a superset that round-trips the whole store).
7. **Auto-save semantics** — debounce interval, and how "everything is always saved"
   (no drafts) is implemented without thrashing localStorage.

Resolve via `/grilling` + `/domain-modeling`.

---

## Resolution

Resolved 2026-09-08 via `/grilling` + `/domain-modeling`. See ADR
[0001-localstorage-persistence-schema](../../../docs/adr/0001-localstorage-persistence-schema.md)
for the persistence-architecture decision + rationale.

1. **Project relationship** — every Thread belongs to exactly one Project; auto **"Unfiled"**
   default Project (non-deletable/non-renameable); **flat**, no nesting.
2. **Entity shapes & ids** — **nanoid** IDs (opaque, never reused); `createdAt`/`updatedAt`
   epoch-millis on all entities; order held as **ID-arrays on the parent**
   (`Project.threadIds`, `Thread.postIds`).
3. **Key layout** — **per-collection keys**, each an `id → entity` map:
   `tt:projects`, `tt:threads`, `tt:posts`, `tt:templates`, `tt:settings`,
   `tt:symbols` (`{favorites, recents}`), `tt:meta` (`{schemaVersion}`). A save rewrites only
   the touched collection. (Considered single-blob and per-entity `tt:post:<id>`; per-collection
   chosen — collection-rewrite cost is negligible at realistic scale under the debounce.)
4. **Versioning / migration** — `schemaVersion` in `tt:meta` (starts at 1); boot-time
   **sequential migration runner** (no-op at v1); pre-migration backup snapshot
   (`tt:backup:v<n>`); refuse to migrate *down* on a newer-than-code store.
5. **Export/import** — single **superset round-trip** JSON
   (`{format, schemaVersion, exportedAt, data{projects,threads,posts,templates,settings,symbols}}`);
   import is **replace-with-confirm**; imported files run through the migration runner.
   Merge semantics → fog.
6. **Auto-save** — **250 ms** debounce per touched entity; flush on
   `visibilitychange`/`beforeunload`; in-memory working copy is authoritative, localStorage is
   the sync target; read once on load.
7. **Quota** — try/catch `QuotaExceededError`; warn + preserve in-memory + push user to export;
   **never auto-delete user content**; cap `symbols.recents` at **50**.
