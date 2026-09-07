# Symbol browser + Styles tab (right pane)

Type: task
Status: open
Blocked by: 07, 08, 10

## Task

Build the docked right panel — the **core** feature — per
[ticket 02](./02-scifi-symbol-dataset.md) and [ticket 04](./04-editor-input-mechanism.md).

- **Symbols tab:** curated categories from `research/symbols.json` + search + Favorites + Recents
  (Recents capped at 50). Cursor-aware insertion into the last-focused editor via the selection ref
  + `onMouseDown`/`preventDefault` on buttons (covers the search-box focus case).
- **Styles tab:** selection transform ("fancy fonts") — bidirectional map, normalize-to-ASCII-then-
  apply, mutually exclusive, Normal = reverse, unmapped pass-through, no-op on empty selection,
  mutates plain text in place.
- V7.4 treatment: halftone panel band, dingbat marks, stadium chips, tab styling per the prototype.

Done when symbols and styles insert/transform at the cursor and favorites/recents persist.
