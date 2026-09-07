# Settings: global char-limit + JSON export/import

Type: task
Status: open
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
