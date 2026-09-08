/**
 * "Fancy fonts" selection transform (ticket #11 Styles tab, spec'd in #04).
 *
 * Contract (locked by ticket #04):
 *   • bidirectional map — every styled glyph knows its ASCII base
 *   • normalize-to-ASCII-then-apply — a selection is first stripped back to its
 *     plain base, then the target style is applied. This makes styles
 *     **mutually exclusive** for free: applying Italic over Bold yields Italic,
 *     never Bold-Italic-by-accident.
 *   • Normal = reverse — the "Normal" style is just the normalize step.
 *   • unmapped pass-through — characters the target style has no glyph for
 *     (punctuation, spaces, emoji, CJK) survive untouched.
 *   • no-op on empty selection — enforced by the caller (transformSelection).
 *
 * The mapped alphabets are Unicode "Mathematical Alphanumeric Symbols" (mostly
 * SMP / surrogate pairs) plus Fullwidth Forms. Because they live in the astral
 * plane we iterate by **code point** (`Array.from`), never UTF-16 unit. Per
 * ticket #01 these SMP glyphs weigh 2 in twitter-text counting — expected.
 */

// ── Style catalogue ─────────────────────────────────────────────────────────────

export type StyleId =
  | 'normal'
  | 'bold'
  | 'italic'
  | 'boldItalic'
  | 'script'
  | 'monospace'
  | 'doubleStruck'
  | 'sansBold'
  | 'fullwidth'

export interface StyleDef {
  id: StyleId
  /** Short label for the button. */
  label: string
  /** A tiny sample rendered on the button ("Ab") in the style itself. */
  sample: string
}

// ── Alphabet builders ───────────────────────────────────────────────────────────

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'

/**
 * Build a base→styled map for a contiguous alphabet starting at `startCp`,
 * then patch any holes (letters that live outside the contiguous block, e.g.
 * script/double-struck letters borrowed from the Letterlike Symbols block).
 */
function alphabet(
  base: string,
  startCp: number,
  holes: Record<string, number> = {},
): Record<string, string> {
  const map: Record<string, string> = {}
  for (let i = 0; i < base.length; i++) {
    const ch = base[i]
    const cp = holes[ch] ?? startCp + i
    map[ch] = String.fromCodePoint(cp)
  }
  return map
}

function buildStyle(
  upper: Record<string, string>,
  lower: Record<string, string>,
  digits: Record<string, string> = {},
): Record<string, string> {
  return { ...upper, ...lower, ...digits }
}

// Bold
const BOLD = buildStyle(
  alphabet(UPPER, 0x1d400),
  alphabet(LOWER, 0x1d41a),
  alphabet(DIGITS, 0x1d7ce),
)

// Italic (lowercase h borrows U+210E; no styled digits)
const ITALIC = buildStyle(
  alphabet(UPPER, 0x1d434),
  alphabet(LOWER, 0x1d44e, { h: 0x210e }),
)

// Bold Italic (no styled digits)
const BOLD_ITALIC = buildStyle(
  alphabet(UPPER, 0x1d468),
  alphabet(LOWER, 0x1d482),
)

// Script (many Letterlike-Symbols holes; no styled digits)
const SCRIPT = buildStyle(
  alphabet(UPPER, 0x1d49c, {
    B: 0x212c, E: 0x2130, F: 0x2131, H: 0x210b,
    I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211b,
  }),
  alphabet(LOWER, 0x1d4b6, { e: 0x212f, g: 0x210a, o: 0x2134 }),
)

// Monospace
const MONOSPACE = buildStyle(
  alphabet(UPPER, 0x1d670),
  alphabet(LOWER, 0x1d68a),
  alphabet(DIGITS, 0x1d7f6),
)

// Double-struck (uppercase holes; contiguous digits)
const DOUBLE_STRUCK = buildStyle(
  alphabet(UPPER, 0x1d538, {
    C: 0x2102, H: 0x210d, N: 0x2115, P: 0x2119,
    Q: 0x211a, R: 0x211d, Z: 0x2124,
  }),
  alphabet(LOWER, 0x1d552),
  alphabet(DIGITS, 0x1d7d8),
)

// Sans-serif Bold
const SANS_BOLD = buildStyle(
  alphabet(UPPER, 0x1d5d4),
  alphabet(LOWER, 0x1d5ee),
  alphabet(DIGITS, 0x1d7ec),
)

// Fullwidth Forms (BMP)
const FULLWIDTH = buildStyle(
  alphabet(UPPER, 0xff21),
  alphabet(LOWER, 0xff41),
  alphabet(DIGITS, 0xff10),
)

// ── Registries ──────────────────────────────────────────────────────────────────

const STYLE_MAPS: Record<Exclude<StyleId, 'normal'>, Record<string, string>> = {
  bold: BOLD,
  italic: ITALIC,
  boldItalic: BOLD_ITALIC,
  script: SCRIPT,
  monospace: MONOSPACE,
  doubleStruck: DOUBLE_STRUCK,
  sansBold: SANS_BOLD,
  fullwidth: FULLWIDTH,
}

/** styled-glyph → ASCII-base, aggregated across every style (the reverse map). */
const REVERSE: Record<string, string> = (() => {
  const rev: Record<string, string> = {}
  for (const map of Object.values(STYLE_MAPS)) {
    for (const [base, styled] of Object.entries(map)) {
      // First writer wins is fine — every style maps back to the same base.
      if (!(styled in rev)) rev[styled] = base
    }
  }
  return rev
})()

/** Ordered list for the Styles tab UI. */
export const STYLES: StyleDef[] = [
  { id: 'normal',       label: 'Normal',        sample: 'Ab' },
  { id: 'bold',         label: 'Bold',          sample: applyStyle('Ab', 'bold') },
  { id: 'italic',       label: 'Italic',        sample: applyStyle('Ab', 'italic') },
  { id: 'boldItalic',   label: 'Bold Italic',   sample: applyStyle('Ab', 'boldItalic') },
  { id: 'script',       label: 'Script',        sample: applyStyle('Ab', 'script') },
  { id: 'monospace',    label: 'Mono',          sample: applyStyle('Ab', 'monospace') },
  { id: 'doubleStruck', label: 'Double',        sample: applyStyle('Ab', 'doubleStruck') },
  { id: 'sansBold',     label: 'Sans Bold',     sample: applyStyle('Ab', 'sansBold') },
  { id: 'fullwidth',    label: 'Fullwidth',     sample: applyStyle('Ab', 'fullwidth') },
]

// ── Transform ───────────────────────────────────────────────────────────────────

/**
 * Normalize `text` back to its ASCII base by reversing any known styled glyph.
 * Unknown glyphs pass through untouched.
 */
export function normalizeStyle(text: string): string {
  return Array.from(text)
    .map((ch) => REVERSE[ch] ?? ch)
    .join('')
}

/**
 * Apply `styleId` to `text`: normalize to ASCII first, then map each character
 * through the target style. `'normal'` is just the normalize step. Characters
 * the style has no glyph for pass through unchanged.
 */
export function applyStyle(text: string, styleId: StyleId): string {
  const normalized = normalizeStyle(text)
  if (styleId === 'normal') return normalized
  const map = STYLE_MAPS[styleId]
  return Array.from(normalized)
    .map((ch) => map[ch] ?? ch)
    .join('')
}
