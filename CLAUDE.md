# CLAUDE.md — working agreement for GLIPH-S

Instructions for any agent working in this repo. For domain language (Project / Thread / Post /
Template / Symbol), read [CONTEXT.md](CONTEXT.md). Tickets live in `.scratch/tweet-typer/` (local
markdown tracker; the wayfinder map is `.scratch/tweet-typer/map.md`).

## Git workflow — never commit to master directly

`master` is **production**: pushing to it triggers an automatic Cloudflare build + deploy to
https://gliph-s.iambaangkok.dev/. Treat it as protected.

- **Work on a branch, one per issue.** Name it `issue-<NN>-<slug>` (e.g. `issue-20-google-analytics`).
- **Do not commit or push to `master` directly.** Land changes via that branch (merge / PR).
- Only commit or push when the user asks.
- Before merging, the change must pass: `pnpm build`, `pnpm test`, `pnpm lint` (see below).

## Bump the version on any website change

If a change alters the **deployed website** (anything under `src/`, `index.html`, `public/`, or
build config) and it's going to `master`, **bump the app version** in the same change.

The version is stored in **two places that must stay in sync**:

1. The badge in [`src/App.tsx`](src/App.tsx) — the `vX.Y.Z` shown next to the `GLIPH-S` wordmark.
2. `"version"` in [`package.json`](package.json).

Use semver: **patch** (`v0.1.0 → v0.1.1`) for fixes/tweaks, **minor** (`v0.1.0 → v0.2.0`) for new
features, **major** for breaking overhauls. (Note: `package.json` currently trails at `0.0.0` while
the badge is `v0.1.0` — align it to the badge on the next website change.)

Changes that are **not** website changes (docs like this file or `CONTEXT.md`, `.scratch/` tickets)
do **not** require a version bump.

## Commands

- `pnpm dev` — local dev server (Vite, :5173)
- `pnpm build` — `tsc -b && vite build` → `dist/`
- `pnpm test` — vitest (run mode)
- `pnpm lint` — oxlint

## Deploy notes

- Hosting: Cloudflare **Worker with Static Assets** (config: [`wrangler.jsonc`](wrangler.jsonc),
  assets-only, `dist/`). Auto-deploys on push to `master`.
- Package manager is **pnpm**. `pnpm-workspace.yaml` carries a required `packages:` field + a
  build-script allowlist for `core-js` — see the comments in that file before touching it.
