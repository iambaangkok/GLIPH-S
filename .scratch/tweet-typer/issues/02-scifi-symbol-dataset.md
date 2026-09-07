# Curate the sci-fi/techwear symbol dataset

Type: research
Status: resolved
Blocked by: —

## Question

Produce a curated dataset of "cool" unicode symbols for the browser, anchored to a
**sci-fi / techwear / industrial-micrographic aesthetic** (Ghost-in-the-Shell / 攻殻機動隊,
industrial label glyphs, micrographic technical marks). The exemplar the user gave is the
Japanese corner bracket 「 」.

Deliver:

1. **Category structure** — a proposed set of named categories that fit the aesthetic, e.g.
   CJK brackets & punctuation (「」『』【】〈〉《》), half-width katakana (ﾃｸﾉ),
   box-drawing & block elements (│ ┌ ▓ ▚ ░), geometric shapes (◢ ◤ ▲ ⬡ ◇),
   technical / APL / control-picture symbols (⌘ ⎔ ⏣ ⌥ ⎈ ␣), arrows (➤ ↳ ⤷ ⟶),
   dingbats & warning/status marks (⚠ ⏻ ✦ ⊘ ⛬). Refine/rename as the research warrants.
2. **The glyphs themselves** — for each category, a hand-picked list of characters with, for
   each: the character, its Unicode codepoint (U+XXXX), and its official name. Aim for a
   few hundred total high-signal glyphs, not exhaustive blocks.
3. **Source blocks** — which Unicode blocks the good stuff lives in, for reference.
4. **Rendering caveats** — glyphs with poor cross-platform/browser font coverage (may render
   as tofu ▯), and any that are surrogate pairs / combining marks worth flagging (ties to
   ticket 01's counting).
5. A machine-friendly shape (JSON-ish) so it can drop straight into the app dataset later.

Deliver findings + the dataset on a `research/symbol-dataset` branch with a context pointer
back to this ticket. This produces the dataset; it does not build the browser UI.

## Answer

**649 glyphs across 8 categories.** All are BMP codepoints (U+0000–U+FFFF); no surrogate
pairs; every glyph counts as 1 weighted character under the `twitter-text` algorithm.

### Categories chosen

| Category | Key | Count |
|---|---|---|
| CJK Brackets & Punctuation | `cjk-brackets` | 35 |
| Half-Width Katakana | `halfwidth-kata` | 63 |
| Box Drawing & Block Elements | `box-drawing` | 87 |
| Geometric Shapes | `geometric` | 84 |
| Technical & APL Symbols | `technical` | 122 |
| Arrows & Flow | `arrows` | 68 |
| Warning & Status Marks | `warning-status` | 127 |
| Math / Logic Operators | `math-logic` | 63 |
| **Total** | | **649** |

### Key decisions

- **SMP excluded**: Geometric Shapes Extended (U+1F780–U+1F7FF) was intentionally left out —
  those codepoints require surrogate pairs in UTF-16, count as 2 weighted characters on X,
  and have poor font coverage outside Noto Symbols 2.
- **Emoji overlap**: ~15 symbols (⚠ ⚡ ☢ ⚙ ★ ❄ etc.) have emoji dual-presentation — the app
  should append U+FE0E (VS15) to force text rendering when inserting them.
- **Halfwidth katakana**: U+FF9E and U+FF9F are spacing/combining marks; flagged `combining: true`
  in the dataset. They are BMP single codepoints and count as 1 character each.
- **APL symbols** (U+2336–U+237A) need Noto Sans Symbols 2 for full coverage — high-signal,
  but the app should warn or filter them behind a "show rare glyphs" toggle.

### Deliverables

- Full research + rendering caveats: `.scratch/tweet-typer/research/02-symbol-dataset.md`
- Machine-friendly JSON dataset: `.scratch/tweet-typer/research/symbols.json`

The JSON shape is `{ _meta, categories: [{ id, label, description, source_blocks, rendering_notes, glyphs: [{ char, cp, name, ?combining }] }] }` — ready to import directly into the app's symbol-browser data layer.
