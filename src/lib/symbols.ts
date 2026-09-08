/**
 * Curated sci-fi / techwear symbol dataset loader (ticket #11, backed by #02).
 *
 * The dataset itself is the drop-in `research/symbols.json` produced by ticket
 * #02 — 649 verified BMP glyphs across 8 categories. A copy lives at
 * `src/data/symbols.json` so it ships in the bundle; the source of truth is the
 * research file. Everything here is read-only; the browser never mutates it.
 *
 * Note (from #01 / #02): half-width katakana and most glyphs above U+10FF weigh
 * **2** in twitter-text's weighted counting — the counter in the editor already
 * accounts for this; nothing to do here.
 */

import raw from '../data/symbols.json'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SymbolGlyph {
  /** The literal glyph to insert. */
  char: string
  /** Codepoint label, e.g. "U+3000". */
  cp: string
  /** Unicode name, used for search. */
  name: string
}

export interface SymbolCategory {
  id: string
  label: string
  description: string
  glyphs: SymbolGlyph[]
}

interface SymbolDataset {
  categories: SymbolCategory[]
}

// ── Loaded data ────────────────────────────────────────────────────────────────

const dataset = raw as unknown as SymbolDataset

export const SYMBOL_CATEGORIES: SymbolCategory[] = dataset.categories

/** Flat list of every glyph across all categories — used by search. */
export const ALL_GLYPHS: SymbolGlyph[] = SYMBOL_CATEGORIES.flatMap((c) => c.glyphs)

/** Lookup from glyph char → its metadata (for rendering Favorites / Recents). */
const GLYPH_BY_CHAR = new Map<string, SymbolGlyph>(
  ALL_GLYPHS.map((g) => [g.char, g]),
)

/**
 * Resolve a raw glyph char back to its dataset metadata. Favorites and Recents
 * persist only the bare char, so this rehydrates the name for tooltips. Falls
 * back to a minimal record if the char is not in the current dataset (e.g. an
 * older favorite from a dataset revision).
 */
export function glyphFor(char: string): SymbolGlyph {
  return GLYPH_BY_CHAR.get(char) ?? { char, cp: '', name: char }
}

/**
 * Case-insensitive search across all glyphs by Unicode name, codepoint, or an
 * exact char match. Empty query returns [].
 */
export function searchGlyphs(query: string): SymbolGlyph[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []
  return ALL_GLYPHS.filter(
    (g) =>
      g.char === query ||
      g.name.toLowerCase().includes(q) ||
      g.cp.toLowerCase().includes(q),
  )
}
