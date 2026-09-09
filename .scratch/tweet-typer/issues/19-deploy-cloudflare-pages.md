# Deploy GLIPH-S as a static site on Cloudflare Pages (custom domain)

Type: grilling
Status: claimed
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

### Domain candidates (discussion so far — NOT yet decided)

The user's handle `@meisbk` reads soft/cute; they want the domain to stay tied to their identity
(name **Baangkok Vanijyananda**, github/email **iambaangkok**, initials **BK**) but read *cool /
sci-fi* to match GLIPH-S. Working model: **a personal root domain, with GLIPH-S as a subdomain of
it** (`gliph-s.<root>`) — which also happens to be the zero-code-change deploy path (Vite `base`
stays `'/'`).

- **iambaangkok.dev** — leading candidate. Reads as a durable *personal home* (a person never goes
  "out of scope" the way a themed name can), exact match to github + email for free brand
  consistency. `.dev` is cool + engineer-flavored. Soft spot: `.dev` leans code, a hair off if
  future projects go fully non-code.
- **baangkok.dev / .com** — shorter, but collides with the city "Bangkok" and isn't the literal
  username.
- **bk.systems** — coolest, most on-brand with GLIPH-S ("BK SYSTEMS" = cyberpunk megacorp), but
  it's a *label/theme*, not an umbrella — "systems" pinches for future art/music/writing projects,
  and it's a rarer TLD people mistype. **Resolution:** keep "BK SYSTEMS" as a *wordmark stamped on
  GLIPH-S's UI*, not as the address (a domain ≠ a wordmark).

**Cost note (`.dev`):** HTTPS is mandatory (`.dev` is HSTS-preloaded), but the **TLS certificate is
free and auto-provisioned/renewed by Cloudflare Pages** — you do NOT buy a cert. Only recurring
cost is the domain registration (~$12/yr ballpark at Cloudflare Registrar, at-cost; confirm live).
Pages free tier covers the hosting at $0.

Still open: final root + TLD; then subdomain-vs-subpath (item 2 above) falls out of it.

---

### Cloudflare walkthrough (runbook — do these once the domain is picked)

**Prereq — repo on GitHub.** Git-integration deploy needs the repo hosted. This repo is local-only
today. Create `github.com/iambaangkok/GLIPH-S` (or your chosen name), then from the repo root:
`git remote add origin git@github.com:iambaangkok/GLIPH-S.git && git push -u origin master`.
(Skip only if you choose Wrangler/direct-upload instead — see step 3B.)

**1 — Buy / bring the domain.**
- *Option A — Cloudflare Registrar (recommended, keeps DNS + registration in one place):*
  Dash → **Domain Registration → Register Domains** → search your pick → buy. The zone is created
  and DNS is on Cloudflare automatically. Nothing else to point.
- *Option B — external registrar:* buy there, then in Cloudflare **Add a site**, and at the
  registrar replace the **nameservers** with the two Cloudflare gives you. Wait for the zone to go
  **Active** (minutes–hours) before attaching a custom domain in step 5.

**2 — Create the Pages project (Git integration — the low-touch default).**
Dash → **Workers & Pages → Create → Pages → Connect to Git** → authorize GitHub → pick the repo.
Build settings:
- **Production branch:** `master`
- **Framework preset:** *None* (or "Vite" if offered)
- **Build command:** `pnpm build`
- **Build output directory:** `dist`
- **Root directory:** *(leave blank — repo root)*
- pnpm is auto-detected from `pnpm-lock.yaml`. If the build errors on Node/pnpm version, add an
  env var **`NODE_VERSION`** (e.g. `20`) under Settings → Environment variables, or commit a
  `.node-version` file. Save → it runs the first build.

**3B — Alternative deploy (Wrangler / direct upload), if you skip Git integration.**
`pnpm build` locally, then `pnpm dlx wrangler pages deploy dist --project-name gliph-s`. No GitHub
needed; you re-run this on each release instead of auto-build-on-push.

**4 — Verify the preview.** Open the `https://<project>.pages.dev` URL Cloudflare gives you and
sanity-check the live app: localStorage persistence survives reload, Google-Fonts CDN loads the
typefaces, and touch drag-and-drop works on a phone. Fix any build issues before attaching a domain.

**5 — Attach the custom domain.** Pages project → **Custom domains → Set up a domain**.
- *Subdomain (`gliph-s.<root>`) — recommended:* enter it; Cloudflare adds the **CNAME → `<project>.pages.dev`**
  for you (since the zone is on Cloudflare). Done. **No Vite change** — `base` stays `'/'`.
- *Subpath (`<root>/gliph-s/`):* only if `<root>` is *itself* already a Pages site; you route the
  path there **and** must set Vite **`base: '/gliph-s/'`** (step 6) so assets resolve. Meaningfully
  more setup — prefer the subdomain unless you specifically want the app under an existing site.

**6 — Vite `base` change — ONLY if subpath was chosen.** In `vite.config.ts` set
`base: '/gliph-s/'`, commit, push (triggers a rebuild). Skip entirely for a subdomain.

**7 — Confirm production.** Load the custom-domain URL over **https://** (auto-cert may take a
minute to issue) and re-run the step-4 checks. Record the final live URL + Pages project name in
the Answer when this ticket resolves.

**SPA fallback:** not needed — GLIPH-S is a single page with no client router, so no
`404 → index.html` rewrite. Revisit only if a client router is ever added.

---

### Deploy log — build fixes

- **First Pages build failed** at `pnpm install --frozen-lockfile` with
  `ERR packages field missing or empty`. Root cause: [pnpm-workspace.yaml](../../../pnpm-workspace.yaml)
  existed only to hold build-script config but had no `packages:` field. Cloudflare runs
  **pnpm 10.11.1**, which hard-requires `packages:` once that file is present (local pnpm 12
  tolerated its absence, so it was invisible until deploy). **Fix:** added `packages: [.]`.
  Also carried the build-allow config under both spellings — `allowBuilds` (pnpm 11+, local v12)
  and `onlyBuiltDependencies` (pnpm 10, Cloudflare) — since the key was renamed across majors and
  each version silently ignores the other's; this clears the follow-on `ERR_PNPM_IGNORED_BUILDS`
  for `core-js@2` (a harmless transitive twitter-text polyfill, bundled from source). Verified
  clean-clone `pnpm install --frozen-lockfile` exit 0, `pnpm build` exit 0, `pnpm test` 63/63.
  **Not yet committed — commit + push both files to trigger a fresh Pages build.**

### Notes / open fog

- The app fetches fonts from `fonts.googleapis.com` at runtime — fine on Pages, but note it for any
  future offline/self-hosted-fonts consideration (out of scope here).
- Build currently emits a >500 kB JS chunk (Lexical + twitter-text + twemoji). Acceptable for a
  static deploy; code-splitting is a separate later concern, not a deploy blocker.
- This ticket sits **beyond the original map destination** ("locked MVP spec"); it extends the
  effort into shipping. Resolve the decisions here, then the tasks, and record the live URL +
  Pages project name in the answer for later reference.
