# Prototype: mobile / tablet responsive layout

Type: prototype
Status: open
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
