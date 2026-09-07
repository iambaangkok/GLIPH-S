# Editor input mechanism + cursor-aware insertion

Type: grilling
Status: closed (resolved 2026-09-08)
Blocked by: —

## Question

Decide how a Post is edited and how symbols/templates get inserted at the cursor.

1. **Input element** — plain `<textarea>` vs `contenteditable`. Trade-offs:
   - `textarea`: trivial cursor/selection API, reliable copy, but no inline styling and
     styled-unicode still renders fine (it's just characters). Simpler.
   - `contenteditable`: richer, but selection/caret handling and paste sanitization are
     notoriously fiddly and error-prone.
2. **Cursor-aware insertion** — inserting a Symbol or Template at the caret, or wrapping the
   current selection (needed for the Styles-tab selection transform in the spec). Confirm the
   chosen element supports: get selection range, replace selection, restore caret after insert.
3. **Selection transform for styles** — how selecting text in a Post and applying a fancy-font
   style (from the Styles tab) maps onto the chosen element's selection API.
4. **Multi-Post focus** — with several Posts on screen, how the app tracks which Post + caret
   position is "active" so panel inserts target the right place.
5. Any React-specific concerns (controlled vs uncontrolled input, `useRef` to the DOM node,
   re-render vs caret preservation).

Recommendation to pressure-test: `<textarea>` per Post for MVP — it makes counting, copy,
caret handling, and selection transforms all straightforward; revisit `contenteditable` only
if inline visual styling is ever wanted.

Resolve via `/grilling`. Blocks the layout prototype (#5).

## Resolution

Reverses the ticket's `<textarea>` recommendation. We go `contenteditable` — the way X.com's
own composer does — to enable inline decoration a textarea can't render on a substring.

1. **Input element — `contenteditable`, not `<textarea>`.** Chosen deliberately to allow
   X-style inline decoration (over-limit shading, later entity highlighting). Note: fancy-fonts
   are real codepoints, so they need no rich editor — but over-limit shading does, and that's
   the justification.
2. **Engine — Lexical** (Meta's Draft.js successor, actively maintained). Handles caret
   preservation across React re-renders, IME/composition (critical for the CJK-heavy symbol
   set), and paste sanitization; first-class React bindings + a decorator model. Rejected raw
   `contenteditable` (owns every browser/IME/paste quirk yourself) and the heavier document
   trees (Slate/ProseMirror/TipTap — more than needed). **Lexical is now a locked stack
   addition.**
3. **Persistence — plain text is canonical.** Store `root.getTextContent()` as the Post's
   value; Lexical is only the editing surface, re-seeded from the string on load. Feeds #1's
   `parseTweet` and #3's schema directly; fancy-fonts survive as codepoints so no structure is
   lost. Decorations are derived at render time, never persisted (no storage/export bloat, no
   coupling to Lexical's internal schema). Rejected persisting Lexical serialized JSON.
4. **Insert targeting (the insert-loses-focus problem) — two-part.** (a) App-level
   **last-focused-editor + last-selection ref** that survives a panel click; (b)
   `onMouseDown`+`preventDefault` on symbol/template/style buttons so they never steal focus.
   (b) handles the common case; (a) is the safety net for the legit case where the symbol
   **search box** takes focus first, then a result is clicked. Insert via `editor.update()` →
   `selection.insertText()`, which restores the caret after the inserted glyph. Each Post is
   its own Lexical instance.
5. **Style transform (Styles tab) — normalize-then-apply, mutually exclusive.** Keep a
   **bidirectional** char map (every styled variant knows its base ASCII). On any style click:
   reverse-map the selection to plain ASCII first, then forward-map into the chosen style — so
   re-styling never stacks garbage and styles are switchable. **Normal/Clear** = reverse-map
   only. Unmapped chars (symbols/CJK/emoji/punct/space) pass through untouched. **No-op on
   empty selection.** Mutates the Post's plain text in place (nothing extra persisted).
   Rejected stacking/toggling styles.
6. **Decorators — over-limit red-shading ships in MVP; entity highlighting deferred.**
   Over-limit shading splits the text node at `parseTweet().validRangeEnd` (from #1) and shades
   the tail red — pays off the counting core feature (a CJK-heavy post going red early is the
   visible proof of the ×2 weighting caveat) and justifies the `contenteditable` choice. Entity
   highlighting (@/#/$/URL accent color via twitter-text `extractEntitiesWithIndices`) uses the
   identical Lexical decorator plumbing, so it's a zero-architecture-cost fast-follow →
   graduated to the map's **Not yet specified**.
