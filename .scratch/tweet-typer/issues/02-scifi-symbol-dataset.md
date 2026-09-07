# Curate the sci-fi/techwear symbol dataset

Type: research
Status: claimed
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
