# Build responsive / mobile layout

Type: task
Status: resolved
Assignee: iambaangkok
Blocked by: 17

## Task

Implement the responsive layout per the settled spec in [#16](16-responsive-mobile-layout.md)
and the interaction decisions from the prototype [#17](17-mobile-responsive-prototype.md).
The ultra-wide 1080px cap is **already built** (`src/App.tsx` + `--shell-max-w`); this ticket is
the `<768` mobile layout + the tablet/landscape middle band.

- **Breakpoint at 768px.** `≥768` keeps the desktop 3-pane grid (fluid up to the 1080 cap);
  `<768` switches to the mobile layout. Prefer a CSS media query / container approach over JS
  where possible (the shell in `src/App.tsx` is currently inline-styled — decide whether to move
  the grid into `index.css` classes so it can flip at the breakpoint).
- **Mobile bottom-tab bar** — one full-screen pane per segment (segment set per #17: Threads /
  Editor / Symbols, plus Templates-as-segment iff #17 says so), top bar retained, default view =
  Editor.
- **2-row above-keyboard symbol strip** for quick-insert (favorites + recents), wired through the
  existing `useInsertion()` seam (`insertAtCursor`). Full Symbol/Styles browser placement per #17.
- **Settings popover → near-full-width sheet** under the top bar on `<768` (`src/SettingsMenu.tsx`).
- **Touch targets ≥44px** on Post footer chips + add/reorder controls; ruler-gauge + amber overlay
  stay identical.
- **Tablet / landscape middle band** handling per #17 (e.g. collapsible right panel if decided).

Verify `pnpm build` clean, `pnpm test` green, `oxlint src/` exit 0.

Done when the app is usable in portrait phone, landscape, and tablet, matching the #16/#17 spec,
with desktop unchanged above 768px.

## Answer

Built the full responsive layout per #16's frame and #17's interaction decisions. A single
768px breakpoint flips two structurally-different shells; both stay under the existing 1080px
ultra-wide cap + letterbox (kept as-is). Verified: `pnpm build` clean, `pnpm test` **63/63**,
`oxlint src/` exit 0. Not committed.

**Breakpoint mechanism.** Since the two layouts differ *structurally* (mobile reparents the
symbol browser into an in-editor dock — pure CSS can't reparent), the shell branches in React on
a media query rather than flipping in CSS. New `src/lib/useMediaQuery.ts` (`useSyncExternalStore`
over `matchMedia`) + exported `MOBILE_QUERY = '(max-width: 767px)'`. `App.tsx` now renders
`<DesktopShell/>` (≥768) or `<MobileShell/>` (<768) inside the unchanged letterbox wrapper. The
inline grid was left inline (not moved into `index.css`) because the JS branch already owns the
flip; the ticket's "decide whether to move the grid to CSS" is thus resolved *no*.

**Desktop (≥768) — collapsible sidebars (#17 tablet/landscape band).** New `CollapsiblePane`
helper: each sidebar gets a slim `.pane-hdr` with a collapse chevron; collapsed it folds to a
40px `.pane-rail` (`--rail-w`) with a vertical label + expand chevron. Grid columns switch
`--nav-w`/`--panel-w` ↔ `--rail-w`. **Neither auto-collapses; both default open**, so wide
screens read as the original 3-pane layout (only the thin pane headers are new — that header *is*
the collapse affordance, matching the #17 prototype's `.navhdr`). Collapse state is local
(non-persisted) — #15 only persisted favorites/recents collapse + selection.

**Mobile (<768) — 2-tab shell + glyph dock.** `MobileShell`: retained top bar, a `.tabbar`
bottom bar with **Threads · Editor** (default **Editor**, #17), one full-screen pane each. Both
tab bodies stay mounted so editor/scroll + dock state survive tab switches. Threads tab = the
full `<Navigator/>` (Projects + Templates already coexist there, satisfying "Templates nested
under Threads, no 4th tab"). Editor tab = `<CenterEditor flush/>` + the new `<GlyphDock/>`.

**Glyph dock** (`src/GlyphDock.tsx`) — the mobile home for the symbol UI, three heights:
1. **handle** — slim dimmed `Glyphs ▲` pill; tap to raise.
2. **strip** — Favorites + Recent quick-insert rows (44px cells, horizontal scroll), each
   **independently collapsible via the same `tt:ui` `favoritesCollapsed`/`recentsCollapsed`
   flags** the desktop panel uses (#15); inserts via the `insertAtCursor()` seam (#10) + `addRecent`.
   Header carries `⤢ browse all` + a `▾` back-to-handle.
3. **browse** — reuses the whole `<SymbolPanel/>` (search · categories · grid · **Styles** +
   favorites mgmt) in a `70vh` sheet; the keyboard dismisses naturally because taps land outside
   the editor, and the `insertAtCursor` seam targets the last-focused editor even without focus.
   Same dock serves the Template editor (both register via InsertionContext). No standalone
   Symbols tab.

**Settings sheet.** `SettingsMenu` gained a `sheet?` prop; on mobile (`sheet={mobile}`) the
popover renders with `.popover--sheet` — `position:fixed`, near-full-width under the top bar.
Outside-click/Escape close still works (still a DOM descendant of the trigger root).

**Touch targets ≥44px.** Scoped to a `.touch-region` wrapper around the mobile body so the compact
40px top bar keeps its size: `@media (max-width:767px)` bumps `.chip` (inline-flex, min-height
44), `.icon-btn` (44×44), `.nav-row` (min-height 44) inside it. Dock cells are 44px directly. The
ruler-gauge + amber over-limit overlay are untouched (shared `WeightedTextEditor`).

**Files:** `src/lib/useMediaQuery.ts` (new), `src/GlyphDock.tsx` (new), `src/App.tsx` (rewritten
into Desktop/Mobile shells), `src/SettingsMenu.tsx` (`sheet` prop), `src/index.css` (`--rail-w` +
pane-hdr/rail, tabbar, dock, sheet, touch-region blocks).

**Deferred as polish (not blocking the destination):** the #17 prototype's internal
**Threads | Templates** segment inside the Threads tab was *not* built — the full Navigator (which
already shows both) is routed into the Threads tab, which satisfies the settled decision
("single left navigator, no 4th tab"). Splitting Navigator into threads-only/templates-only views
is cosmetic and was left out to avoid churn in the 22 KB Navigator.

## Follow-up fixes (post-review on device)

Two touch gaps surfaced when exercising the build on a phone:

1. **Drag-to-reorder was dead on touch** (threads reorder + cross-project move, templates
   reorder, favorites reorder — and posts, same cause). All reordering uses the native HTML5 Drag
   API, which **does not fire on touch devices** at all. Fixed by adding the **`drag-drop-touch`**
   polyfill (1.3.1): a side-effect `import 'drag-drop-touch'` in `src/main.tsx` self-initialises a
   singleton that translates touch events into standard HTML5 drag events, so **every existing
   native-DnD list works on touch with zero per-component changes** (dropHalf/dropShadow indicators
   included). Added `src/drag-drop-touch.d.ts` ambient decl (no bundled types). It attaches
   listeners only when `'ontouchstart' in document`, so desktop is untouched.

2. **Glyph dock height wasn't adjustable** — it only snapped between fixed handle/strip/browse
   sizes via buttons. Reworked `src/GlyphDock.tsx` so the **grip bar is drag-to-resize** (pointer
   events → mouse + touch; `touch-action:none`): drag up/down to set the tray height freely (clamped
   MIN 120px … ~70vh), drag (almost) shut to collapse. The **▾ collapse button stays** as a discrete
   shortcut, a tap on the collapsed grip opens to a default height, and ↑/↓/Enter give keyboard
   resize (grip is `role="separator"`). Content mode is now an independent **⤢ browse all / ⇲ quick**
   toggle (browse grows the dock for room); strip = the Fav+Recent rows as before. New dock CSS
   (`.dock`/`.dock-grip`/`.dock-toolbar`/`.dock-body`) replaced the old fixed-state classes.

3. **Entity highlight misaligned across astral glyphs** (latent #11 bug, surfaced by the #11
   "fancy font" styles). The highlight overlay classifies text per **code point** (`Array.from`),
   but twitter-text `extractEntitiesWithIndices` returns **UTF-16 code-unit** offsets — the two
   diverge once SMP glyphs appear earlier in the text. Repro: `⛬ 𝗦𝗛𝗜𝗣 𝗠𝗘𝗖𝗛𝗔𝗡𝗜𝗖 … #TheEmergenceOfMardines`
   has 12 SMP chars before the hashtag, so the tag highlighted 12 code points late (only
   "eOfMardines"). Fixed in `src/WeightedTextEditor.tsx` by converting the indices with
   `twitterText.modifyIndicesFromUTF16ToUnicode(text, entities)` before mapping onto the code-point
   array; added that fn to `src/twitter-text.d.ts` and corrected its mislabelled index-space comment.
   `parseTweet().validRangeEnd` is already code-point space, so over-limit shading was unaffected.

Re-verified: `pnpm build` clean, `pnpm test` **63/63**, `oxlint src/` exit 0. New dep:
`drag-drop-touch@1.3.1`.

## Status: COMPLETED

Responsive build + all three follow-up fixes shipped and verified. Ticket closed.
