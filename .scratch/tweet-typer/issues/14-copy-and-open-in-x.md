# Per-Post copy + "Open in X" intent link

Type: task
Status: resolved
Blocked by: 10

## Task

Add the per-Post output controls in each Post footer (layout locked in #05).

- **Copy** the Post's plain text to clipboard.
- **"Open in X"** intent link (`https://x.com/intent/post?text=…`, URL-encoded) — output option C.
- V7.4 treatment: stadium pill buttons, amber primary as in the prototype Post footer.

Done when each Post can be copied and opened in X's composer.

## Answer

Added the two per-Post output controls to the Post footer in `src/ThreadEditor.tsx`
(`PostEditor`), sitting to the right of the ruler-gauge after the `over limit`/`copied`
status labels — the layout locked in #05 and the exact footer treatment already shipped for
templates in #12/`TemplateEditor`. This was pure UI: the Post's plain text is already the live
canonical `liveText` state driving the counter, so both controls just read it.

- **Copy** — a secondary stadium `chip` (`⧉ copy`) → `navigator.clipboard.writeText(liveText)`
  with a 1.5 s amber `copied` flash, mirroring the template copy (try/catch swallows the
  insecure-context / permission-denied case).
- **Open in X** — output option **C**: a **symbol-only** `chip` **anchor** (`↗ 𝕏` — arrow + the X
  double-struck mark) whose `href` is `https://x.com/intent/post?text=${encodeURIComponent(liveText)}`,
  opened in a new tab (`target="_blank"` + `rel="noopener noreferrer"`). URL-encoding handles the
  curated symbols / fancy-font glyphs safely. **Revised (user request):** dropped the amber
  `chip--accent` primary styling so it reads dimmed/secondary like copy, and stripped both labels down
  to their glyphs.
- **Thread-level "Open in X" is not possible via a link** and stays per-Post: X's `intent/post` URL
  prefills a single composer only (no multi-post/thread parameter). A real thread needs the X API +
  auth, already **Out of scope** on the map ("API posting to X, or authentication").
- Both are **disabled on an empty Post**: the button via `disabled`; the anchor via a new
  `chip--disabled` class (`pointer-events:none` + dimmed) plus `aria-disabled` and a
  `preventDefault` guard, since `:disabled` doesn't apply to `<a>`. Descriptive `aria-label`/`title`
  remain ("Copy post to clipboard" / "Open in X") so the glyph-only buttons stay accessible.

**CSS:** added `a.chip` / `a.chip:hover` / `.chip--disabled` rules in `src/index.css`
(anchors need explicit `text-decoration:none` + hover; `button.chip:disabled` doesn't cover them).

**Scope:** the JSON export/import half of output option D already shipped in #13; this ticket was
only the per-Post C controls. Nothing new surfaced — no fog to graduate.

**Verified:** `pnpm build` clean, `pnpm test` **52/52**, `oxlint src/` exit 0 (only pre-existing
warnings; no new ones). Not committed. Files: `src/ThreadEditor.tsx`, `src/index.css`.
