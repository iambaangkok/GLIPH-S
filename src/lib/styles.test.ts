/**
 * Tests for the "fancy fonts" selection transform (ticket #11 Styles tab).
 *
 * Asserts the contract locked in ticket #04:
 *   • normalize-to-ASCII-then-apply
 *   • Normal = reverse (styled → plain)
 *   • mutually exclusive (restyling replaces, never stacks)
 *   • unmapped pass-through (punctuation / spaces / emoji / CJK survive)
 *   • round-trips through each style back to the original ASCII
 */

import { describe, expect, it } from 'vitest'
import {
  STYLES,
  applyStyle,
  normalizeStyle,
  type StyleId,
} from './styles.ts'

const NON_NORMAL: StyleId[] = STYLES.map((s) => s.id).filter(
  (id) => id !== 'normal',
)

describe('applyStyle', () => {
  it('bolds ASCII letters and digits', () => {
    expect(applyStyle('Ab9', 'bold')).toBe('𝐀𝐛𝟗')
  })

  it('leaves unmapped characters (space, punctuation, emoji) untouched', () => {
    // Italic has no styled digits → digits pass through; so do space/!/emoji/CJK.
    expect(applyStyle('Hi 9! 🚀 「」', 'italic')).toBe('𝐻𝑖 9! 🚀 「」')
  })

  it("Normal reverses any styled text back to ASCII", () => {
    const bolded = applyStyle('Hello 42', 'bold')
    expect(bolded).not.toBe('Hello 42')
    expect(applyStyle(bolded, 'normal')).toBe('Hello 42')
  })

  it('is mutually exclusive — restyling replaces, never stacks', () => {
    const bolded = applyStyle('Word', 'bold')
    const italicFromBold = applyStyle(bolded, 'italic')
    const italicFromPlain = applyStyle('Word', 'italic')
    expect(italicFromBold).toBe(italicFromPlain)
  })

  it('handles the Letterlike-Symbols holes (script B/e, double-struck R)', () => {
    // Script B → ℬ (U+212C), script e → ℯ (U+212F)
    expect(applyStyle('Be', 'script')).toBe('ℬℯ')
    // Double-struck R → ℝ (U+211D), N → ℕ (U+2115)
    expect(applyStyle('RN', 'doubleStruck')).toBe('ℝℕ')
  })

  it('fullwidth maps into the BMP Fullwidth Forms block', () => {
    expect(applyStyle('AZ09', 'fullwidth')).toBe('ＡＺ０９')
  })

  it.each(NON_NORMAL)('round-trips ASCII through %s and back', (id) => {
    const source = 'The Quick Brown Fox 0123456789'
    const styled = applyStyle(source, id)
    expect(normalizeStyle(styled)).toBe(source)
  })

  it('applying normal to plain ASCII is a no-op', () => {
    expect(applyStyle('plain text 123', 'normal')).toBe('plain text 123')
  })
})

describe('STYLES catalogue', () => {
  it('renders a live sample for each non-normal style', () => {
    for (const s of STYLES) {
      if (s.id === 'normal') {
        expect(s.sample).toBe('Ab')
      } else {
        expect(s.sample).toBe(applyStyle('Ab', s.id))
        expect(s.sample).not.toBe('Ab')
      }
    }
  })
})
