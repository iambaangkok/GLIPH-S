# Symbol browser + Styles tab (right pane)

Type: task
Status: resolved
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

## Answer

Built the docked right pane as `src/SymbolPanel.tsx` (replaces the App.tsx placeholder
`<aside>` body — App now just mounts `<SymbolPanel/>`). Two mutually-exclusive tabs.

**Symbols tab (`SymbolsTab`)** — the core feature, backed by the #02 dataset. The 55 KB
`research/symbols.json` was copied into `src/data/symbols.json` (source of truth stays in
`research/`) and loaded through a typed read-only façade `src/lib/symbols.ts`
(`SYMBOL_CATEGORIES`, `ALL_GLYPHS`, `glyphFor(char)`, `searchGlyphs(q)`). UI: a mono search
box (name/codepoint/char, case-insensitive) that flips the body into a flat results grid;
otherwise Favorites → Recent → a category-chip selector + the active category's 6-col glyph
grid. **Cursor-aware insertion** via the #10 seam: each `GlyphCell` fires
`onMouseDown`+`preventDefault` → `insertAtCursor(char)` + `addRecent(char)` (covers the
search-box-focus case since focus never leaves the editor). **Favorites/Recents persist**
through `useStore()` — a hover/always-on corner star toggles `addFavorite`/`removeFavorite`
(stops propagation so pinning never inserts); Recents come pre-capped at 50 by the store.
CJK/half-width glyphs render in `--font-cjk`.

**Styles tab (`StylesTab`)** — "fancy fonts" selection transform in `src/lib/styles.ts`.
9 styles (Normal, Bold, Italic, Bold Italic, Script, Mono, Double-struck, Sans Bold,
Fullwidth) built from Unicode Mathematical Alphanumeric Symbols + Fullwidth Forms via a
codepoint-offset `alphabet()` builder with the Letterlike-Symbols holes patched
(script B→ℬ e→ℯ …, double-struck C→ℂ R→ℝ …). `applyStyle(text, id)` = **normalize-to-ASCII**
(reverse map aggregated across every style) **then map** → mutual-exclusivity for free,
`normal` = just the normalize step, unmapped chars (space/punct/emoji/CJK/digits-where-a-
style-lacks-them) pass through. Iterates by **code point** (`Array.from`) since the alphabets
are astral/surrogate-pair (they weigh 2 per #01 — expected). Buttons show a live in-style
sample and restyle the current selection in place.

**New seam:** extended `InsertionContext` with `transformSelection(fn)` — reads the
last-focused editor's non-empty range selection, replaces it with `fn(selected)`, **no-op on
collapsed/empty selection or unchanged output**. This is the in-place-mutation primitive the
Styles tab consumes and is available to future tickets.

Tests: `src/lib/styles.test.ts` — 23 cases (bold map, unmapped pass-through, Normal-reverses,
mutual exclusivity, Letterlike holes, fullwidth, per-style ASCII round-trip, catalogue
samples). Enabled `resolveJsonModule` in `tsconfig.app.json` for the dataset import.

**Verified:** `pnpm test` 43/43 (20 store + 23 styles), `pnpm build` (`tsc -b && vite build`)
clean, `oxlint` exit 0 with no new warnings. Built in this session; not committed.

New/changed files: `src/SymbolPanel.tsx`, `src/lib/symbols.ts`, `src/lib/styles.ts`,
`src/lib/styles.test.ts`, `src/data/symbols.json` (copy), `src/lib/InsertionContext.tsx`
(+`transformSelection`), `src/App.tsx` (mount), `tsconfig.app.json` (+`resolveJsonModule`).
