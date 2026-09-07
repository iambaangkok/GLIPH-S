# Tweet Typer

A client-side web app for composing "cool" X.com posts with a curated sci-fi/techwear
symbol browser, threads, projects, templates, and X-accurate character counting — all
persisted in localStorage.

## Language

**Project**:
A named, flat grouping of Threads; the top of the hierarchy. Every Thread belongs to
exactly one Project. Projects cannot nest.
_Avoid_: Folder, workspace

**Unfiled**:
The default Project, auto-created, non-deletable and non-renameable. New Threads land
here unless another Project is chosen. Guarantees every Thread has a parent without
forcing the user to create a Project first.

**Thread**:
An ordered list of Posts belonging to one Project. Always saved (no separate "draft"
concept — everything is persisted continuously).
_Avoid_: Chain

**Post**:
One unit of text plus its derived weighted character count. Ordered within its Thread.
_Avoid_: Tweet, message

**Template**:
A flexible, reusable text snippet insertable at the cursor anywhere.
_Avoid_: Snippet (in UI), macro

**Symbol**:
A curated glyph from the symbol browser; backed by Favorites and Recents stores.
_Avoid_: Character, glyph (in UI), icon

Hierarchy: **Project › Thread › Post.**
