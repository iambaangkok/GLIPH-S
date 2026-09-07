# Research: twitter-text npm package for X-accurate weighted character counting

Ticket: [01-twitter-text-weighted-counting](../issues/01-twitter-text-weighted-counting.md)
Researched: 2026-09-08

---

## Sources

- GitHub repo (primary): https://github.com/twitter/twitter-text/tree/master/js
- parseTweet.js source: https://github.com/twitter/twitter-text/blob/752b9476d5ed00c2ec60d0a6bb3b34bd5b19bcf9/js/src/parseTweet.js
- configs.js (raw): https://raw.githubusercontent.com/twitter/twitter-text/master/js/src/configs.js
- v2.json config (raw): https://raw.githubusercontent.com/twitter/twitter-text/master/config/v2.json
- v3.json config (raw): https://raw.githubusercontent.com/twitter/twitter-text/master/config/v3.json
- X official character counting docs: https://docs.x.com/fundamentals/counting-characters
- GitHub issue #267 (other languages / weighted length): https://github.com/twitter/twitter-text/issues/267
- GitHub issue #369 (emoji ZWJ counting): https://github.com/twitter/twitter-text/issues/369
- GitHub issue #303 (CJK/emoji documentation): https://github.com/twitter/twitter-text/issues/303
- "Everything you know about Twitter character counting is wrong" (2020): https://shkspr.mobi/blog/2020/03/everything-you-know-about-twitter-character-counting-is-wrong/

---

## 1. parseTweet() API Shape

### Function Signature

```typescript
parseTweet(text: string, options?: ParseTweetOptions): ParsedTweet
```

The `options` parameter defaults to `configs.defaults` (which mirrors v3 config) when not supplied.

### Return Object Shape

All fields are confirmed from the source code and README:

```typescript
{
  weightedLength: number;    // Weighted character count (per X rules)
  valid: boolean;            // true if tweet is within limits and has no illegal chars
  permillage: number;        // Math.floor((weightedLength / maxWeightedTweetLength) * 1000)
  displayRangeStart: number; // Always 0
  displayRangeEnd: number;   // Index of last character in the string (inclusive)
  validRangeStart: number;   // Always 0
  validRangeEnd: number;     // Last index that keeps the tweet within the limit
}
```

Example for a 20-character tweet:
```json
{
  "weightedLength": 20,
  "permillage": 71,
  "valid": true,
  "displayRangeStart": 0,
  "displayRangeEnd": 19,
  "validRangeStart": 0,
  "validRangeEnd": 19
}
```

Key note on `validRangeEnd` vs `displayRangeEnd`: when text exceeds the limit,
`validRangeEnd` is the last index where the tweet was still valid; `displayRangeEnd` is the
last character in the full (possibly oversized) string. This is ideal for highlighting
the over-limit portion of text.

### Counting Rules Implemented

- **URL normalization**: all valid URLs (via t.co) counted as `transformedURLLength` = **23**,
  regardless of actual length.
- **Unicode weight ranges**: characters in the "light" ranges (see config section) count as 1;
  all others count as 2.
- **NFC normalization**: text is NFC-normalized before counting, so precomposed vs decomposed
  forms are handled consistently.
- **Emoji**: each emoji (including complex sequences) counts as **2** when `emojiParsingEnabled`
  is true (v3/defaults), using `twemoji-parser` to identify emoji spans.
- **`valid`** = no prohibited characters AND `weightedLength <= maxWeightedTweetLength`.
- **`permillage`** = per-mille ratio (0–1000) of `weightedLength` to `maxWeightedTweetLength`.

---

## 2. Configurable Maximum via parseTweet(text, config)

### Config Interface

```typescript
interface ParseTweetOptions {
  defaultWeight: number;
  emojiParsingEnabled: boolean;
  scale: number;
  maxWeightedTweetLength: number;
  transformedURLLength: number;
  ranges?: Array<{ start: number; end: number; weight: number }>;
}
```

### How maxWeightedTweetLength is Used

Directly inside parseTweet.js:
- `valid = valid && weightedLength > 0 && weightedLength <= maxWeightedTweetLength`
- `permillage = Math.floor((weightedLength / maxWeightedTweetLength) * 1000)`
- `validRangeEnd` tracks the last position where `weightedLength <= maxWeightedTweetLength * scale`

Overriding `maxWeightedTweetLength` in the config cleanly changes both `valid` and `permillage`.
This is the correct hook for Tweet Typer's configurable character limit.

### Built-in Configs

Exported from `configs.js` as `configs.v1`, `configs.v2`, `configs.v3`, and `configs.defaults`
(defaults mirrors v3).

| Config    | maxWeightedTweetLength | scale | defaultWeight | transformedURLLength | emojiParsingEnabled |
|-----------|------------------------|-------|---------------|----------------------|---------------------|
| v1        | 140                    | 1     | 1             | 23                   | false               |
| v2        | 280                    | 100   | 200           | 23                   | false               |
| v3 / defaults | 280                | 100   | 200           | 23                   | true                |

The `scale` field is an internal precision multiplier (so 200/100 = weight-2, 100/100 = weight-1).
It is not the same as the character limit.

### Unicode Weight Ranges (v2 / v3 / defaults)

These ranges are assigned `weight: 100` (which divided by `scale: 100` = counted as **1**).
Everything outside these ranges uses `defaultWeight: 200` = counted as **2**.

| Range (decimal) | Unicode      | Description                                    |
|-----------------|--------------|------------------------------------------------|
| 0–4351          | U+0000–U+10FF | Basic Latin through Greek Extended            |
| 8192–8205       | U+2000–U+200D | General Punctuation + ZWJ                     |
| 8208–8223       | U+2010–U+201F | Dashes, quotation marks                        |
| 8242–8247       | U+2022–U+2027 | Bullets, ellipsis, separators                 |

### Recommended Usage for Tweet Typer

```typescript
import { parseTweet, configs } from 'twitter-text';

const CHAR_LIMIT = 280; // from global setting

const result = parseTweet(text, {
  ...configs.defaults, // use v3 rules (emoji parsing, URL=23)
  maxWeightedTweetLength: CHAR_LIMIT,
});

// result.weightedLength — display in the counter
// result.valid           — gate the "post" button
// result.permillage      — drive a progress arc (0–1000 = 0–100%)
// result.validRangeEnd   — highlight over-limit text
```

---

## 3. Bundle Size and Tree-shaking

### Package Structure

- `main`: `dist/index.js` (CommonJS)
- `module`: `dist/esm/` (ES module build — tree-shaking compatible)
- No `exports` conditional map; no `sideEffects: false` declaration.
- Dependencies: `@babel/runtime`, `core-js`, `punycode`, `twemoji-parser`

### Bundle Size (approximate, from packagephobia / bundlephobia data as of 2025-2026)

The package is moderate-to-heavy for client-side use because it bundles:
- Full regex-based tweet parser (mentions, hashtags, URLs, emoji)
- `twemoji-parser` (pulls in the full Twitter emoji dataset for emoji boundary detection)
- `core-js` polyfills

The total install size is ~6 MB on disk (dev, with all deps). The minified+gzip footprint for
a Vite app importing only `parseTweet` and `configs` is estimated at **~50–80 kB min+gzip**,
dominated by `twemoji-parser`'s emoji regex table.

The ESM build (`dist/esm/`) is available and Vite will use it by default (it prefers the
`module` field). Named imports of just `parseTweet` and `configs` should tree-shake the
extraction/linking utilities, but `twemoji-parser` will still be pulled in when
`emojiParsingEnabled: true` (v3/defaults).

### Lighter Alternatives

If the ~50–80 kB footprint is a concern, consider:

1. **Roll your own weighted counter** — implement the v3 ranges directly in ~50 lines of TypeScript.
   The range table is simple; the main complexity is URL detection (t.co rewriting) and emoji
   boundary detection.

2. **Use v2 config** (`emojiParsingEnabled: false`) — drops the `twemoji-parser` dependency
   cost. Emoji will then each count as their raw code-point weight (most emoji are > U+10FF so
   they'd count as 2 anyway, but ZWJ sequences would NOT be collapsed — see gotchas below).

3. **twitter-text-lite / community forks** — `@ambassify/twitter-text` exists but is a fork
   with uncertain maintenance. Not recommended as a primary dependency.

For Tweet Typer's use case (char counter in a rich text editor), using the full
`twitter-text` v3 config is recommended. The bundle hit is one-time and acceptable for a
Vite app. The accuracy benefit outweighs the size cost.

---

## 4. Gotchas with CJK-heavy / Sci-fi Symbol Content

### Half-width Katakana (U+FF61–U+FF9F)

Half-width katakana (ｱｲｳｴｵ etc.) falls at decimal 65377–65439, which is **outside** all
weight=100 ranges in the v2/v3 config. Therefore each half-width katakana character counts
as **2**, not 1.

This is counterintuitive: "half-width" visually but "full-weight" per X's algorithm. Users
composing sci-fi-flavored text with half-width katakana will find they burn through the
character limit faster than they might expect.

Full-width katakana (U+30A0–U+30FF, decimal 12448–12543) also falls outside the weight=100
ranges, so it also counts as 2.

Hiragana (U+3040–U+309F) similarly counts as 2.

### CJK Unified Ideographs (U+4E00–U+9FFF)

Count as 2. With `maxWeightedTweetLength: 280`, a pure CJK tweet can have at most **140**
characters — the original limit. The 280-character expansion only applies to scripts in the
weight=100 ranges.

### Emoji ZWJ Sequences

**Confirmed bug (now fixed in later releases):** ZWJ-composed emoji (e.g., 🧑‍🔧 = person +
ZWJ + wrench) were previously miscounted as 5 weighted characters instead of 2. This was
fixed by relying on `twemoji-parser` to identify complete emoji sequences before counting.

**With v3 config** (`emojiParsingEnabled: true`), ZWJ sequences are correctly counted as **2**
regardless of how many component code points they contain.

**With v2 config** (`emojiParsingEnabled: false`), each code point in a ZWJ sequence is
counted independently, which will produce inflated counts for family/profession emoji. Do
**not** use v2 config if your symbol set includes ZWJ emoji.

### Combining Marks (Diacritics)

The library applies NFC normalization before counting. Precomposed forms (e.g., `é` as a
single code point) and decomposed forms (e.g., `e` + combining acute) are normalized to NFC
before counting, so they will count identically.

However, not all combining mark sequences have a precomposed NFC form. Unusual combinations
(e.g., a base character + multiple stacking diacritics) that have no NFC equivalent will
remain as multiple code points, each counted by its Unicode range. If the base character is
in the Latin range (U+0000–U+10FF), each code point counts as 1. Combining marks in that
range also count as 1 each, so the combined glyph might count as 2+ weighted characters
despite looking like a single character to the user.

### X's Weighted Ranges vs. User Expectations

The weight=100 ranges cover:
- Basic Latin through Greek Extended (U+0000–U+10FF)
- Some General Punctuation (U+2000–U+202F)

Characters outside these ranges (Cyrillic Extended, Arabic, Hebrew, all CJK, all symbols
beyond U+10FF, emoji) count as **2**. For a sci-fi/techwear symbol set drawing from
mathematical operators (U+2200+), box-drawing (U+2500+), Enclosed Alphanumeric Supplement
(U+1F100+), or Braille (U+2800+), virtually all symbols will count as **2**.

This means the "character counter" will feel aggressive to users who use sci-fi symbols
heavily — 280 effective limit drops to 140 usable characters if all content is double-weight.
The UI should make this transparent (show weighted length, not raw code-point count).

### Summary of Gotchas Table

| Content type                    | Weight per visible unit | Notes                                            |
|---------------------------------|-------------------------|--------------------------------------------------|
| ASCII / Latin-1                 | 1                       | In weight=100 range                              |
| Greek, extended Latin           | 1                       | In weight=100 range (up to U+10FF)               |
| Hiragana / Katakana             | 2                       | Outside weight=100 ranges                        |
| Half-width katakana (ｱ–ﾟ)     | 2                       | "Half-width" visually but full-weight per X      |
| CJK Unified Ideographs          | 2                       | 140 char effective limit                         |
| Mathematical / box-drawing syms | 2                       | Most sci-fi symbols fall here                    |
| Emoji (simple)                  | 2                       | v3 with twemoji-parser                           |
| Emoji ZWJ sequences             | 2                       | v3 only; v2 counts each code point separately   |
| URLs (any length)               | 23 (fixed)              | Via t.co shortening                              |
| NFC combining marks             | 1 each if in Latin range| Can surprise users with multi-codepoint glyphs  |

---

## Conclusion

`twitter-text` v3 (`parseTweet` + `configs.defaults`) is the correct choice for Tweet Typer.
The API, configuration hook, and behavior all align with the project's requirements. See the
ticket Answer section for the concise decision.
