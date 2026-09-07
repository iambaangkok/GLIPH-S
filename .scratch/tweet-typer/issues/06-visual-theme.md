# Visual style / techwear theming

Type: prototype
Status: resolved
Blocked by: —

## Question

Establish the visual design direction — the "discuss separately" thread the user flagged.

Anchor aesthetic: **sci-fi / techwear / industrial-micrographic** (Ghost-in-the-Shell /
攻殻機動隊, industrial labels, micrographic technical marks) — the same direction driving the
curated symbol set (#2).

Explore and land on:

1. Overall mood & references (dark industrial HUD? clean techwear mono? terminal-like?).
2. Type system — likely a strong monospace / technical typeface pairing; how CJK renders.
3. Color palette — base, surfaces, accent(s), warning/status colors that echo the dingbat set.
4. Motion & texture — micro-interactions, scanlines/grid textures, restraint level.
5. Component treatment for the core surfaces (navigator, post editor, side panel, counter).
6. How much is CSS/Tailwind design tokens vs. a heavier component library (recommend tokens +
   Tailwind, given the stack decision).

Deliver a cheap concrete artifact to react to (mood board, token sheet, or a styled stub via
`/prototype`) and link it from this ticket. Independent of the other tickets; can run anytime.
Consider consulting a design skill (e.g. `design-taste-frontend`, `industrial-brutalist-ui`).

## Prototype

Styled stub — six theme variants applied to the locked Variant-A 3-pane layout, comparable
like-for-like: [prototypes/06-visual-theme.html](../prototypes/06-visual-theme.html) (open in a
browser). Ordered restrained → loud:

1. **Kōkaku HUD** — dark GITS operator console: teal on near-black, corner brackets, faint scanlines.
2. **Clean Techwear Mono** — off-white paper, near-black ink, one safety-orange accent, huge whitespace. *(agent recommendation)*
3. **Phosphor Terminal** — CRT green (switchable amber) on black, all-monospace, bloom.
4. **Blueprint Micrographic** — cyan hairlines on deep navy, drafting grid + registration marks.
5. **Brutalist Data Slab** — concrete grey, hard black borders, hazard-yellow, zero radius.
6. **Neon Cyber-noir** — glassy dark, magenta+cyan neon glow, gradient wash (loudest).

User reaction: likes 1, 2, 4 (mainly **1 and 2**); keep all originals. Added a
`micrographics refs/` reference set (14 PNGs) — a warm near-black + cream **monochrome** system:
bold grotesque display + wide-tracked mono codes, stadium/pill chips, ruler ticks, and technical
dingbat marks (CE/®/⇄/!/circled-numbers/halftone). Three new ref-driven variants built in the
V1×V2 space (same file, originals untouched):

7. **Kinetic Mono** — direct translation of the refs: warm black + cream, fully monochrome, one
   reserved amber over-limit signal. *(agent recommendation)*
8. **Technical Annotated** — spec-sheet read (V4 lineage): all-mono, ruler scales + asset codes as
   chrome, over-limit = strikethrough (zero accent).
9. **Inverted Editorial** — cream slabs flip to black text on top bar / selected / active tab, serif
   XIV accents; more punch, still monochrome.

User leaning V7 (Kinetic Mono). Three iterations on it, same monochrome base:

- **V7.1 Ticker** — counter becomes a ruler-gauge; squarer chips; instrument chrome.
- **V7.2 Halftone** — inverted cream brand slab + halftone dot band + faint textured field.
- **V7.3 Hairline Quiet** — borderless codes, transparent posts, pure mono (over-limit = underline, no amber).

- **V7.4 Instrument** *(user splice, front-runner)* — normal V7 (rounded chips, plain brand) +
  7.2 halftone backgrounds + 7.1 ruler-gauge counter & amber usage.

V7.4 iterations (each tunes one dial, same splice):

- **V7.4.1 Punchy** — segmented amber gauge + amber active tab / primary chip (amber as identity).
- **V7.4.2 Textured** — halftone spreads across top bar, posts, taller band (most tactile).
- **V7.4.3 Refined** — fine hairline gauge, fainter texture, restrained amber, more air (most shippable).

## Answer

**Locked: V7.4 — Kinetic Mono / Instrument.** A warm near-black + cream **monochrome** techwear
system, translated straight from the `micrographics refs/` set, with a single functional amber
signal and ruler-gauge/halftone instrument details. All variants preserved in
[prototypes/06-visual-theme.html](../prototypes/06-visual-theme.html) (V7.4 = amber "YOUR SPLICE"
card); the two sub-iteration rounds (V7.1–7.3, V7.4.1–7.4.3) stay in the file as the record.

### Design tokens

- **Color (monochrome + one signal):**
  `--bg #141310` · `--surface #1b1914` · `--surface-2 #100f0c` · `--fg #efe9db` (cream text/marks)
  · `--muted #8b8577` · `--line #2d2a23` (hairlines). Interactive accent **is the cream** (`--fg`).
  Single signal: **amber `--warn #e8a13c`** used only for over-limit shading (`rgba(232,161,60,.20)`),
  the ruler-gauge fill, and the warning readout. **No other chromatic accent.** Emphasis elsewhere =
  inverted cream slab (available, but V7.4 keeps the brand plain — see V9 for the fuller inverted take).
- **Type:** display/brand + section headers in a **grotesque** (Space Grotesk / Neue-Haas-style),
  bold, tight tracking; body in the same grotesque / Inter; **all labels, codes, and the counter in
  IBM Plex Mono**, UPPERCASE, wide tracking (asset/serial codes e.g. `ASSET_ID …`, `43R-004585`).
  CJK: Noto Sans JP. (Serif Roman-numeral accents exist in the language but are unused in V7.4.)
- **Texture:** faint **halftone dot field** behind the editor (~7px radial), a **halftone band** in
  the symbol panel, hairline (1px) rules, and dingbat micro-marks (CE / ® / ⇄ / ! / circled numbers)
  as panel + status chrome. Restraint: low; motion subtle (no scanlines/bloom).
- **Components:** rounded **stadium pill** chips; plain (non-inverted) grotesque brand; **ruler-gauge
  character counter** that fills toward the limit and goes amber past it; inline **amber over-limit
  shading** split at `parseTweet().validRangeEnd` (per #4); Symbols/Styles tabs; nav = Project›Thread›Post.
- **Implementation:** **Tailwind design tokens + CSS custom properties** (the vars above), **no heavy
  component library** — matches the stack decision. The prototype's `.app` CSS-variable block is the
  seed for the Tailwind theme config.

### Open sub-question deferred (not blocking)

Whether the amber earns its place or over-limit should stay monochrome (raised by V7.3) — kept as
amber for V7.4; revisit cheaply during build if it reads too loud in practice.

### Sub-question answers (from the ticket's checklist)

1. Mood = clean techwear **mono**, warm-black + cream, micrographic instrument details (not HUD/terminal).
2. Type = grotesque display + IBM Plex Mono codes; CJK Noto Sans JP.
3. Palette = mono cream-on-warm-black + single amber signal.
4. Motion/texture = halftone fields + hairlines + ruler ticks; restrained, no scanlines.
5. Components = stadium chips, plain brand, ruler-gauge counter, dingbat chrome.
6. **Tokens + Tailwind, no component library.**
