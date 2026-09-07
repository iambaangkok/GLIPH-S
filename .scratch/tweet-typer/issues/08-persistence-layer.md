# localStorage persistence layer

Type: task
Status: open
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
