# Prototype: mobile / tablet responsive layout

Type: prototype
Status: resolved
Assignee: iambaangkok
Blocked by:

## Question

The responsive spec frame is settled in [#16](16-responsive-mobile-layout.md): single 768px
breakpoint, mobile bottom-tab layout (default Editor), symbols via a 2-row quick-insert strip
above the keyboard, near-full-width settings sheet, ≥44px touch targets, ruler-gauge/overlay
unchanged, and a 1080px ultra-wide cap (already built). What's still fuzzy are the interaction
details — settle them with a **rough responsive mock** (`/prototype`, HITL) before building:

- **Templates segment:** does the mobile bottom-tab bar get a 4th **Templates** segment, or do
  Templates stay inside the "Threads" segment (they live in the left navigator today, #12)?
  Default assumption = stay within Threads; the mock should make the trade-off concrete.
- **Symbol strip ↔ full browser:** the 2-row above-keyboard strip covers favorites/recents
  quick-insert. Where does the *full* Symbol/Styles browser (search + categories + Styles +
  favorites management) live on mobile — an expand-to-sheet from the strip, or its own tab?
- **Tablet / phone-landscape (~768–1080):** the desktop 3-pane at ~768 leaves a very cramped
  center (200 nav + 220 panel). Does the right panel need to become collapsible/toggleable in
  that band, or is it acceptable? Confirm landscape phone behavior too.

Mock the mobile portrait view, the above-keyboard strip, and one awkward-middle-width tablet
view. Link the prototype as an asset.

Done when the above three questions are decided and captured, ready to hand to the build ticket.

## Resolution

Settled via an iterated V7.4-language mock (4 revs, HITL) — asset:
[prototypes/17-mobile-responsive.html](../prototypes/17-mobile-responsive.html). All three fuzzy
questions decided, plus a restructure of the symbol UI around the real usage (browse **new**
glyphs while writing a post/template; use favorites; new post from template).

- **Templates segment → nested under Threads.** Mobile bottom bar is **2 tabs: Threads · Editor**
  (default Editor). Templates live behind a **Threads | Templates** segment inside the Threads tab
  (matches the single left navigator, #12). No 4th tab.
- **Full Symbol/Styles browser → an in-editor "glyph dock", no standalone Symbols tab.** The symbol
  UI split from the tab and moved onto the writing surface, with three heights:
  1. **Default = slim handle** — a dimmed `Glyphs ▲` pill; writing owns the screen, tap to raise.
  2. **Raised = Favorites + Recent** quick-insert strip (enlarged ~40px cells), each section
     **independently collapsible** (▾/▸); inserts via the existing `insertAtCursor()` seam (#10).
  3. **Browse = ⤢ full browser** — search · category chips · full grid · **Styles** tab (+ favorites
     management, #15); the **keyboard hides** and the sheet grows to **~70%** of the screen, still
     inside the post/template. Collapse back to strip/handle to keep typing. Same dock serves the
     Template editor (#12 shares the `WeightedTextEditor` surface).
- **Tablet / phone-landscape (~768–1080) → both sidebars user-collapsible.** Keep the 3-pane; the
  left Navigator **and** the right Symbols panel each collapse to a labelled rail (tap rail or a
  pane chevron). **None auto-collapse — both open by default.** Keyboard-open just compresses the
  panes into the height above the keyboard; the **right panel keeps serving glyphs** (no dock on
  tablet). Same behaviour covers landscape phone.

Hands off to build **#18** (now unblocked). New build detail beyond #16's frame: the glyph-dock
three-state control and the `browse-all` sheet (~70%, keyboard-dismissing) are the main new pieces;
the desktop right panel gains collapse on tablet widths.
