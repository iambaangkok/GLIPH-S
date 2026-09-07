# localStorage schema & persistence

Type: grilling
Status: claimed (assigned: iambaangkok)
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
