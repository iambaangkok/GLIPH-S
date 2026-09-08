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
import { SymbolPanel } from './SymbolPanel.tsx'
import { POST_MIME } from './lib/dnd.ts'

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
      {/* Accept post drags across the whole pane so the cursor stays "move"
          (not the no-drop sign) anywhere in the center — individual post cards
          own the actual reorder + drop indicator. */}
      <main
        className="editor-halftone center-scroll"
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(POST_MIME)) return
          e.preventDefault()
          // Must be set on every dragover, or the boundary between cards falls
          // back to the "no-drop" cursor and flickers.
          e.dataTransfer.dropEffect = 'move'
        }}
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
          overflow: 'hidden',
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 0,
        }}
      >
        <SymbolPanel />
      </aside>
    </div>
    </DialogProvider>
    </InsertionProvider>
    </SelectionProvider>
    </StoreProvider>
  )
}
