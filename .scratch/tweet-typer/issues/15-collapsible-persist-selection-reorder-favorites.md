# Collapsible Favorites/Recents + persist collapse & active selection + drag-reorder Favorites

Type: task
Status: resolved
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

## Answer

All four items shipped. Key decision: **UI state lives in a new persisted `tt:ui`
store** (not folded into `settings`), so view/interaction state (collapse flags +
active selection) stays cleanly separated from user preferences like char-limit,
and it round-trips through export/import like every other collection.

**New store: `tt:ui`** (`UiState` in `src/lib/types.ts`) —
`{ favoritesCollapsed, recentsCollapsed, selectedThreadId, selectedTemplateId }`.
Wired through the store layer exactly like the other collections: `StorageKey.ui`,
`emptyUi()` seed, hydrate (`{ ...emptyUi(), ...stored }` so new fields default
forward), `_resetHydration`, dirty/flush `CollectionKey`, and the export envelope
(`ExportEnvelope.data.ui`). New API `updateUi(patch)` (mirrors `updateSettings`),
exposed via `StoreContext`.

- **Collapsible Favorites / Recents** — `src/SymbolPanel.tsx` gained a
  `CollapsibleSectionLabel` (chevron ▾/▸, whole label is the toggle,
  `aria-expanded`). Favorites and Recent each read their flag from `state.ui` and
  toggle via `updateUi`. Collapsed hides the grid but keeps the header.
- **Persist collapse state** — the two flags live in `tt:ui`; round-trips on
  reload and is included in export/import.
- **Persist active selection** — `SelectionContext` is no longer ephemeral. It now
  `useStore()`s: seeds initial selection from `state.ui` **validated against the
  live store** (a dangling id → null), mirrors every set into `tt:ui` via
  `updateUi` (keeping Thread/Template mutual exclusivity), and an effect drops a
  selection whose target vanishes mid-session (delete) or after a replace-import.
  `importStore` also defensively nulls a persisted selection the import didn't
  bring in.
- **Drag-to-reorder Favorites** — new `reorderFavorite(symbol, beforeSymbol)`
  store op (mirrors `reorderTemplate`, on the flat `symbols.favorites` array;
  no-op guards). New `FAVORITE_MIME` + an `axis` param on `dropHalf`/`dropShadow`
  in `src/lib/dnd.ts` (grid flows in rows → left/right drop indicator). Favorites
  render through a new `FavoritesGrid` whose cells are drop targets; `GlyphCell`
  gained an optional corner **drag grip** (`.glyph-grip`) — kept separate from the
  insert button, since that button's `onMouseDown`+`preventDefault` (editor-focus
  guard) would otherwise cancel the native drag. Recents stay most-recent-first
  (not reorderable).

**Verification:** `pnpm test` **63/63** (+11: reorderFavorite ×5, ui-state ×6),
`pnpm build` clean, `oxlint src/` exit 0. Not committed. Files touched:
`src/lib/{types,storage,store,StoreContext,SelectionContext,dnd}.{ts,tsx}`,
`src/SymbolPanel.tsx`, `src/index.css`, `src/lib/store.test.ts`.
