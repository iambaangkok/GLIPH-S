# Confirm twitter-text weighted counting + configurable max + NFC

Type: research
Status: resolved
Blocked by: —

## Question

Confirm that the `twitter-text` npm package can back Tweet Typer's character counting:

1. Does `parseTweet()` return a `weightedLength` implementing X's real rules (CJK/wide
   chars = 2, URLs = fixed 23, NFC normalization)? Confirm current API shape and return
   fields (`weightedLength`, `valid`, `permillage`, `validRangeStart/End`, `displayRange`).
2. Can the **maximum** be made configurable (our global char-limit setting)? Investigate
   `parseTweet(text, config)` and `config.maxWeightedTweetLength` (and the built-in configs:
   defaults / version2 / version3). Does overriding it cleanly change `valid` + `permillage`?
3. Bundle size / tree-shaking concerns for a client-side Vite app, and whether we need the
   whole package or a subset. Note any lighter alternatives if the package is heavy.
4. Any gotchas with our sci-fi/CJK-heavy symbol content (half-width katakana weight, combining
   marks, emoji ZWJ sequences) that would make the displayed count surprising to a user.

Deliver findings on a `research/twitter-text` branch with a context pointer back to this
ticket. This decides how the counting layer is built; it does not build it.

---

## Answer

Full findings: [.scratch/tweet-typer/research/01-twitter-text.md](../research/01-twitter-text.md)

**Yes, `twitter-text` works and is the right choice.**

1. **parseTweet() return shape (confirmed):** Returns `{ weightedLength, valid, permillage, displayRangeStart, displayRangeEnd, validRangeStart, validRangeEnd }`. CJK/wide chars count as 2, URLs fixed at 23, NFC-normalized before counting.

2. **Configurable maximum:** `parseTweet(text, { ...configs.defaults, maxWeightedTweetLength: N })` cleanly overrides the limit. Both `valid` and `permillage` respond to the new limit. Use `configs.defaults` (= v3) as the base and spread-override `maxWeightedTweetLength` from the global setting. Built-in configs: v1 (140 limit, no emoji), v2 (280, no emoji parsing), v3/defaults (280, emoji parsing via twemoji-parser).

3. **Bundle:** The ESM build is available (`dist/esm/`, Vite uses it automatically). Estimated min+gzip footprint ~50–80 kB when importing only `parseTweet` + `configs`, dominated by `twemoji-parser`. Acceptable for a client-side app; no lighter drop-in alternative with equivalent accuracy.

4. **Gotchas for sci-fi/CJK content:**
   - Half-width katakana (U+FF61–U+FF9F) counts as **2**, not 1 — counterintuitive for users.
   - All symbols outside U+0000–U+10FF (math operators, box-drawing, most sci-fi glyphs) count as **2**; effective limit for all-symbol text is 140.
   - Emoji ZWJ sequences (e.g., 🧑‍🔧) count correctly as **2** only with v3 config (`emojiParsingEnabled: true`); v2 counts each code point separately.
   - Combining marks normalize under NFC but unusual multi-mark stacks may still cost 2+ weighted chars per visible glyph.
