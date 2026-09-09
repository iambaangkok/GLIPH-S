/**
 * Glyph dock — the mobile (<768px) home for the symbol UI (ticket 18, spec #17).
 *
 * On desktop the symbol browser lives in the right pane. On mobile there is no
 * standalone Symbols tab; the browser folds onto the writing surface as a dock
 * at the bottom of the Editor tab.
 *
 * Height is **freely drag-adjustable**: grab the grip bar at the top of the dock
 * and drag up/down (pointer events → works for mouse and touch) to size the tray
 * to taste. Drag it (almost) shut to collapse; a ▾ collapse button and a tap on
 * the collapsed handle are the discrete shortcuts. Two content modes:
 *
 *   • strip  — Favorites + Recent quick-insert rows, each independently
 *     collapsible (the same `tt:ui` flags the desktop panel uses, #15). Inserts
 *     via the existing `insertAtCursor()` seam (#10).
 *   • browse — the full <SymbolPanel/> (search · categories · grid · Styles +
 *     favorites management). Toggling it on grows the dock; the keyboard
 *     dismisses naturally because taps land outside the editor.
 *
 * Insertion keeps the editor's caret via onMouseDown+preventDefault and targets
 * the last-focused editor tracked in InsertionContext — so it hits the active
 * Post or Template even after the dock has taken focus.
 */
import { useCallback, useRef, useState, type JSX, type PointerEvent as ReactPointerEvent } from 'react'

import { useStore } from './lib/StoreContext.tsx'
import { useInsertion } from './lib/InsertionContext.tsx'
import { SymbolPanel } from './SymbolPanel.tsx'

const MIN_H = 120 // smallest expanded body height (px)
const DEFAULT_H = 220 // height a tap-to-expand / browse-off settles to
const COLLAPSE_AT = 72 // drag the body below this and it snaps shut
const maxHeight = () => Math.round(window.innerHeight * 0.72) // ~70% of the screen (#17)

const isCjk = (ch: string) => /[　-ヿ＀-￯]/.test(ch)

// ── Quick-insert strip row ──────────────────────────────────────────────────────

function StripSection({
  label,
  glyphs,
  collapsed,
  onToggle,
  onInsert,
  emptyHint,
}: {
  label: string
  glyphs: string[]
  collapsed: boolean
  onToggle: () => void
  onInsert: (char: string) => void
  emptyHint?: string
}): JSX.Element {
  return (
    <div style={{ marginBottom: 6 }}>
      <button
        type="button"
        className="label-mono"
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          width: '100%',
          margin: '0 0 5px',
          padding: 0,
          fontSize: 8.5,
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ opacity: 0.6, fontSize: 8, width: 8 }}>{collapsed ? '▸' : '▾'}</span>
        {label}
      </button>

      {!collapsed &&
        (glyphs.length > 0 ? (
          <div
            className="center-scroll dock-strip-row"
            style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}
          >
            {glyphs.map((char, i) => (
              <button
                key={`${char}-${i}`}
                type="button"
                className="dock-glyph"
                aria-label={`Insert ${char}`}
                title={char}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onInsert(char)
                }}
                style={{ fontFamily: isCjk(char) ? 'var(--font-cjk)' : 'var(--font-body)' }}
              >
                {char}
              </button>
            ))}
          </div>
        ) : (
          emptyHint && (
            <div className="label-mono" style={{ fontSize: 8.5, opacity: 0.35 }}>
              — {emptyHint} —
            </div>
          )
        ))}
    </div>
  )
}

// ── GlyphDock ─────────────────────────────────────────────────────────────────

export function GlyphDock(): JSX.Element {
  const [collapsed, setCollapsed] = useState(true)
  const [height, setHeight] = useState(DEFAULT_H)
  const [browse, setBrowse] = useState(false)
  const heightRef = useRef(height)
  heightRef.current = height

  const { state, addRecent, updateUi } = useStore()
  const { insertAtCursor } = useInsertion()

  const { favoritesCollapsed, recentsCollapsed } = state.ui
  const favorites = state.symbols.favorites
  const recents = state.symbols.recents

  const insert = (char: string) => {
    insertAtCursor(char)
    addRecent(char)
  }

  const applyHeight = useCallback((h: number) => {
    setHeight(h)
    heightRef.current = h
  }, [])

  // Drag the grip to resize (mouse + touch via pointer events). Dragging (almost)
  // shut collapses; a pure tap on the collapsed handle expands to the default.
  const beginResize = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault()
      const startY = e.clientY
      const startBody = collapsed ? 0 : heightRef.current
      let moved = false
      setCollapsed(false)

      const onMove = (ev: PointerEvent) => {
        const dy = startY - ev.clientY // up = grow
        if (Math.abs(dy) > 4) moved = true
        const h = Math.min(maxHeight(), Math.max(0, startBody + dy))
        applyHeight(h)
      }
      const onUp = () => {
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        const h = heightRef.current
        if (!moved && startBody === 0) {
          // Tap on the collapsed handle → open to a comfortable default.
          applyHeight(DEFAULT_H)
          setCollapsed(false)
          return
        }
        if (h < COLLAPSE_AT) {
          setCollapsed(true)
          applyHeight(DEFAULT_H) // reset for next open
        } else {
          applyHeight(Math.max(MIN_H, h))
        }
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [collapsed, applyHeight],
  )

  // Keyboard resize for the grip (accessibility): ↑/↓ adjust, Enter toggles.
  const onGripKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCollapsed(false)
        applyHeight(Math.min(maxHeight(), (collapsed ? 0 : heightRef.current) + 40))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const h = heightRef.current - 40
        if (h < COLLAPSE_AT) { setCollapsed(true); applyHeight(DEFAULT_H) }
        else applyHeight(h)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (collapsed) { setCollapsed(false); applyHeight(DEFAULT_H) }
        else setCollapsed(true)
      }
    },
    [collapsed, applyHeight],
  )

  const toggleBrowse = () => {
    setBrowse((b) => {
      const next = !b
      // Browsing wants room — grow the dock if it's currently short.
      if (next && heightRef.current < DEFAULT_H + 120) applyHeight(maxHeight())
      return next
    })
  }

  return (
    <div className="dock">
      {/* Resize grip — drag to adjust the tray height */}
      <div
        className={`dock-grip${collapsed ? ' dock-grip--collapsed' : ''}`}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize glyph tray — drag, or use arrow keys"
        aria-valuenow={collapsed ? 0 : height}
        tabIndex={0}
        onPointerDown={beginResize}
        onKeyDown={onGripKey}
      >
        <span className="dock-grip-bar" aria-hidden />
        {collapsed && (
          <span className="dock-grip-label">
            Glyphs <span style={{ opacity: 0.7 }}>▲</span>
          </span>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="dock-toolbar">
            <span className="label-mono" style={{ fontSize: 8.5 }}>Glyphs</span>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className={browse ? 'chip chip--accent' : 'chip'}
              aria-pressed={browse}
              aria-label={browse ? 'Quick strip' : 'Browse all glyphs'}
              onClick={toggleBrowse}
            >
              {browse ? '⇲ quick' : '⤢ browse all'}
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Collapse glyphs"
              title="Collapse"
              onClick={() => setCollapsed(true)}
            >
              ▾
            </button>
          </div>

          <div
            className="dock-body"
            style={{ height, overflowY: browse ? 'hidden' : 'auto' }}
          >
            {browse ? (
              <SymbolPanel />
            ) : (
              <>
                <StripSection
                  label="Favorites"
                  glyphs={favorites}
                  collapsed={favoritesCollapsed}
                  onToggle={() => updateUi({ favoritesCollapsed: !favoritesCollapsed })}
                  onInsert={insert}
                  emptyHint="pin glyphs with ★"
                />
                <StripSection
                  label="Recent"
                  glyphs={recents}
                  collapsed={recentsCollapsed}
                  onToggle={() => updateUi({ recentsCollapsed: !recentsCollapsed })}
                  onInsert={insert}
                  emptyHint="glyphs you insert appear here"
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
