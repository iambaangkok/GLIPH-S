# Editor input mechanism + cursor-aware insertion

Type: grilling
Status: open
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
