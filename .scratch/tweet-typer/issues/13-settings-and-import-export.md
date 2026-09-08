# Settings: global char-limit + JSON export/import

Type: task
Status: resolved
Blocked by: 07, 08

## Task

Build the settings/misc area in the top bar.

- **Global character-limit** setting (single value, default 280) that feeds the weighted counter (#10).
- **JSON export/import:** superset round-trip export; **replace-on-import** (with a confirm). Tucked
  into settings/misc, not a primary control.
- V7.4 treatment: mono codes, stadium chips per the top bar in the prototype.

MVP = single global limit + replace-on-import. **Per-thread limit** and **merge-by-id import** stay
out of scope (see fog).

Done when the limit persists and drives counting, and export→import replaces state cleanly.

## Answer

Built the top-bar settings/misc cluster. The store layer (`updateSettings` /
`exportStore` / `importStore`, superset envelope, replace-semantics `importStore`) was
already delivered by #08, and the editor already reads `settings.charLimit ?? 280`
(#10) — so #13 was purely the UI that drives them.

**New:** `src/SettingsMenu.tsx`, mounted in the top bar of `src/App.tsx` (replaces the
three placeholder chips: `280` / `⚙` / `⇄ json`). Popover styles added to
`src/index.css` (`.popover`, `.popover-hint`, `.popover-sep`, `.popover-status`).

- **Global character limit** — a live `280`-style readout chip reflecting
  `settings.charLimit` (default 280), plus a `⚙` that opens a settings popover with a
  numeric limit field. Editing commits to the store the moment the value parses to an
  integer in `1..100000` (invalid/empty drafts are held, not persisted; blur re-seeds
  from the store). Because the counter reads `settings.charLimit ?? 280`, changing it
  re-weights every Post immediately and moves the readout chip.
- **JSON export/import** — tucked *inside* the settings popover (not a primary control,
  per the ticket). Export downloads `exportStore()` as `tweet-typer-YYYY-MM-DD.json`
  (superset round-trip). Import is a hidden `<input type=file>`; on pick it reads the
  file, shows a **danger confirm** ("Replace everything?") via the existing
  `useDialog()`, then calls `importStore()` (replace-on-import). Errors (bad JSON /
  unrecognised format — thrown by the store) surface as an inline amber status line in
  the popover; success shows a muted confirmation. The file input resets so re-picking
  the same file re-fires.
- Popover closes on outside-click / Escape; V7.4 chips + mono labels throughout.

**Scope held:** per-thread limit override and merge-by-id import stay in the fog (MVP =
single global limit + replace-on-import), matching the ticket and the map.

**Verified:** `pnpm build` clean, `pnpm test` **52/52**, `oxlint src/` exit 0 (warnings
only; the lone `set-state-in-effect` on SettingsMenu mirrors the repo's existing
ThreadEditor pattern). Not committed.
