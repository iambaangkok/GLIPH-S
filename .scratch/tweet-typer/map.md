# Tweet Typer — Wayfinder Map

Labels: `wayfinder:map`

## Destination

A **locked MVP spec** for Tweet Typer — a client-side web app for composing "cool" X.com
posts with a curated sci-fi/techwear unicode symbol browser, threads, projects, templates,
and X-accurate character counting, all cached in localStorage.

The map is done when every open decision below is resolved and the spec is ready to hand off.

## Notes

- **Execution is authorized in this effort (destination "B").** Once the decision tickets
  resolve, build work graduates from the fog into execution tickets and may be built
  ticket-by-ticket within this same map — not a separate effort.
- **Tracker:** local-markdown (`.scratch/tweet-typer/`). No `gh`/GitHub or other tracker is
  configured on this repo; charting defaulted to local per the wayfinder skill.
- **Repo:** local git, default branch `master`, no commits yet.
- **Skills to consult per ticket type:** `/research` (research tickets), `/prototype`
  (prototype tickets), `/grilling` + `/domain-modeling` (grilling tickets).

### Ubiquitous language (domain model)

- **Project** — a named grouping/folder of Threads. Top of the hierarchy.
- **Thread** — an ordered list of Posts; auto-saves to localStorage (there is no separate
  "draft" concept — everything is always saved). Belongs under a Project.
- **Post** — one unit of text plus its derived weighted character count. (Called "Post,"
  never "tweet.")
- **Template** — a flexible, reusable text snippet insertable at the cursor anywhere.
- **Symbol** — a curated glyph from the browser; backed by Favorites and Recents stores.

Hierarchy: **Project › Thread › Post.**

### Settled decisions (fixed during charting — these go into the spec, not tickets)

- Client-side only, no backend; everything persisted in localStorage.
- Symbols: curated categories + search + favorites/recents (NOT full-Unicode browsing).
  The symbol browser is the **core** feature.
- Aesthetic: sci-fi / techwear / industrial-micrographic (Ghost-in-the-Shell); drives both
  the curated symbol set and the visual theme.
- Character counting: X-accurate weighted length via the `twitter-text` algorithm/package,
  with a configurable maximum.
- Stack: Vite + React + TypeScript + a thin localStorage sync layer.
- Output: per-Post copy + "Open in X" intent link (C); plus JSON export/import (D) tucked
  into a settings/misc area, not a primary control.
- Character limit: a single global setting, default 280.
- Text styler ("fancy fonts" 𝐛𝐨𝐥𝐝/𝓈𝒸𝓇𝒾𝓅𝓉/etc.): selection transform, living as a second
  tab (Symbols / Styles) in the side panel. Secondary feature.

## Decisions so far

<!-- one line per resolved ticket: gist + link -->

- [Confirm twitter-text weighted counting](../issues/01-twitter-text-weighted-counting.md) —
  use `twitter-text` v3.1.0; `parseTweet(text, {...configs.defaults, maxWeightedTweetLength: userLimit})`
  cleanly wires the global limit and returns `weightedLength`/`valid`/`permillage`. ~50–80 kB
  gz (twemoji-parser dominates), acceptable. Watch: half-width katakana & most glyphs above
  U+10FF weigh **2** (halves effective limit for symbol-heavy posts); emoji ZWJ needs v3 config.

## Not yet specified

Fog — graduates into sharp tickets as the decisions above resolve:

- **Build/execution work** (graduates once persistence #3, input mechanism #4, layout #5,
  and theme #6 resolve): app scaffold; Project/Thread/Post navigator; thread & post editor;
  symbol browser; Styles tab; templates; global char-limit setting; per-Post copy +
  "Open in X"; JSON export/import.
- Whole-thread **template skeletons** (MVP ships snippet templates only).
- **Per-thread** char-limit override (MVP ships a single global limit).
- Project sub-questions if not fully settled in #3: mandatory Project membership, a default
  "Unfiled" Project, Project nesting.

## Out of scope

- Backend, API posting to X, or authentication.
- Full Unicode-table browsing (ruled out during charting — curated set only).
