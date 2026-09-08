# App scaffold & V7.4 design tokens

Type: task
Status: resolved
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

## Answer

Scaffolded by a Sonnet agent; build verified clean (`tsc -b && vite build` — 16 modules,
zero errors; `pnpm dev` serves on :5173). Package manager: **pnpm** (installed globally, was absent).

**Stack (exact versions):** react/react-dom 19.2.8 · lexical + @lexical/react 0.50.0 ·
twitter-text 3.1.0 (pinned) · nanoid 6.0.1 · tailwindcss + @tailwindcss/vite 4.3.3 ·
typescript 6.0.3 · vite 8.2.2.

**Files added at repo root** (`.scratch/`, `docs/`, `CONTEXT.md`, `.gitignore` untouched):
`index.html` (Google Fonts: Space Grotesk / IBM Plex Mono / Noto Sans JP) · `package.json` ·
`pnpm-lock.yaml` · `pnpm-workspace.yaml` (`allowBuilds: core-js` — transitive twitter-text dep) ·
`vite.config.ts` · `tsconfig.{app,node}.json` · `public/favicon.svg` · `src/index.css` ·
`src/main.tsx` · `src/App.tsx` (Variant-A 3-pane shell) · `src/lib/storage.ts`.

**Tokens:** encoded BOTH as CSS custom properties (`:root`) AND Tailwind v4 `@theme` block in
`src/index.css` (bg `#141310` / surface `#1b1914` / surface-2 `#100f0c` / fg `#efe9db` /
muted `#8b8577` / line `#2d2a23` / signal amber `#e8a13c`), seeded from
`prototypes/06-visual-theme.html`. Usable as `var(--bg)` or Tailwind utilities (`bg-bg`, `text-fg`).

**Shell:** Variant-A 3-pane — topbar (settings/import-export) + left navigator + center Post-stack
editor + right Symbols/Styles panel, all empty placeholders, themed.

**Storage layer:** `src/lib/storage.ts` — `storageGet/Set/Remove/Snapshot`, `readSchemaVersion`,
`writeSchemaVersion`, `SCHEMA_VERSION = 1`, `StorageQuotaError`, under the `tt:` namespace.
Skeleton only; domain types + migration runner + 250ms debounce auto-save are ticket 08's job.

**Deviations:** pnpm installed globally (was missing); Tailwind **v4** (`@tailwindcss/vite` +
`@theme` in CSS, no `tailwind.config.ts` / `postcss.config.js` — correct for v4); fonts via
Google Fonts `<link>`; `StorageQuotaError` uses explicit field assignment to satisfy TS6
`erasableSyntaxOnly`. Changes left uncommitted in the working tree.

**Downstream:** ticket 08 owns persistence proper on top of `storage.ts`; ticket 04's Lexical
editor drops `<LexicalComposer>` into the center pane (deps already installed).
