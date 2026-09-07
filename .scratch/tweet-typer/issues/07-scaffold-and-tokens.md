# App scaffold & V7.4 design tokens

Type: task
Status: open
Blocked by: —

## Task

Stand up the project and the theme layer everything else builds on.

- Vite + React + TypeScript + Tailwind + Lexical + a thin localStorage sync layer (per the stack
  decision on the map).
- Encode the **V7.4 "Kinetic Mono / Instrument"** tokens (see
  [ticket 06 answer](./06-visual-theme.md)) as Tailwind theme config + CSS custom properties:
  `--bg #141310`, `--surface #1b1914`, `--surface-2 #100f0c`, `--fg #efe9db`, `--muted #8b8577`,
  `--line #2d2a23`, signal amber `#e8a13c`. Fonts: grotesque display (Space Grotesk) + IBM Plex Mono
  + Noto Sans JP. No component library.
- App shell = the locked **Variant-A 3-pane** frame (empty panes) so downstream tickets fill it in.
- Seed the CSS-variable block from `prototypes/06-visual-theme.html` `.app` styles.

Done when the shell renders themed empty panes and `pnpm dev` runs clean.
