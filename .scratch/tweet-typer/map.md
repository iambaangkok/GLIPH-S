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
- [Settings: global char-limit + JSON export/import](../issues/13-settings-and-import-export.md) —
  top-bar settings/misc cluster (`src/SettingsMenu.tsx`, mounted in `App.tsx`, replacing the
  `280`/`⚙`/`⇄ json` placeholders). The store already had `updateSettings`/`exportStore`/`importStore`
  (#08) and the editor already read `settings.charLimit ?? 280` (#10) — so this was pure UI. A live
  `280`-style **readout chip** + a `⚙` **popover**: numeric **global char-limit** field committing to
  `settings.charLimit` on valid parse (int 1..100000; blur re-seeds), which re-weights every Post live;
  **Export JSON** downloads the superset envelope as `tweet-typer-YYYY-MM-DD.json`; **Import JSON** (hidden
  file input) reads the file → **danger confirm** via `useDialog()` → `importStore()` (replace-on-import),
  with store errors shown as an inline amber status line. Import/export lives *inside* the popover (not a
  primary control) per the ticket. Popover closes on outside-click/Escape; popover CSS in `index.css`.
  Per-thread limit + merge-by-id import stay fog. Verified: `pnpm build` clean, `pnpm test` 52/52,
  `oxlint src/` exit 0; not committed.
- [Per-Post copy + "Open in X" intent link](../issues/14-copy-and-open-in-x.md) — the two per-Post
  output controls (**option C**) in each Post footer of `src/ThreadEditor.tsx` (`PostEditor`), matching
  the #12 template-footer treatment. Both are **symbol-only, dimmed** stadium chips (user-revised — no
  amber primary): **Copy** = `⧉ copy` → `clipboard.writeText(liveText)` with a 1.5 s amber `copied` flash;
  **Open in X** = `↗ 𝕏` **anchor** to `https://x.com/intent/post?text=${encodeURIComponent(liveText)}`
  (`target=_blank` + `rel=noopener`). Both **disabled on an empty Post** (anchor via new `chip--disabled`
  + `aria-disabled` + preventDefault, since `:disabled` skips `<a>`); descriptive aria-labels kept. Pure
  UI — the Post's plain text is already the live counter state. CSS: `a.chip`/`a.chip:hover`/`.chip--disabled`
  in `src/index.css`. **Thread-level "Open in X" isn't possible** — `intent/post` prefills one composer
  only; multi-post threading needs the X API + auth (already Out of scope). (Output option D — JSON
  export/import — already shipped in #13.) Verified: `pnpm build` clean, `pnpm test` 52/52, `oxlint src/`
  exit 0; not committed.

- [Collapsible Favorites/Recents + persist collapse & active selection + drag-reorder Favorites](../issues/15-collapsible-persist-selection-reorder-favorites.md) —
  UI/interaction state moved into a **new persisted `tt:ui` store** (not folded into `settings`):
  `{ favoritesCollapsed, recentsCollapsed, selectedThreadId, selectedTemplateId }`, wired through the
  store layer like every collection (`StorageKey.ui`, `emptyUi()` seed with forward-merge on hydrate,
  `updateUi()` API, and the export envelope). Symbol-panel Favorites/Recent are now collapsible
  (`CollapsibleSectionLabel`, chevron) with the flag persisted. **`SelectionContext` is no longer
  ephemeral** — it seeds from `tt:ui` **validated against the live store**, mirrors every set back
  (keeping Thread/Template mutual exclusivity), and drops a dangling selection on delete/replace-import
  (guarded in both `SelectionContext` and `importStore`). Favorites drag-reorder via new
  `reorderFavorite(symbol, beforeSymbol)` + `FAVORITE_MIME` + an `axis` param on `dropHalf`/`dropShadow`
  (grid → left/right indicator); `GlyphCell` got a separate corner drag grip so the insert button's
  `onMouseDown`+`preventDefault` doesn't cancel the drag. Recents stay most-recent-first. Verified:
  `pnpm test` **63/63**, `pnpm build` clean, `oxlint src/` exit 0; not committed.

- [Responsive layout for mobile / vertical phone screens](../issues/16-responsive-mobile-layout.md) —
  responsive is **in-MVP** (portrait phone + landscape + tablet, not deferred). Settled the spec
  frame: **single 768px breakpoint** (≥768 desktop 3-pane fluid up to the cap; <768 mobile);
  mobile = **bottom-tab bar, one pane per segment, default Editor**, top bar retained; **symbols
  via a 2-row quick-insert strip above the keyboard** (favorites+recents) as the default touch;
  settings popover → **near-full-width sheet**; **≥44px touch targets**, ruler-gauge/amber overlay
  unchanged. **Ultra-wide cap built this session** (rider request): whole shell centered + capped at
  `--shell-max-w: 1080px` with `--bg` letterbox + hairline edge (`src/App.tsx` + `src/index.css`,
  `pnpm build` clean). Fuzzy interaction details graduated to **prototype #17** → **build #18**:
  Templates-as-4th-segment?, the strip ↔ full-browser relationship, and tablet/~768–1080 middle-band
  (collapsible right panel?).

- [Prototype: mobile / tablet responsive layout](../issues/17-mobile-responsive-prototype.md) —
  settled #16's fuzzy interaction details via an iterated V7.4-language mock (HITL, 4 revs;
  asset [prototypes/17-mobile-responsive.html](../prototypes/17-mobile-responsive.html), rebranded
  GLIPH-S). **Templates → nested** under a Threads|Templates segment; mobile bottom bar is **2 tabs
  (Threads · Editor)**. **No standalone Symbols tab** — the symbol UI moves onto the writing surface
  as an in-editor **glyph dock** with three heights: (1) default **slim `Glyphs ▲` handle**, (2)
  raised **Fav + Recent** strip (enlarged, each independently collapsible; inserts via `insertAtCursor()`),
  (3) **⤢ full browser** (search · categories · **Styles** · favorites mgmt) that **hides the keyboard**
  and grows to **~70%**, still in the post/template — same dock serves the Template editor. **Tablet
  (~768–1080): both** the left Navigator and right Symbols panel are **user-collapsible to a rail**,
  **none auto-collapse** (both open by default); keyboard-open compresses the panes with the right
  panel still serving glyphs. Unblocks build **#18**.

- [Build responsive / mobile layout](../issues/18-responsive-layout-build.md) — **shipped the full
  responsive build** per #16/#17. Single 768px breakpoint flips two structurally-different shells in
  React (new `useMediaQuery`, `MOBILE_QUERY`) rather than in CSS (mobile *reparents* the symbol
  browser, which CSS can't do); both stay under the existing 1080 cap + letterbox. **Desktop (≥768):**
  both sidebars now user-collapsible to a 40px rail (`--rail-w`, new `CollapsiblePane` + `.pane-hdr`/
  `.pane-rail`), **default open** so wide screens read unchanged. **Mobile (<768):** `MobileShell` =
  retained top bar + `.tabbar` (**Threads · Editor**, default Editor) + full-screen panes; Threads tab
  = full `<Navigator/>` (Templates already nested → no 4th tab); Editor tab = post stack + new
  **`src/GlyphDock.tsx`** three-state dock (**handle → strip(44px Fav+Recent, `tt:ui`-collapsible,
  `insertAtCursor`) → browse(reuses `<SymbolPanel/>` @70vh, keyboard dismisses)**). Settings →
  `.popover--sheet` near-full-width (new `sheet` prop). ≥44px touch targets scoped to a
  `.touch-region`. Ruler-gauge/amber overlay untouched. Verified `pnpm build` clean, `pnpm test`
  **63/63**, `oxlint src/` exit 0; not committed. Deferred as cosmetic: the prototype's internal
  Threads|Templates segment (full Navigator already satisfies the settled "single navigator" decision).

- [Deploy GLIPH-S as a static site on Cloudflare Pages (custom domain)](../issues/19-deploy-cloudflare-pages.md) —
  **GLIPH-S is live at https://gliph-s.iambaangkok.dev/.** Bought `iambaangkok.dev` as a personal-home
  root; GLIPH-S served at the **`gliph-s` subdomain** (Vite `base` stays `'/'`, no code change).
  Deployed as a Cloudflare **Worker with Static Assets** (not classic Pages) via Git integration
  (auto-build on push to `master`, `pnpm build` → `dist`) + a new `wrangler.jsonc` (assets-only,
  `assets.directory: ./dist`, name `gliph-s`). Free auto-TLS. Two deploy blockers fixed en route:
  `pnpm-workspace.yaml` missing `packages:` (commit `0e0cbc7`) and missing wrangler assets config
  (commit `8a2489d`). "BK SYSTEMS" kept as UI wordmark, not the address.

## Not yet specified

Fog — graduates into sharp tickets as the decisions above resolve:

- **Shipping / deployment — LIVE.** GLIPH-S is live on Cloudflare at
  https://gliph-s.iambaangkok.dev/ (see the deploy decision above). `iambaangkok.dev` is on
  Cloudflare and can host future project subdomains.

- **Analytics** — now that it's live, know whether anyone visits. Open frontier ticket:
  [Add Google Analytics (GA4) to GLIPH-S](../issues/20-google-analytics.md) — a setup guide (task):
  GA4 property → gtag snippet in `index.html` → verify in Realtime. Notes a cookieless Cloudflare
  Web Analytics alternative. **Currently the sole open frontier ticket.**

- **Contributor workflow** — [CLAUDE.md](../../../CLAUDE.md) now codifies: work on a branch (never
  commit to master directly), and any website change landing on master bumps the app version
  (badge in `src/App.tsx` + `package.json`, kept in sync).

- **Build/execution work** — **all decisions resolved; graduated into execution tickets 07–14, and
  every one of 07–14 is now resolved** (07 scaffold+tokens, 08 persistence, 09 navigator, 10 editor+counter,
  11 symbol browser+Styles, 12 templates, 13 settings/import-export, 14 copy+Open-in-X). The original
  MVP execution set is complete; later polish/UX lives in tickets 15–16 — **both now resolved**.
  Responsive work is **complete: 16's graduated children — prototype #17 → build #18 — are both
  now resolved.** #18 shipped the mobile 2-tab shell + in-editor glyph dock, desktop collapsible
  sidebars, mobile settings sheet, and ≥44px touch targets. **The MVP + responsive + shipping set is
  complete and live; the open frontier is now post-launch: analytics (#20).** Seams live: `useSelection()`
  (`src/lib/SelectionContext.tsx`, active thread — **now persisted to the `tt:ui` store** added by 15)
  and the **cursor-aware insertion seam** `useInsertion()` in
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
