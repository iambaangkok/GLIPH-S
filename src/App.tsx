/**
 * App shell — Variant-A locked 3-pane frame (V7.4 Kinetic Mono / Instrument)
 *
 * Pane layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Top bar (settings · import/export)                      │
 *   ├──────────────┬───────────────────────────┬───────────────┤
 *   │  Navigator   │  Thread editor (Post stack)│  Symbols panel│
 *   │  (left)      │  (center)                 │  (right)      │
 *   └──────────────┴───────────────────────────┴───────────────┘
 *
 * All panes are empty placeholders — downstream tickets fill them in.
 * The <StoreProvider> is live here; panes consume via useStore().
 */
import { StoreProvider } from './lib/StoreContext.tsx'
import { SelectionProvider } from './lib/SelectionContext.tsx'
import { InsertionProvider } from './lib/InsertionContext.tsx'
import { DialogProvider } from './DialogProvider.tsx'
import { Navigator } from './Navigator.tsx'
import { ThreadEditor } from './ThreadEditor.tsx'

export default function App() {
  return (
    <StoreProvider>
    <SelectionProvider>
    <InsertionProvider>
    <DialogProvider>
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'var(--topbar-h) 1fr',
        gridTemplateColumns: 'var(--nav-w) 1fr var(--panel-w)',
        height: '100%',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header
        style={{
          gridColumn: '1 / -1',
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
          textTransform: 'uppercase' as const,
          color: 'var(--muted)',
        }}
      >
        <span
          style={{
            color: 'var(--accent)',
            fontWeight: 700,
            letterSpacing: '0.18em',
          }}
        >
          Tweet·Typer
        </span>
        <div style={{ flex: 1 }} />
        {/* char-limit indicator (prototype `280` chip; wired by ticket 13) */}
        <span className="chip">280</span>
        {/* settings + import/export placeholders */}
        <button type="button" className="chip" aria-label="Settings" title="Settings">⚙</button>
        <button type="button" className="chip" aria-label="Import / export JSON" title="Import / export JSON">⇄ json</button>
      </header>

      {/* ── Left: Project/Thread navigator ──────────────────────────────── */}
      <nav
        style={{
          gridRow: 2,
          gridColumn: 1,
          background: 'var(--surface)',
          borderRight: '1px solid var(--line)',
          padding: 10,
          overflowY: 'auto' as const,
        }}
      >
        <Navigator />
      </nav>

      {/* ── Center: Thread editor / Post stack ──────────────────────────── */}
      <main
        className="editor-halftone center-scroll"
        style={{
          gridRow: 2,
          gridColumn: 2,
          backgroundColor: 'var(--bg)',
          padding: 14,
          overflowY: 'auto' as const,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 0,
        }}
      >
        <ThreadEditor />
      </main>

      {/* ── Right: Symbols / Styles side panel ──────────────────────────── */}
      <aside
        style={{
          gridRow: 2,
          gridColumn: 3,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          padding: 10,
          overflowY: 'auto' as const,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 0,
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
          }}
        >
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
            }}
          >
            Symbols
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius)',
              color: 'var(--muted)',
              border: '1px solid transparent',
            }}
          >
            Styles
          </span>
        </div>

        {/* V7.4 halftone band */}
        <div className="panel-halftone-band" style={{ marginBottom: 10 }} />

        {/* placeholder symbol grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 4,
          }}
        >
          {['☯', '⊕', '⊗', '⇄', '⌘', '⌥', '⎋', '⏎', '△', '▽', '◈', '◉'].map(
            (sym) => (
              <div
                key={sym}
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  aspectRatio: '1',
                  fontWeight: 400,
                  fontSize: 14,
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                }}
              >
                {sym}
              </div>
            ),
          )}
        </div>

        {/* ruler hairline decoration */}
        <div className="ruler" style={{ marginTop: 12 }} />

        <div
          className="label-mono"
          style={{ marginTop: 10, opacity: 0.4, fontSize: 9 }}
        >
          Symbol browser — ticket fills this
        </div>
      </aside>
    </div>
    </DialogProvider>
    </InsertionProvider>
    </SelectionProvider>
    </StoreProvider>
  )
}
