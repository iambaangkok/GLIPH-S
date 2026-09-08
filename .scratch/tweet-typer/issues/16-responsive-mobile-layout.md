# Responsive layout for mobile / vertical phone screens

Type: grilling
Status: open
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
