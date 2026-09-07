# Overall app layout & UX

Type: prototype
Status: resolved
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

## Prototype

Grey-box wireframe (throwaway, static HTML — no theming, no persistence). Lives on the
throwaway branch `prototype/05-layout` at `.scratch/tweet-typer/prototypes/05-layout/index.html`
(not on `master`). Three structurally different layouts, switchable via `?variant=A|B|C` or
← → keys:

- **A — Classic 3-pane**: nav left · post-stack center · Symbols/Styles panel docked right.
  Dense, everything visible at once.
- **B — Writing-first**: single centered column; navigator and side panel are overlay
  drawers summoned on demand. Chrome gets out of the way of the text.
- **C — Deck**: thread as a horizontal row of post columns (TweetDeck-style); nav as top
  breadcrumb dropdowns; symbol/style panel docked along the bottom.

Run (from the `prototype/05-layout` branch): `python3 -m http.server 8577` in the prototype
dir, then open `http://localhost:8577/?variant=A`.

Verdict: **Variant A — Classic 3-pane** (nav left · post-stack center · Symbols/Styles
panel docked right). Chosen for keeping the symbol browser — the map's designated **core**
feature — always visible with zero clicks (rules out B's on-demand drawer), and for a
vertical post-stack editor over C's horizontal deck. Thread editor = vertical stack of Post
editors; side panel docks on the right as a fixed third column with Symbols/Styles tabs;
per-Post copy + Open-in-X live in each Post's footer; settings + import/export in the top bar.

Full 3-variant wireframe preserved as a primary source on throwaway branch
`prototype/05-layout` (removed from main so the losing variants don't rot).

Status: resolved.
