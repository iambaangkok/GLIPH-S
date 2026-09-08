# Templates (snippet insertion)

Type: task
Status: resolved
Blocked by: 07, 08, 10

## Task

Implement Templates — flexible, reusable text snippets insertable at the cursor anywhere.

- CRUD templates; persisted via the store (#08).
- Insert at the current cursor using the same last-focused-editor + selection ref plumbing as #11.
- Surface in the nav/side area per the layout.

MVP = snippet templates only. Whole-thread **template skeletons** stay out of scope (see fog).

Done when a template inserts at the cursor and templates persist.

## Answer

> **Revised after review.** The first cut placed Templates as a third right-panel tab with an
> inline name+textarea form; the user redirected to the **prototype**, where Templates are a group
> in the **left navigator** and a template **behaves like a Post**. Final design below; the
> right-panel tab was reverted (`src/SymbolPanel.tsx` restored to its #11 state).

Templates are managed in the **left navigator** (matching the prototype's "Templates" group under
Projects), and a template **behaves like a Post** — selecting one opens it in the **center editor**
with the identical Lexical surface + weighted counter, not a cramped side form. No new store/seam
work: the #08 store already ships `createTemplate`/`updateTemplate`/`deleteTemplate` on
`useStore()`, and the `Template` entity (`{id, name, content, …}`) persists via `tt:templates` with
the standard 250 ms debounced flush.

**Left pane — `src/Navigator.tsx` (`TemplatesSection` + `TemplateRow`):**

- A **Templates** section below the projects list; `+` creates a template (via the prompt dialog
  for the name) and immediately opens it in the editor. Empty state: "— no templates —".
- Each row shows `▤ name`; **clicking selects it** for editing. Per-row actions (revealed on hover,
  V7.4 `.row-actions`): **copy**, rename (✎, prompt), delete (× , `dialog.confirm({danger})`,
  clears selection if it was the open one).
- **Copy button (⧉)** — `navigator.clipboard.writeText(content)`, then flashes a small **"copied"**
  label for 1.5 s (rendered outside `.row-actions` so it stays visible after the pointer leaves);
  clipboard failures (insecure context / denied) are swallowed.

**Center pane — behaves like a Post (with manual save):**

- **Selection model:** `SelectionContext` gained `selectedTemplateId`, **mutually exclusive** with
  `selectedThreadId` (selecting one clears the other), so the editor and nav highlight are
  unambiguous.
- `ThreadEditor` defers to the new **`TemplateEditor`** (`src/TemplateEditor.tsx`, keyed on the id so
  switching templates remounts a fresh draft) whenever a template is selected — one Post-style card,
  same weighted counter + entity/over-limit overlay.
- **Manual save (revised per review):** unlike a Post (auto-save), a template edits into a **local
  `draft`** and is **only persisted on `Save`** (`updateTemplate`; the button does **not** close the
  editor, and is disabled when there's nothing unsaved). A **save-state pill** in the title bar shows
  `● unsaved` (amber `var(--warn)`) while `draft !== template.content`, else `saved` (muted) — so the
  user always knows whether edits are committed. Navigating away (selecting another template/thread)
  without Save discards the draft (that's what "manual save" means; the pill warns).
- **Copy in the center (added per review):** the card **footer** has a `⧉ copy` chip →
  `navigator.clipboard.writeText(draft)` + a "copied" flash, mirroring the prototype's per-post copy.
  (The nav-row quick-copy is kept too — it copies the *stored* snippet.)
- **Refactor to avoid duplication:** the Lexical body + overlay + ruler-gauge were extracted from
  `ThreadEditor` into **`src/WeightedTextEditor.tsx`** (`EditableTextBody`, `RulerGauge`,
  `parseWeighted`); both `PostEditor` and `TemplateEditor` compose it, so the two editing surfaces
  stay identical by construction. Post editing behaviour (incl. auto-save) is unchanged.

**Insertion seam:** the template editor registers as the last-focused editor via #10's
`InsertionContext`, so Symbols/Styles insert into a template exactly as into a Post.

**Drag-and-drop reordering (added per review):** native HTML5 DnD in the navigator — no library.

- **Templates** are now **draggable to reorder**. Templates are a flat top-level collection with no
  parent to hold an order array, so a **`Template.order: number`** field was added (`createTemplate`
  appends at `max+1`; sorted by `order`). New store op **`reorderTemplate(id, beforeId|null)`**
  renormalizes order to `0..n-1`, no-op-guarded, persisted.
- **Threads** are **draggable to reorder and to move across projects** (replacing the old ▲▼
  buttons). New store op **`moveThread(threadId, toProjectId, beforeThreadId|null)`** handles both
  same-project reorder and cross-project moves (splices source/target `threadIds`, updates
  `thread.projectId`). Project **headers and empty zones** are drop targets (append), so a thread can
  be dropped into a collapsed or empty project; `reorderThread` is retained for the API/tests.
- **UX:** a drag starts **only from the `⠿` drag handle** (the grip) — not the whole row, so
  clicking/selecting a row never begins a drag. The row dims while dragging and shows an inset-accent hairline on
  the leading/trailing edge for insert-before/after (computed from pointer vs row midpoint). Drop
  zones are distinguished during `dragover` via custom MIME types (`application/x-tt-thread` /
  `-template`) since `getData` is unreadable then. Dropping a row on itself is a no-op.
- **Tests:** +9 store tests (`moveThread` same-project / cross-project / reload / self-drop;
  `reorderTemplate` order-on-create / move / append / reload) — `pnpm test` now 52/52.

**Scope:** MVP snippet templates only. Whole-thread **template skeletons** remain out of scope
(still fog).

**Verified:** `pnpm build` (`tsc -b && vite build`) clean · `oxlint src/` exit 0 (warnings only:
`only-export-components` matching the existing `StoreContext`/`InsertionContext` shared-module shape)
· `pnpm test` **52/52**. Not committed.

**Files:** `src/Navigator.tsx` (Templates section + rows + copy + thread/template drag-and-drop),
`src/TemplateEditor.tsx` (new — manual-save card), `src/WeightedTextEditor.tsx` (new — shared editing
surface extracted from `ThreadEditor`), `src/ThreadEditor.tsx` (consumes the shared module, branches
to `TemplateEditor`), `src/lib/SelectionContext.tsx` (`selectedTemplateId`, mutually exclusive),
`src/lib/types.ts` (`Template.order`), `src/lib/store.ts` (`reorderTemplate`, `moveThread`, order on
create), `src/lib/StoreContext.tsx` (expose both), `src/lib/store.test.ts` (+9). `src/SymbolPanel.tsx`
reverted to #11.
