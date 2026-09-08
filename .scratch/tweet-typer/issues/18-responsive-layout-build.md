# Build responsive / mobile layout

Type: task
Status: open
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
