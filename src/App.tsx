/**
 * App shell — responsive (ticket 18, spec #16/#17).
 *
 * A single 768px breakpoint (`useMediaQuery`) flips between two structurally
 * different layouts, capped at --shell-max-w and letterboxed on ultra-wide:
 *
 *   ≥768  DesktopShell — the Variant-A 3-pane grid. Both sidebars are now
 *         user-collapsible to a labelled rail (#17 tablet/landscape band); neither
 *         auto-collapses, both open by default, so wide screens look unchanged.
 *
 *   <768  MobileShell — a 2-tab bottom bar (Threads · Editor, default Editor),
 *         one full-screen pane per tab, top bar retained. There is no standalone
 *         Symbols tab: the symbol browser folds into an in-editor <GlyphDock/> at
 *         the bottom of the Editor tab (#17). Settings opens as a near-full-width
 *         sheet.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Top bar (settings · import/export)                      │
 *   ├──────────────┬───────────────────────────┬───────────────┤
 *   │  Navigator   │  Thread editor (Post stack)│  Symbols panel│
 *   │  (left)      │  (center)                 │  (right)      │
 *   └──────────────┴───────────────────────────┴───────────────┘
 */
import { useState, type JSX, type ReactNode } from 'react'

import { StoreProvider } from './lib/StoreContext.tsx'
import { SelectionProvider } from './lib/SelectionContext.tsx'
import { InsertionProvider } from './lib/InsertionContext.tsx'
import { DialogProvider } from './DialogProvider.tsx'
import { Navigator } from './Navigator.tsx'
import { ThreadEditor } from './ThreadEditor.tsx'
import { SymbolPanel } from './SymbolPanel.tsx'
import { SettingsMenu } from './SettingsMenu.tsx'
import { GlyphDock } from './GlyphDock.tsx'
import { POST_MIME } from './lib/dnd.ts'
import { useMediaQuery, MOBILE_QUERY } from './lib/useMediaQuery.ts'

// ── Top bar ─────────────────────────────────────────────────────────────────────

function TopBar({ mobile }: { mobile?: boolean }): JSX.Element {
  return (
    <header
      style={{
        gridColumn: mobile ? undefined : '1 / -1',
        flex: mobile ? '0 0 auto' : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        height: 'var(--topbar-h)',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
      }}
    >
      <span style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.18em' }}>
        GLIPH-S
      </span>
      <div style={{ flex: 1 }} />
      <SettingsMenu sheet={mobile} />
    </header>
  )
}

// ── Center (shared) ──────────────────────────────────────────────────────────────

/** The Post-stack editor with the cross-pane post-drag cursor fix (#10). */
function CenterEditor({ flush }: { flush?: boolean }): JSX.Element {
  return (
    <main
      className="editor-halftone center-scroll"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(POST_MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      style={{
        gridRow: flush ? undefined : 2,
        gridColumn: flush ? undefined : 2,
        flex: flush ? 1 : undefined,
        minHeight: flush ? 0 : undefined,
        backgroundColor: 'var(--bg)',
        padding: 14,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <ThreadEditor />
    </main>
  )
}

// ── Desktop: collapsible side pane ────────────────────────────────────────────────

/**
 * A left/right pane with a header carrying a collapse chevron; when collapsed it
 * renders as a slim labelled rail the user taps to reopen. Neither pane
 * auto-collapses — this is entirely user-driven (#17).
 */
function CollapsiblePane({
  side,
  label,
  icon,
  collapsed,
  onToggle,
  children,
}: {
  side: 'left' | 'right'
  label: string
  icon: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}): JSX.Element {
  const border =
    side === 'left' ? { borderRight: '1px solid var(--line)' } : { borderLeft: '1px solid var(--line)' }
  // Chevrons point "outward-to-collapse" / "inward-to-expand".
  const collapseChevron = side === 'left' ? '⟨' : '⟩'
  const expandChevron = side === 'left' ? '⟩' : '⟨'

  if (collapsed) {
    return (
      <button
        type="button"
        className="pane-rail"
        aria-label={`Expand ${label}`}
        title={`Expand ${label}`}
        onClick={onToggle}
        style={{ ...border, gridRow: 2 }}
      >
        <span style={{ color: 'var(--warn)' }}>{expandChevron}</span>
        <span aria-hidden style={{ color: 'var(--muted)', fontSize: 14 }}>{icon}</span>
        <span className="pane-rail-label">{label}</span>
      </button>
    )
  }

  return (
    <aside
      style={{
        gridRow: 2,
        background: 'var(--surface)',
        ...border,
        overflow: 'hidden',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="pane-hdr">
        <span>{label}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Collapse ${label}`}
          title={`Collapse ${label}`}
          onClick={onToggle}
        >
          {collapseChevron}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </aside>
  )
}

function DesktopShell(): JSX.Element {
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  const leftCol = navCollapsed ? 'var(--rail-w)' : 'var(--nav-w)'
  const rightCol = panelCollapsed ? 'var(--rail-w)' : 'var(--panel-w)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'var(--topbar-h) 1fr',
        gridTemplateColumns: `${leftCol} 1fr ${rightCol}`,
        height: '100%',
        width: '100%',
        maxWidth: 'var(--shell-max-w)',
        borderInline: '1px solid var(--line)',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <TopBar />

      <CollapsiblePane
        side="left"
        label="Navigator"
        icon="❒"
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed((v) => !v)}
      >
        <Navigator />
      </CollapsiblePane>

      <CenterEditor />

      <CollapsiblePane
        side="right"
        label="Symbols / Styles"
        icon="◇"
        collapsed={panelCollapsed}
        onToggle={() => setPanelCollapsed((v) => !v)}
      >
        <SymbolPanel />
      </CollapsiblePane>
    </div>
  )
}

// ── Mobile ───────────────────────────────────────────────────────────────────────

type MobileTab = 'threads' | 'editor'

function MobileTabBar({
  active,
  onChange,
}: {
  active: MobileTab
  onChange: (t: MobileTab) => void
}): JSX.Element {
  const tabs: { id: MobileTab; icon: string; label: string }[] = [
    { id: 'threads', icon: '❒', label: 'Threads' },
    { id: 'editor', icon: '✎', label: 'Editor' },
  ]
  return (
    <nav className="tabbar" aria-label="Sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab${active === t.id ? ' on' : ''}`}
          aria-current={active === t.id}
          onClick={() => onChange(t.id)}
        >
          <span className="tab-ic" aria-hidden>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

function MobileShell(): JSX.Element {
  // Default view = Editor (#17).
  const [tab, setTab] = useState<MobileTab>('editor')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        maxWidth: 'var(--shell-max-w)',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <TopBar mobile />

      {/* One full-screen pane per tab; kept mounted so editor/scroll state and
          the glyph dock's mode survive tab switches. */}
      <div className="touch-region" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'threads' && (
          <div
            className="center-scroll"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--surface)', padding: 10 }}
          >
            <Navigator />
          </div>
        )}

        {tab === 'editor' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <CenterEditor flush />
            <GlyphDock />
          </div>
        )}
      </div>

      <MobileTabBar active={tab} onChange={setTab} />
    </div>
  )
}

// ── App root ───────────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  const isMobile = useMediaQuery(MOBILE_QUERY)

  return (
    <StoreProvider>
      <SelectionProvider>
        <InsertionProvider>
          <DialogProvider>
            {/* Ultra-wide letterbox: center the shell and cap at --shell-max-w. */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                height: '100%',
                background: 'var(--bg)',
              }}
            >
              {isMobile ? <MobileShell /> : <DesktopShell />}
            </div>
          </DialogProvider>
        </InsertionProvider>
      </SelectionProvider>
    </StoreProvider>
  )
}
