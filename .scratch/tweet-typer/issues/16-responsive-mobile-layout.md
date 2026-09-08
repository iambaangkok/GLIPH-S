# Responsive layout for mobile / vertical phone screens

Type: grilling
Status: resolved
Blocked by:

## Question

The app is a fixed 3-pane desktop shell (Variant A, locked in #05): Project/Thread navigator
left · Post-stack editor center · Symbols/Styles panel right, with a settings top bar. On a
narrow vertical phone that CSS grid doesn't fit. Make the app usable on a phone in portrait
while **keeping the UI substantially the same** as desktop.

This is a **decision** ticket first — confirm the spec and where things go before building.
Resolve via `/grilling` + `/domain-modeling`; a `/prototype` (rough responsive mock) may help.
Open questions to settle:

- **Breakpoint(s):** what width flips desktop → mobile? One breakpoint or a tablet middle state?
- **Pane strategy on narrow screens:** the three panes can't sit side-by-side. Do they become
  bottom-tab / segmented views, slide-in drawers, or a vertical stack? Which is the default view
  on open?
- **Symbol browser placement:** it's the **core** feature and is "always visible, zero clicks"
  on desktop (#05). On a phone that trades off against editor space — where does it live
  (drawer over the editor? a tab? a toolbar strip above the keyboard)?
- **Top bar & settings popover:** how does the top-bar cluster (char-limit readout + settings
  popover, #13) behave in a narrow bar?
- **Editor & counter:** touch targets, the ruler-gauge counter, and the amber over-limit overlay
  on small widths — anything that must change vs. stay identical.
- **Scope:** portrait phones only, or also landscape / tablet? Is this MVP or post-MVP?

Note: destination is a "locked MVP spec"; if responsive is judged post-MVP, it may be recorded as
out of scope for the current effort rather than built. Settle that during the grill.

Done when the mobile layout spec is agreed (breakpoints + per-pane behavior + symbol-browser
placement), ready to hand to a build ticket.

## Answer

**Scope decision:** responsive is **in-MVP** — portrait phone **and** landscape / tablet all
land in this effort (not deferred, not out of scope). Because the remaining mobile *interaction*
details are still fuzzy, this grilling ticket settles the spec-level frame and graduates the
fuzzy parts into a **prototype** ticket, with a **build** ticket blocked behind it.

### Settled here (spec)

- **Ultra-wide max-width cap (rider request — already built this session).** The **whole
  3-pane shell** is centered and capped at **`--shell-max-w: 1080px`**; `--bg` letterboxes the
  sides, with a hairline `--line` border on the inner shell edges. At 1080 the fixed
  nav (200) + panel (220) leave a ~660px center — on par with X.com's compose column, so short
  posts read fine. Implemented in `src/App.tsx` (flex-center wrapper around the grid) +
  `--shell-max-w` token in `src/index.css`; `pnpm build` clean. **Independent of the mobile
  work** — ships now.
- **Breakpoint:** single hard flip at **768px**. `≥768` = desktop 3-pane (fluid up to the
  1080 cap); `<768` = mobile layout. No separate tablet middle-state in CSS — iPad-class widths
  (≥768) get the desktop 3-pane; ensuring it *stays usable* at ~768 (cramped center) is a
  prototype concern (see below), not a new breakpoint.
- **Mobile pane strategy (`<768`):** **bottom tab bar**, one full-screen pane per segment,
  top bar retained. Default view on open = **Editor**.
- **Symbol browser on mobile:** primary access is a **2-row quick-insert strip docked above
  the on-screen keyboard** while an editor is focused (favorites + recents, tap to insert) —
  chosen over a full Symbols tab as the *default* touch. The full Symbol/Styles browser
  (search + categories + Styles + favorites management) still needs a home on mobile — **how it
  relates to the strip is a prototype question** (expand-from-strip sheet vs. its own tab).
- **Top bar & settings (`<768`):** keep the bar; wordmark may abbreviate; char-limit readout +
  `⚙` popover stay, but the popover renders as a **near-full-width sheet** under the bar rather
  than a narrow floating card.
- **Editor & counter (`<768`):** ruler-gauge + amber over-limit overlay stay **identical**
  (already width-fluid); only bump touch targets — Post footer chips (`⧉ copy`, `↗ 𝕏`),
  add/reorder controls — to ≥44px tap height. Drag-reorder stays (may be finicky on touch;
  acceptable for MVP).

### Graduated (open questions handed to the prototype)

- **Templates as its own bottom-tab segment?** Templates live inside the left navigator today
  (#12). Default assumption = they stay *within* the "Threads" segment (matches desktop / "keep
  the UI substantially the same"); the prototype validates whether a 4th **Templates** segment
  is warranted.
- **Symbol strip ↔ full-panel relationship** on mobile (expand-to-sheet vs. dedicated tab).
- **Tablet / phone-landscape at the awkward middle widths** (esp. ~768–1080 where the desktop
  3-pane gets cramped — does the right panel need to become collapsible there?).

These graduate into **[Prototype: mobile / tablet responsive layout](17-mobile-responsive-prototype.md)**
(HITL, `/prototype`), which then unblocks **[Build responsive / mobile layout](18-responsive-layout-build.md)**.
