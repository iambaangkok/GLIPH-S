# Tweet Typer — Wayfinder Map

Labels: `wayfinder:map`

## Destination

A **locked MVP spec** for Tweet Typer — a client-side web app for composing "cool" X.com
posts with a curated sci-fi/techwear unicode symbol browser, threads, projects, templates,
and X-accurate character counting, all cached in localStorage.

The map is done when every open decision below is resolved and the spec is ready to hand off.

## Notes

- **Execution is authorized in this effort (destination "B").** Once the decision tickets
  resolve, build work graduates from the fog into execution tickets and may be built
  ticket-by-ticket within this same map — not a separate effort.
- **Tracker:** local-markdown (`.scratch/tweet-typer/`). No `gh`/GitHub or other tracker is
  configured on this repo; charting defaulted to local per the wayfinder skill.
- **Repo:** local git, default branch `master`, no commits yet.
- **Skills to consult per ticket type:** `/research` (research tickets), `/prototype`
  (prototype tickets), `/grilling` + `/domain-modeling` (grilling tickets).

### Ubiquitous language (domain model)

- **Project** — a named grouping/folder of Threads. Top of the hierarchy.
- **Thread** — an ordered list of Posts; auto-saves to localStorage (there is no separate
  "draft" concept — everything is always saved). Belongs under a Project.
- **Post** — one unit of text plus its derived weighted character count. (Called "Post,"
  never "tweet.")
- **Template** — a flexible, reusable text snippet insertable at the cursor anywhere.
- **Symbol** — a curated glyph from the browser; backed by Favorites and Recents stores.

Hierarchy: **Project › Thread › Post.**

### Settled decisions (fixed during charting — these go into the spec, not tickets)

- Client-side only, no backend; everything persisted in localStorage.
- Symbols: curated categories + search + favorites/recents (NOT full-Unicode browsing).
  The symbol browser is the **core** feature.
- Aesthetic: sci-fi / techwear / industrial-micrographic (Ghost-in-the-Shell); drives both
  the curated symbol set and the visual theme.
- Character counting: X-accurate weighted length via the `twitter-text` algorithm/package,
  with a configurable maximum.
- Stack: Vite + React + TypeScript + **Lexical** (rich-text editor) + a thin localStorage
  sync layer. (Lexical locked by ticket 04.)
- Output: per-Post copy + "Open in X" intent link (C); plus JSON export/import (D) tucked
  into a settings/misc area, not a primary control.
- Character limit: a single global setting, default 280.
- Text styler ("fancy fonts" 𝐛𝐨𝐥𝐝/𝓈𝒸𝓇𝒾𝓅𝓉/etc.): selection transform, living as a second
  tab (Symbols / Styles) in the side panel. Secondary feature.

## Decisions so far

<!-- one line per resolved ticket: gist + link -->

- [Confirm twitter-text weighted counting](../issues/01-twitter-text-weighted-counting.md) —
  use `twitter-text` v3.1.0; `parseTweet(text, {...configs.defaults, maxWeightedTweetLength: userLimit})`
  cleanly wires the global limit and returns `weightedLength`/`valid`/`permillage`. ~50–80 kB
  gz (twemoji-parser dominates), acceptable. Watch: half-width katakana & most glyphs above
  U+10FF weigh **2** (halves effective limit for symbol-heavy posts); emoji ZWJ needs v3 config.
- [localStorage schema & persistence](../issues/03-localstorage-schema.md) — per-collection
  keys (`tt:projects/threads/posts/templates/settings/symbols/meta`), normalized `id→entity`
  maps with order as parent-held ID-arrays; nanoid ids + created/updated epoch-millis; flat
  Project›Thread›Post with a mandatory single Project + non-deletable "Unfiled" default;
  `schemaVersion` + boot migration runner (backup, no down-migrate); superset round-trip
  export with replace-on-import; 250 ms debounced auto-save flushed on hide/unload; quota =
  warn+preserve+export (never auto-delete), Recents capped at 50. See
  [ADR-0001](../../../docs/adr/0001-localstorage-persistence-schema.md).
- [Curate the sci-fi/techwear symbol dataset](../issues/02-scifi-symbol-dataset.md) — 649
  verified glyphs across 8 categories (CJK brackets, half-width katakana, box-drawing & blocks,
  geometric shapes, technical/APL, arrows, warning/status, math/logic). All BMP, no surrogate
  pairs. Drop-in dataset at `research/symbols.json`; rationale + rendering caveats in
  `research/02-symbol-dataset.md`. Note: half-width katakana still weighs 2 (see ticket 01).
- [Overall app layout & UX](../issues/05-app-layout-ux.md) — **Variant A: classic 3-pane** —
  Project/Thread navigator left · vertical Post-stack thread editor center · Symbols/Styles
  side panel docked right as a fixed third column · per-Post copy + "Open in X" in each Post
  footer · settings + JSON import/export in the top bar. Picked over B (writing-first with
  on-demand drawers) and C (horizontal TweetDeck deck) chiefly to keep the symbol browser —
  the **core** feature — always visible with zero clicks. Grey-box wireframe of all three
  variants preserved on throwaway branch `prototype/05-layout`.
- [Editor input mechanism + cursor-aware insertion](../issues/04-editor-input-mechanism.md) —
  **reverses the `<textarea>` recommendation:** `contenteditable` via **Lexical** (the way
  X.com's composer works), chosen to enable inline over-limit shading. Plain text is canonical
  (Lexical is just the surface, re-seeded on load; decorations derived at render, never
  persisted). Insert targeting = last-focused-editor + last-selection ref plus
  `onMouseDown`/`preventDefault` on panel buttons (ref covers the search-box focus case).
  Style transform = bidirectional map, normalize-to-ASCII-then-apply, mutually exclusive,
  Normal=reverse, unmapped pass-through, no-op on empty selection, mutates plain text in place.
  MVP ships over-limit red-shading (split at `parseTweet().validRangeEnd`); entity highlighting
  deferred.
- [Visual style / techwear theming](../issues/06-visual-theme.md) — **V7.4 "Kinetic Mono /
  Instrument"**: warm near-black + cream **monochrome** (bg `#141310` / surface `#1b1914` / text
  `#efe9db` / line `#2d2a23`), a **single amber signal** (`#e8a13c`) for over-limit + ruler-gauge +
  warnings, grotesque display + IBM Plex Mono codes (CJK Noto Sans JP), halftone dot fields + hairline
  rules + dingbat micro-marks, stadium pill chips, ruler-gauge counter. **Tokens + Tailwind, no
  component library.** All variants + two iteration rounds preserved in
  `prototypes/06-visual-theme.html`; full token sheet in the ticket answer.
- [App scaffold & V7.4 design tokens](../issues/07-scaffold-and-tokens.md) — Vite + React 19 +
  TS 6 + **Tailwind v4** (`@tailwindcss/vite` + `@theme`) + Lexical 0.50 + twitter-text 3.1.0 +
  nanoid, via **pnpm**. V7.4 tokens encoded as both `:root` CSS vars and Tailwind `@theme` in
  `src/index.css` (seeded from the prototype). Variant-A 3-pane shell with empty panes in
  `src/App.tsx`; thin `tt:`-namespaced localStorage layer skeleton in `src/lib/storage.ts`
  (`SCHEMA_VERSION = 1`). `tsc -b && vite build` clean; `pnpm dev` on :5173. Unblocks 08–14.
- [localStorage persistence layer](../issues/08-persistence-layer.md) — full store built on the
  `tt:` primitives: normalized in-memory working copy (authoritative; localStorage read once on
  `hydrate()`), typed CRUD API + `StoreProvider`/`useStore()` React binding (App wrapped),
  nanoid ids + created/updated ms, "Unfiled" default project seeded & non-deletable/non-renameable,
  boot migration runner (no-op@v1, backup, no down-migrate), 250 ms debounced per-collection flush
  on hide/unload, quota = warn+preserve via `onQuotaWarning` (never drops), recents cap 50, superset
  `exportStore()`/replace-`importStore()`. Verified: `pnpm test` 20/20, `pnpm build` clean, oxlint 0.
  New: `src/lib/{types,migrate,store,store.test}.ts` + `StoreContext.tsx`; vitest+jsdom devDeps.
- [Project / Thread / Post navigator (left pane)](../issues/09-navigator.md) — left pane built on
  `useStore()`: `Navigator`→`ProjectGroup`→`ThreadRow` in `src/Navigator.tsx`. Project CRUD with
  **Unfiled pinned last & locked** (rename/delete hidden for `isDefault`, store throws as backstop);
  threads grouped/collapsible with create/select/delete/reorder; new threads land in the chosen
  project via each group's `+ thread`. V7.4 via `.label-mono`/`.chip`/`.ruler`/`--sel`. Two store
  gaps this ticket exposed, now filled: `reorderThread(projectId, from, to)` (immutable splice of
  `project.threadIds`, wired through `StoreAPI`) and an **ephemeral** `SelectionContext`
  (`useSelection()`, non-persisted) — the seam ticket 10's editor reads to know the active thread.
  `App.tsx` wraps `<SelectionProvider>` + mounts `<Navigator/>`. Verified: `pnpm build` clean,
  `pnpm test` 20/20, `oxlint` exit 0. Built by a Sonnet subagent; not committed.
- [Thread & Post editor + weighted counter (center pane)](../issues/10-editor-and-counter.md) —
  `src/ThreadEditor.tsx` replaces the center placeholder: Lexical `contenteditable` per Post with
  **plain-text `Post.content` canonical** (re-seeded via `history-merge`, decorations render-only,
  never persisted); reads active thread from `useSelection()`. Weighted count via `twitter-text`
  `parseTweet(text, { maxWeightedTweetLength: settings.charLimit ?? 280 })`; **ruler-gauge** counter +
  **amber over-limit shading** as an absolutely-positioned transparent-text overlay split at
  `validRangeEnd`. Add/remove/**reorder** Posts — filled the store gap `reorderPost(threadId, from, to)`
  (mirrors `reorderThread`, wired through `StoreAPI`, +7 tests). Established the **cursor-aware insertion
  seam** #11/#12 consume: ephemeral `InsertionContext` (`useInsertion()`, `insertAtCursor()`) tracking the
  last-focused Lexical editor; callers use `onMouseDown`+`preventDefault`. `App.tsx` wraps
  `<InsertionProvider>`. Verified: `pnpm test` 27/27, `pnpm build` clean, `oxlint` exit 0. Built by a
  Sonnet subagent; not committed.
- [Symbol browser + Styles tab (right pane)](../issues/11-symbol-browser-and-styles.md) — the **core**
  feature, `src/SymbolPanel.tsx` (replaces the App placeholder). **Symbols tab:** #02 dataset copied to
  `src/data/symbols.json`, loaded via typed façade `src/lib/symbols.ts` (`searchGlyphs`/`glyphFor`);
  search box + Favorites + Recent + category-chip 6-col grid; insertion via the #10 seam
  (`onMouseDown`+`preventDefault` → `insertAtCursor`+`addRecent`), hover-star pins favorites through
  `useStore()` (Recents store-capped at 50). **Styles tab:** `src/lib/styles.ts` — 9 fancy-font styles
  (Bold/Italic/BoldItalic/Script/Mono/Double/SansBold/Fullwidth + Normal) from Mathematical-Alphanumeric
  + Fullwidth codepoints w/ Letterlike holes patched; `applyStyle` = **normalize-to-ASCII-then-map**
  (mutual exclusivity for free, Normal=reverse, unmapped pass-through), iterated by code point (SMP glyphs
  weigh 2 per #01). **New seam:** extended `InsertionContext` with `transformSelection(fn)` (in-place
  selection restyle, no-op on empty) — the primitive the Styles tab consumes, available to later tickets.
  Verified: `pnpm test` 43/43, `pnpm build` clean, `oxlint` exit 0; not committed.
- [Templates (snippet insertion)](../issues/12-templates.md) — **(revised after review to match the
  prototype)** Templates are managed in the **left navigator** (a "Templates" group under Projects),
  and a template **behaves like a Post**: selecting one opens it in the **center editor** with the
  identical Lexical surface + weighted counter (not a side form — the first right-panel-tab cut was
  reverted). Each nav row has a **copy button (⧉)** → `navigator.clipboard.writeText` + a 1.5 s
  "copied" flash, plus rename/delete; `+` creates & opens. Selection model: `SelectionContext` gained
  `selectedTemplateId` **mutually exclusive** with `selectedThreadId`. Refactor: the Lexical body +
  overlay + ruler-gauge were extracted from `ThreadEditor` into **`src/WeightedTextEditor.tsx`**
  (`EditableTextBody`/`RulerGauge`/`parseWeighted`) so `PostEditor` and the new
  **`src/TemplateEditor.tsx`** share one editing surface. **Manual save**: the template edits into a
  local draft and only persists via `updateTemplate` on **Save** (which does not close the editor); a
  title-bar pill shows `● unsaved`/`saved`. A `⧉ copy` chip in the card footer copies to clipboard (plus the nav-row
  quick-copy). The #10 insertion seam works into templates too. **Drag-and-drop (native HTML5, no
  lib):** templates are draggable to reorder — added a **`Template.order`** field + **`reorderTemplate(id,
  beforeId)`**; threads are draggable to reorder **and move across projects** (replacing ▲▼) via
  **`moveThread(threadId, toProjectId, beforeThreadId)`**, with project headers/empty zones as drop
  targets. MVP = snippets only; whole-thread skeletons stay fog. Verified: `pnpm build` clean, `oxlint
  src/` exit 0, `pnpm test` **52/52** (+9 for moveThread/reorderTemplate); not committed. Files:
  `Navigator.tsx`, `TemplateEditor.tsx` (new), `WeightedTextEditor.tsx` (new), `ThreadEditor.tsx`,
  `SelectionContext.tsx`, `types.ts`, `store.ts`, `StoreContext.tsx`, `store.test.ts`.

## Not yet specified

Fog — graduates into sharp tickets as the decisions above resolve:

- **Build/execution work** — **all decisions resolved; graduated into execution tickets 07–14.**
  **07 scaffold+tokens, 08 persistence, 09 navigator, 10 editor+counter, 11 symbol browser+Styles,
  and 12 templates are now resolved.** Remaining frontier — **13 settings/import-export,
  14 copy+Open-in-X** — both unblocked and independently takeable (they consume `useStore()`; no
  ordering forced among them). Seams now live: `useSelection()` (`src/lib/SelectionContext.tsx`,
  active thread) and the **cursor-aware insertion seam** `useInsertion()` in
  `src/lib/InsertionContext.tsx` — `insertAtCursor()` (established by 10) **plus `transformSelection()`
  (added by 11** for in-place selection restyle). **12 put Templates in the left nav and made a template
  edit in the center pane like a Post** — extracting the shared editing surface into
  `src/WeightedTextEditor.tsx` (consumed by both `PostEditor` and the new `TemplateEditor`) and adding
  `selectedTemplateId` to `SelectionContext` (mutually exclusive with `selectedThreadId`); Symbols/Styles
  insert into a template via the same #10 seam. Note for 13: the editor already reads
  `settings.charLimit ?? 280`, so wiring the global-limit setting lights up the counter.
- Whole-thread **template skeletons** (MVP ships snippet templates only).
- **Per-thread** char-limit override (MVP ships a single global limit).
- **Import merge semantics** (MVP ships replace-on-import only; merge-by-id is a harder,
  later feature — surfaced while resolving #3).
- ~~**Inline entity highlighting**~~ — **pulled in early** during #11 polish (user request):
  @mentions / #hashtags / $cashtags / URLs now tint via twitter-text `extractEntitiesWithIndices`
  in the same overlay as over-limit shading (`HighlightOverlayPlugin` in `src/ThreadEditor.tsx`,
  code-point-space). Rendered as a subtle cream `var(--sel)` tint rather than a new hue, to keep
  the theme monochrome (accent == fg here); over-limit amber still wins on overlap.

## Out of scope

- Backend, API posting to X, or authentication.
- Full Unicode-table browsing (ruled out during charting — curated set only).
