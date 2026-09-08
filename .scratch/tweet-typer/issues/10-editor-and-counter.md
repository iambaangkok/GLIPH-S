# Thread & Post editor + weighted counter (center pane)

Type: task
Status: resolved
Blocked by: 07, 08

## Task

Build the center thread editor per [ticket 04](./04-editor-input-mechanism.md) and
[ticket 01](./01-twitter-text-weighted-counting.md).

- Vertical Post-stack; add/remove/reorder Posts within a Thread.
- Each Post edited via **Lexical** `contenteditable`; plain text canonical (Lexical re-seeded on
  load, decorations derived at render, never persisted).
- Weighted counting via `twitter-text` `parseTweet(text, { maxWeightedTweetLength: userLimit })`.
- **Ruler-gauge counter** (V7.4) that fills toward the limit; **amber inline over-limit shading**
  split at `parseTweet().validRangeEnd`.
- Expose the last-focused-editor + last-selection ref for cursor-aware insertion (consumed by #11/#12).

Done when Posts edit, auto-save, and show live weighted count + amber over-limit shading.

## Answer

Built by a Sonnet subagent; not committed (leaves changes in the working tree per repo convention).

### Files created / changed

**New:**
- `src/ThreadEditor.tsx` — center-pane thread editor: PostEditor stack + RulerGauge + `OverLimitHighlightPlugin` + `FocusRegistrationPlugin` + `SeedContentPlugin`.
- `src/lib/InsertionContext.tsx` — ephemeral, non-persisted cursor-aware insertion seam (`InsertionProvider` / `useInsertion()`), the seam #11/#12 consume.
- `src/twitter-text.d.ts` — ambient module declaration (`twitter-text` ships no types).

**Modified:**
- `src/App.tsx` — replaced `CenterPanePlaceholder` with `<ThreadEditor />`; mounted `<InsertionProvider>` inside `<SelectionProvider>`.
- `src/lib/store.ts` — added `reorderPost(threadId, from, to)` mirroring `reorderThread` (immutable splice of `thread.postIds`).
- `src/lib/StoreContext.tsx` — wired `reorderPost` into `StoreAPI` + provider value.
- `src/lib/store.test.ts` — added `reorderPost` describe block (7 new tests).

### Key decisions

- **Over-limit shading**: `OverLimitHighlightPlugin` uses `registerUpdateListener`; on each change it reads `parseTweet().validRangeEnd` (UTF-16 index), splits raw text there, and updates an absolutely-positioned sibling overlay (`pointer-events/user-select: none`, `z-index: 2`). Safe portion is `color: transparent` (real editor text shows through); over-limit tail gets `background: var(--over); color: var(--warn)`. Render-time only, never persisted.
- **Insertion seam**: `InsertionContext` holds a `useRef<LexicalEditor>` updated by each PostEditor's `FocusRegistrationPlugin` (focus listener on the root). `insertAtCursor(text)` runs `editor.update(() => selection.insertText(text))` in the last-focused editor. #11/#12 call it via `onMouseDown` + `preventDefault` to keep focus.
- **Seeding**: `SeedContentPlugin` re-seeds from `post.content` on mount and on external store changes via `editor.update(…, { tag: 'history-merge' })`; an `OnChangePlugin` ref stamps own-changes so self-triggered re-seeds are skipped. Plain text (`Post.content`) stays canonical.
- **Char limit**: reads `state.settings.charLimit ?? 280` (settings UI lands in #13).
- **reorderPost gap** filled to match how #09 filled `reorderThread`.

### Verification (independently re-run)

- `pnpm test`: **27/27** (20 original + 7 new `reorderPost`).
- `pnpm build` (`tsc -b && vite build`): clean, zero TS errors, 498 kB bundle.
- `pnpm exec oxlint`: exit 0 (warnings only — 4 pre-existing `only-export-components`, 1 `set-state-in-effect` for the external-sync pattern).
