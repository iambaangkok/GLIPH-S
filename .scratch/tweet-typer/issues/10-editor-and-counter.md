# Thread & Post editor + weighted counter (center pane)

Type: task
Status: open
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
