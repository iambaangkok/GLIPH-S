# Add Google Analytics (GA4) to GLIPH-S

Type: task
Status: open
Blocked by:

## Question

Add web analytics so we can see whether anyone visits/uses GLIPH-S at
https://gliph-s.iambaangkok.dev/. Primary ask: **Google Analytics 4 (GA4)**. GLIPH-S is a static,
client-side SPA with **no client router** (single page), so a single page-view on load is the whole
story — no route-change tracking needed.

This ticket is a **setup guide** (a task, not a decision). Follow it end-to-end; it's a website
change, so per [CLAUDE.md](../../../CLAUDE.md): do it on a **branch**, **bump the app version**, and
let master auto-deploy.

---

### Step 1 — Create the GA4 property (in the Google Analytics dashboard)

1. Go to https://analytics.google.com → **Admin** (gear, bottom-left).
2. **Create → Property**. Name it e.g. `GLIPH-S`, set timezone/currency → **Next** → fill the
   business details → **Create**.
3. Under the new property: **Data Streams → Add stream → Web**.
   - **Website URL:** `https://gliph-s.iambaangkok.dev`
   - **Stream name:** `GLIPH-S web`
4. Copy the **Measurement ID** — it looks like **`G-XXXXXXXXXX`**. (This ID is public/not a secret;
   it ships in the page HTML by design.)

### Step 2 — Add the gtag.js snippet to the page

GLIPH-S has no framework analytics plugin; the standard GA4 snippet in `index.html`'s `<head>` is
the simplest, canonical install. Paste this just below the `<title>` in
[index.html](../../../index.html), replacing `G-XXXXXXXXXX` with the real ID:

```html
<!-- Google Analytics (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

That single `config` call fires the automatic **page_view** on load — enough for "did anyone come."

**Optional (cleaner) — keep the ID in an env var instead of hardcoding.** Vite exposes
`import.meta.env.VITE_*`. Put `VITE_GA_ID=G-XXXXXXXXXX` in a `.env` (and set the same var in the
Cloudflare project's build env), then inject the script from `src/main.tsx` on mount only when the
var is set. Hardcoding in `index.html` is fine too — the ID is not secret. Pick one; don't do both.

### Step 3 — (Later, only if a router is ever added)

No action now. GLIPH-S is one page, so the load-time `page_view` covers it. If a client router is
introduced later, send a `page_view` event on each route change (`gtag('event', 'page_view', {...})`).

### Step 4 — Verify

1. `pnpm build && pnpm preview` locally (or deploy the branch) and open the site.
2. In GA4 → **Reports → Realtime** (or **Admin → DebugView**), confirm your own visit shows up
   within ~30s. Use an incognito window; ad-blockers/Brave block gtag, so test in a clean browser.

### Step 5 — Ship it (per CLAUDE.md)

- Work on a branch (e.g. `issue-20-google-analytics`), not master.
- **Website change → bump the version**: `v0.1.0 → v0.2.0` in the [App.tsx](../../../src/App.tsx)
  badge **and** `package.json` `"version"` (keep them in sync).
- Merge to master → Cloudflare auto-builds & deploys.

---

### Notes / decisions to be aware of

- **Privacy / cookie consent.** GA4 sets cookies and (in the EU/UK) generally requires a consent
  banner + Google **Consent Mode**. For a small personal tool this is often skipped, but it's a real
  legal consideration if you promote it broadly. Decide the risk you're comfortable with.
- **Cookieless alternative — Cloudflare Web Analytics.** Since GLIPH-S is already on Cloudflare, its
  built-in **Web Analytics** is free, **cookieless** (no consent banner needed), and enabled with a
  single beacon script from the Cloudflare dashboard (Analytics & Logs → Web Analytics → Add a site).
  It gives visits/page-views without GA's setup or privacy overhead. Not what was asked for, but if
  the only goal is "does anyone visit," it's the lower-friction option — consider running it instead
  of, or alongside, GA4.
- **Ad-blockers** block `googletagmanager.com`, so GA undercounts privacy-conscious users; Cloudflare
  Web Analytics (first-party) is less affected.
