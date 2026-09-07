# Overall app layout & UX

Type: prototype
Status: open
Blocked by: 04

## Question

Prototype the overall layout and interaction model so we can react to something concrete.
Elements that must coexist:

- **Project/Thread navigator** — a sidebar grouping Threads under Projects (Project › Thread),
  with create/rename/delete and selecting the active Thread.
- **Thread editor** — the active Thread as a vertical stack of Post editors, with add/remove/
  reorder Posts and a per-Post live weighted count + limit indicator.
- **Side panel** — tabbed: **Symbols** (curated categories + search + favorites/recents) and
  **Styles** (selection transform). How it docks relative to the editor.
- **Per-Post actions** — copy this Post, "Open in X" intent.
- **Settings/misc** — global char-limit setting, JSON export/import.

Deliver a cheap, rough artifact (wireframe/outline or a stub via `/prototype`) covering the
overall screen composition and the key flows: pick Project → pick Thread → edit Posts →
insert symbol at caret → apply style to selection → copy/Open-in-X. Link it from this ticket.

Depends on the input-mechanism decision (#4) since the editor's caret/selection behavior
shapes the interaction. Aesthetic/theming is deliberately a separate ticket (#6).
