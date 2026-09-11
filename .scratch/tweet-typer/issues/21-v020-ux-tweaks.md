# v0.2.0 UX tweaks: new-thread-on-top · add-post-at-top · post timestamps

Type: task
Status: open
Blocked by:

## Question

Three small, already-sharp UX changes for the next release. Grouped into one branch/version
bump because they're a single batch of polish, none of which needs its own decision. Ship per
[CLAUDE.md](../../../CLAUDE.md): on branch `issue-21-v020-ux-tweaks`, **bump the version to
`v0.2.0`** (new features → minor) in both the [App.tsx](../../../src/App.tsx) badge (currently
`v0.1.0`) and `package.json` `"version"` (currently `0.0.0` — align it), then let master
auto-deploy.

---

### Change 1 — New threads appear at the **top** of the project

Currently a new thread is appended to the bottom of its project. Make it land first.

- [src/lib/store.ts:356](../../../src/lib/store.ts#L356) `createThread` — change the append
  `threadIds: [...project.threadIds, thread.id]` to a prepend
  `threadIds: [thread.id, ...project.threadIds]`.
- Verify the store test around thread ordering still passes; add/adjust a test asserting the new
  thread is at index 0.

### Change 2 — Post list gets an **add-post button at the top**

The editor already has "+ post" at the **bottom** ([src/ThreadEditor.tsx:419-429](../../../src/ThreadEditor.tsx#L419-L429))
and in the toolbar. Add one at the **top** of the post stack that inserts a new post at index 0.

- Today [src/lib/store.ts:530](../../../src/lib/store.ts#L530) `createPost` appends
  (`postIds: [...thread.postIds, post.id]`). It always adds at the bottom.
- Simplest path: after `createPost(...)`, call the existing
  `reorderPost(threadId, thread.postIds.length /* last */, 0)` to move it to the top — or add an
  optional position arg to `createPost`. Prefer whichever keeps the store API clean.
- Render a "+ post" button above the mapped post list in
  [src/ThreadEditor.tsx:397](../../../src/ThreadEditor.tsx#L397) (mirror the bottom one's styling).

### Change 3 — Post editor top bar shows **dimmed created / updated** time

Each `PostEditor` header ([src/ThreadEditor.tsx:182-187](../../../src/ThreadEditor.tsx#L182-L187))
currently shows only `index / total`. Add a dimmed created + last-updated timestamp there.

- The data already exists: every Post carries `createdAt` / `updatedAt` epoch-millis from
  `makeBase()`, and `updatePost` bumps `updatedAt`.
- Render both formatted (e.g. locale short date-time) in the same `.label-mono` dimmed treatment
  (`fontSize: 9, opacity: ~0.5`) so it reads as metadata, not a control. Consider `title` tooltips
  with the full timestamp if the short form is ambiguous.

---

### Done when

- New thread appears at top of its project; new "+ post" button at the top adds a post at index 0;
  each post header shows dimmed created/updated times.
- `pnpm build`, `pnpm test`, `pnpm lint` all pass.
- Version bumped to `v0.2.0` in App.tsx badge **and** package.json, kept in sync.
