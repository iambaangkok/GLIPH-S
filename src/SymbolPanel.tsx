/**
 * Symbol browser + Styles tab — right pane (ticket #11, the **core** feature).
 *
 * Two tabs (mutually exclusive, per the layout decision in #05):
 *
 *   • Symbols — curated categories from the #02 dataset + search + Favorites +
 *     Recents (capped at 50 by the store). Clicking a glyph inserts it at the
 *     cursor of the last-focused Post editor via the #10 insertion seam and
 *     records it in Recents. A hover star pins/unpins a Favorite.
 *
 *   • Styles — "fancy fonts" selection transform. Each button restyles the
 *     current selection in place via `transformSelection` + `applyStyle`
 *     (normalize-to-ASCII-then-apply, mutually exclusive, unmapped pass-through,
 *     no-op on empty selection — all handled in styles.ts / InsertionContext).
 *
 * Insertion / transform buttons use `onMouseDown` + `preventDefault` so focus
 * (and the caret / selection) stays in the editor — this also covers the
 * search-box-focus case called out in #04.
 *
 * Layout: the panel is a flex column that fills the aside; the header (tabs,
 * search, category picker, hover-info) stays put while only the glyph grid
 * scrolls — the panel never squeezes horizontally.
 *
 * V7.4 "Kinetic Mono / Instrument": halftone panel band, stadium chips, ruler
 * hairlines, mono labels, single amber signal reserved for over-limit (so the
 * panel stays monochrome — favorites use the cream accent, not amber).
 */

import { useState, type CSSProperties, type JSX } from 'react'

import { useStore } from './lib/StoreContext.tsx'
import { useInsertion } from './lib/InsertionContext.tsx'
import {
  SYMBOL_CATEGORIES,
  glyphFor,
  searchGlyphs,
  type SymbolGlyph,
} from './lib/symbols.ts'
import { STYLES, applyStyle } from './lib/styles.ts'

type Tab = 'symbols' | 'styles'

// ── Shared styling ──────────────────────────────────────────────────────────────

const GRID: CSSProperties = {
  // minmax(0, 1fr) — NOT the default 1fr (== minmax(auto,1fr)) — so wide glyphs
  // (box-drawing / APL) can't force the tracks past the panel width and squeeze
  // the whole 3-pane layout. Cells clip via glyph-cell overflow instead.
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 4,
}

const COL_FILL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
}

const isCjk = (ch: string) => /[　-ヿ＀-￯]/.test(ch)

// ── GlyphCell ───────────────────────────────────────────────────────────────────

/**
 * A single glyph button. Clicking inserts + records a recent; the corner star
 * (shown on hover, or always when favorited) toggles the favorite without
 * inserting. Both use onMouseDown+preventDefault to keep editor focus. Hovering
 * reports the glyph up so the panel can show its name.
 */
function GlyphCell({
  glyph,
  favorite,
  onInsert,
  onToggleFavorite,
  onHover,
}: {
  glyph: SymbolGlyph
  favorite: boolean
  onInsert: (char: string) => void
  onToggleFavorite: (char: string) => void
  onHover: (glyph: SymbolGlyph | null) => void
}): JSX.Element {
  return (
    <div
      className="glyph-wrap"
      onMouseEnter={() => onHover(glyph)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        type="button"
        className="glyph-cell"
        title={`${glyph.char}  ${glyph.name}${glyph.cp ? `  (${glyph.cp})` : ''}`}
        aria-label={glyph.name || glyph.char}
        onMouseDown={(e) => {
          e.preventDefault()
          onInsert(glyph.char)
        }}
        style={{ fontFamily: isCjk(glyph.char) ? 'var(--font-cjk)' : 'var(--font-body)' }}
      >
        {glyph.char}
      </button>

      <button
        type="button"
        className={`glyph-star${favorite ? ' is-fav' : ''}`}
        aria-label={favorite ? 'Unpin favorite' : 'Pin favorite'}
        title={favorite ? 'Unpin favorite' : 'Pin favorite'}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggleFavorite(glyph.char)
        }}
      >
        {favorite ? '★' : '☆'}
      </button>
    </div>
  )
}

// ── Section header ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="label-mono" style={{ fontSize: 9, margin: '10px 0 6px' }}>
      {children}
    </div>
  )
}

// ── Symbols tab ─────────────────────────────────────────────────────────────────

function SymbolsTab(): JSX.Element {
  const { state, addFavorite, removeFavorite, addRecent } = useStore()
  const { insertAtCursor } = useInsertion()

  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string>(SYMBOL_CATEGORIES[0].id)
  const [hovered, setHovered] = useState<SymbolGlyph | null>(null)
  const [picked, setPicked] = useState<SymbolGlyph | null>(null)

  const favorites = state.symbols.favorites
  const recents = state.symbols.recents
  const favSet = new Set(favorites)

  const handleInsert = (char: string) => {
    insertAtCursor(char)
    addRecent(char)
    setPicked(glyphFor(char))
  }

  const handleToggleFavorite = (char: string) => {
    if (favSet.has(char)) removeFavorite(char)
    else addFavorite(char)
  }

  const renderGrid = (glyphs: SymbolGlyph[], keyPrefix: string) => (
    <div style={GRID}>
      {glyphs.map((g, i) => (
        <GlyphCell
          key={`${keyPrefix}-${g.char}-${i}`}
          glyph={g}
          favorite={favSet.has(g.char)}
          onInsert={handleInsert}
          onToggleFavorite={handleToggleFavorite}
          onHover={setHovered}
        />
      ))}
    </div>
  )

  const q = query.trim()
  const searchResults = q === '' ? null : searchGlyphs(q)
  const activeCategory =
    SYMBOL_CATEGORIES.find((c) => c.id === activeCat) ?? SYMBOL_CATEGORIES[0]

  // The info line: what's under the pointer, else the current scope summary.
  const scopeLabel = searchResults
    ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
    : `${activeCategory.label} · ${activeCategory.glyphs.length}`

  return (
    <div style={COL_FILL}>
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="search glyphs…"
        aria-label="Search glyphs"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          padding: '5px 8px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          color: 'var(--fg)',
          outline: 'none',
        }}
      />

      {!searchResults && (
        <select
          value={activeCat}
          onChange={(e) => setActiveCat(e.target.value)}
          aria-label="Symbol category"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            marginTop: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            padding: '5px 8px',
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            color: 'var(--fg)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {SYMBOL_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} · {c.glyphs.length}
            </option>
          ))}
        </select>
      )}

      {/* Scope label + hovered-glyph name (2-line info block) */}
      <div style={{ margin: '8px 0 2px' }}>
        <div className="label-mono" style={{ fontSize: 9 }}>
          {scopeLabel}
        </div>
        {(() => {
          // Default (non-hover) shows the last glyph the user clicked.
          const info = hovered ?? picked
          return (
            <div
              style={{
                marginTop: 3,
                // Reserve ~2 lines so the block doesn't jump as names wrap.
                minHeight: 28,
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                lineHeight: 1.4,
                letterSpacing: '0.04em',
                color: info ? 'var(--fg)' : 'var(--muted)',
                opacity: info ? 0.9 : 0.4,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
              }}
            >
              {info
                ? `${info.char}  ${info.name}${info.cp ? `  ${info.cp}` : ''}`
                : '—'}
            </div>
          )
        })()}
      </div>

      {/* Favorites + Recent — pinned in the fixed header, out of the scroll. */}
      {!searchResults && (
        <>
          {/* Favorites — always present so pinning has a visible home. */}
          <SectionLabel>Favorites</SectionLabel>
          {favorites.length > 0 ? (
            renderGrid(favorites.map(glyphFor), 'fav')
          ) : (
            <div
              className="label-mono"
              style={{ fontSize: 8.5, opacity: 0.35, marginBottom: 4 }}
            >
              — pin glyphs with ★ —
            </div>
          )}

          {recents.length > 0 && (
            <>
              <SectionLabel>Recent</SectionLabel>
              {renderGrid(recents.map(glyphFor), 'rec')}
            </>
          )}
        </>
      )}

      {!searchResults && <SectionLabel>{activeCategory.label}</SectionLabel>}
      <div className="ruler" style={{ margin: '2px 0 8px' }} />

      {/* ── Scrollable body — only the active category / search grid ──────── */}
      <div
        className="center-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          // Reserve the scrollbar gutter always, so the grid width is stable
          // and the panel never reflows/shrinks when the scrollbar appears.
          scrollbarGutter: 'stable',
        }}
      >
        {searchResults ? (
          searchResults.length === 0 ? (
            <div
              className="label-mono"
              style={{ fontSize: 9, opacity: 0.4, marginTop: 4 }}
            >
              — no glyphs match —
            </div>
          ) : (
            renderGrid(searchResults, 'search')
          )
        ) : (
          renderGrid(activeCategory.glyphs, activeCat)
        )}
      </div>
    </div>
  )
}

// ── Styles tab ──────────────────────────────────────────────────────────────────

function StylesTab(): JSX.Element {
  const { transformSelection } = useInsertion()

  return (
    <div style={COL_FILL}>
      <div
        className="label-mono"
        style={{ fontSize: 9, opacity: 0.6, marginBottom: 8, lineHeight: 1.5 }}
      >
        Select text in a post, then apply a style.
      </div>

      <div
        className="center-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarGutter: 'stable',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              transformSelection((sel) => applyStyle(sel, s.id))
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '7px 10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              color: 'var(--fg)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textAlign: 'left',
            }}
          >
            <span style={{ color: 'var(--muted)' }}>{s.label}</span>
            <span style={{ fontSize: 15 }}>{s.sample}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Tab bar ─────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '3px 10px',
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        background: 'none',
        cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--muted)',
        border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  )
}

// ── SymbolPanel (right pane root export) ─────────────────────────────────────────

export function SymbolPanel(): JSX.Element {
  const [tab, setTab] = useState<Tab>('symbols')

  return (
    <div style={COL_FILL}>
      {/* Tabs (fixed) */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0 }}>
        <TabButton active={tab === 'symbols'} onClick={() => setTab('symbols')}>
          Symbols
        </TabButton>
        <TabButton active={tab === 'styles'} onClick={() => setTab('styles')}>
          Styles
        </TabButton>
      </div>

      {/* V7.4 halftone band (fixed) */}
      <div className="panel-halftone-band" style={{ marginBottom: 10, flexShrink: 0 }} />

      {tab === 'symbols' ? <SymbolsTab /> : <StylesTab />}
    </div>
  )
}
