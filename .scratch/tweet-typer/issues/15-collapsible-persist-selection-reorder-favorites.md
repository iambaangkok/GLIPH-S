# Collapsible Favorites/Recents + persist collapse & active selection + drag-reorder Favorites

Type: task
Status: open
Blocked by: 08, 09, 10, 11, 12

## Task

A cluster of persistence + interaction polish on the symbol panel and the selection seam.

- **Collapsible Favorites / Recents** — the Favorites glyph section and the Recent glyph
  section in the symbol panel (`src/SymbolPanel.tsx`, #11) each get a collapse/expand toggle.
- **Persist collapse state** — remember whether Favorites / Recents are collapsed **across
  sessions** (localStorage). Pick where this UI state lives (candidates: a new `tt:ui` store,
  or fold into `settings`) and wire it through the store layer so it round-trips like everything
  else. Include it in the export/import envelope if it lands in a persisted store.
- **Persist active selection** — the currently active Thread *or* Template should survive a
  reload. Today `SelectionContext` (`src/lib/SelectionContext.tsx`) is **ephemeral / non-persisted**
  (`selectedThreadId` from #09, `selectedTemplateId` from #12, mutually exclusive). Persist the
  active selection to localStorage and re-hydrate it on boot (guarding against a selected id that
  no longer exists after an import/delete).
- **Drag-to-reorder Favorites** — Favorites is currently an insertion-ordered array in the
  `tt:symbols` store (#11). Make the Favorites grid reorderable via native HTML5 drag-and-drop,
  mirroring the pattern already used for templates/threads in #12 (`src/lib/dnd.ts`,
  `reorderTemplate`/`moveThread`). Add a `reorderFavorite(...)` store op + tests.

MVP interpretation: single collapse flag per section; reorder applies to Favorites only (Recents
stays most-recent-first, capped by the store).

Done when Favorites/Recents collapse and their collapsed state, plus the active Thread/Template
selection, all persist across a reload, and Favorites can be reordered by dragging.
