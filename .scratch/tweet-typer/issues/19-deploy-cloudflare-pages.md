# Deploy GLIPH-S as a static site on Cloudflare Pages (custom domain)

Type: grilling
Status: open
Blocked by:

## Question

GLIPH-S is a client-side, localStorage-only Vite/React SPA (no backend), so it ships as pure
static assets — a good fit for **Cloudflare Pages**. The goal: deploy it there and serve it from a
**custom domain the user will buy**, either as a **subdomain** (e.g. `gliph-s.example.com`) or as a
**page/subpath** under an existing site (e.g. `example.com/gliph-s`). Settle the decisions below,
then run the provisioning tasks.

### Decisions to settle first

1. **Domain name** — what root domain to buy (and where: **Cloudflare Registrar** keeps DNS +
   registration in one place and is at-cost; an external registrar means pointing nameservers at
   Cloudflare).
2. **Subdomain vs subpath** — this is the load-bearing decision because it changes the build:
   - **Subdomain** (`gliph-s.example.com`): served at root `/`; Vite `base` stays `'/'` — **no
     code change**. Simplest. Its own Pages project + a CNAME.
   - **Subpath** (`example.com/gliph-s/`): requires setting Vite **`base: '/gliph-s/'`** so asset
     URLs resolve, and the root domain must already be (or become) a Cloudflare Pages site that
     routes that path — meaningfully more setup. Confirm whether `example.com` is itself on
     Cloudflare Pages before choosing this.
3. **Deploy trigger** — Pages **Git integration** (auto-build on push to `master`, build command
   `pnpm build`, output dir `dist`, Node/pnpm detected) vs **Wrangler / direct upload** of `dist`.
   Git integration is the low-touch default.
4. **SPA fallback** — GLIPH-S is a single page with no client router, so a `404 → index.html`
   rewrite is **not required**; confirm no future routing need before relying on that.

### Provisioning tasks (after the decisions)

- [ ] Buy the domain (Cloudflare Registrar or external → move DNS to Cloudflare).
- [ ] Create a Cloudflare Pages project pointed at `github.com/iambaangkok/GLIPH-S`, branch
      `master`, build `pnpm build`, output `dist` (set `PNPM` / Node version if needed).
- [ ] Verify the `*.pages.dev` preview builds and runs (localStorage persistence, fonts from
      Google Fonts CDN, touch DnD).
- [ ] Attach the custom domain (subdomain CNAME, or subpath routing) per the decision above; apply
      the Vite `base` change **iff** subpath was chosen.
- [ ] Confirm HTTPS + the production URL serves the app.

### Notes / open fog

- The app fetches fonts from `fonts.googleapis.com` at runtime — fine on Pages, but note it for any
  future offline/self-hosted-fonts consideration (out of scope here).
- Build currently emits a >500 kB JS chunk (Lexical + twitter-text + twemoji). Acceptable for a
  static deploy; code-splitting is a separate later concern, not a deploy blocker.
- This ticket sits **beyond the original map destination** ("locked MVP spec"); it extends the
  effort into shipping. Resolve the decisions here, then the tasks, and record the live URL +
  Pages project name in the answer for later reference.
