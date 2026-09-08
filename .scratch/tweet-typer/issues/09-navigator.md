# Project / Thread / Post navigator (left pane)

Type: task
Status: resolved
Blocked by: 07, 08

## Task

Build the left navigator pane.

- Project list (with non-deletable "Unfiled"), create/rename/delete Projects (Unfiled locked).
- Threads grouped under their Project; create/select/delete/reorder; new Threads land in Unfiled
  unless another Project is chosen.
- Selecting a Thread drives the center editor.
- V7.4 treatment: grotesque group labels, stadium chips, hairline rules, selected state per the
  prototype nav.

Done when the full Project›Thread hierarchy is navigable and persists.

## Answer

Built the left navigator against the live `useStore()` API. Delegated the build to a Sonnet
subagent; verified independently (`pnpm build` clean, `pnpm test` 20/20, `oxlint` exit 0).

**New files**
- `src/Navigator.tsx` — the pane. `Navigator` → `ProjectGroup` → `ThreadRow`. Projects sorted by
  `createdAt` with the default **Unfiled** pinned **last**. Project CRUD via `createProject` /
  `renameProject` / `deleteProject`; rename/delete controls are **hidden for `isDefault`**, so
  Unfiled is locked (the store also throws as a backstop). Threads render grouped and collapsible;
  create/select/delete/reorder per row. New threads are created via each project's own `+ thread`
  affordance, so they land in the chosen project (Unfiled included) — satisfies "land in Unfiled
  unless another Project is chosen." Deleting the selected thread (or its project) clears selection.
  V7.4 treatment: `.label-mono` group labels, `.chip`/`.chip--accent` stadium pills, `.ruler`
  hairlines between groups, `--sel`/`--accent` selected-row highlight.
- `src/lib/SelectionContext.tsx` — tiny **ephemeral** (non-persisted) `SelectionProvider` +
  `useSelection()` holding `{ selectedThreadId, setSelectedThreadId }`. This is the seam the center
  editor (ticket 10) reads to know which thread to render — "selecting a Thread drives the editor."

**Store additions (the two gaps this ticket exposed)**
- `reorderThread(projectId, fromIndex, toIndex)` in `src/lib/store.ts` — immutable splice of
  `project.threadIds` via the existing `mutate('projects', …)` helper (bumps `updatedAt`, debounced
  persist, `notify()`); bounds-guarded no-op. Wired through `StoreAPI` in `StoreContext.tsx`.
  Reorder UI is ↑/↓ buttons per row (no drag-and-drop for MVP).

**App wiring** — `App.tsx` wraps the tree in `<SelectionProvider>` (inside `<StoreProvider>`),
mounts `<Navigator />` in the left pane, and shows the selected thread's title/id in the center
placeholder so the selection seam is visibly live for ticket 10.

Persistence is automatic (store auto-saves), so the hierarchy persists across reloads. Not committed.
