# Architecture decisions

Short log of choices that deviate from or refine SPEC.md. One entry each.

## 1. UN download path
Spec's `…/wpp/Download/Files/…` base 404s (site is now an Angular app).
Files verified live under `…/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/`.
Recorded in `scripts/fetch.py` and `data/SOURCES.md`.

## 2. First paint is JSON, not Parquet
Spec §5 says "ship the current-year slice as a plain Parquet the page fetches
directly." The full slice is 528KB — over the 1s budget on slow 4G by itself.
Instead: the world-only slice (~18KB `world-now.json`) serves the first answer
with zero parser dependency; the full `cohorts-now.parquet` lazy-loads (via
hyparquet) when a country is chosen. Same derived tables, better split.

## 3. No DuckDB-WASM
Spec §5 allows DuckDB-WASM for the trajectory view. 3MB of WASM to filter one
cohort is the wrong trade; the build emits per-location trajectory Parquet
(`traj/iso3=XXX/`, ~80KB each) and the app fetches one file per country.
Revisit only if we add ad-hoc in-browser queries.

## 4. Workers Static Assets instead of Pages + separate Worker
One Cloudflare Worker serves the static site (assets binding) and handles
`/og` rendering plus per-URL OG meta injection via HTMLRewriter. A static SPA
alone cannot emit per-URL `og:image` to crawlers, and Pages + a second worker
is two deploys instead of one. Data plane remains static files; the worker
stays stateless.

## 5. Reference year 2026, hardcoded per build
`SET VARIABLE ref_now = 2026` in `scripts/build.sql`. It's a medium-variant
projection and the UI labels it as such (§4.3). Bump manually per rebuild.

## 6. Name: Year Atlas
Working name "cohort" (spec §11) collides with the statistical term in copy.
"Year Atlas" matches the repo (`my-year-atlas`), says fine out loud, and is
not morbid. Trivial to rename later; the wordmark is text.

## 7. R2 deferred
Derived data is ~24MB total and ships with the site deploy under long-TTL
cache headers; a separate R2 bucket adds a moving part with no measurable win
at this size. `scripts/publish.py` gets written when data outgrows the deploy.

## 8. Production on a Workers custom domain; Pages stays as untracked mirror
Deployed 2026-08-24 to `year-atlas.seandavis.net` (the ADR-4 single-worker
architecture, now on a custom domain). The GitHub Pages mirror was
retired the same week to avoid a confusing second URL; PR review previews
come from Workers version uploads in CI instead.

## 9. Google Analytics on production only
GA4 (`G-LL62WQMBHC`), maintainer-directed. Loaded only when
`location.hostname` is the production domain, so preview/dev traffic never
pollutes the numbers. Tension acknowledged rather than hidden: spec §2 said
"no analytics beyond aggregate page counts" and the site previously set no
cookies; GA4 sets cookies. Disclosed on the methods page. A cookieless
alternative (Cloudflare Web Analytics, GoatCounter) is a one-line swap if the
stance reverts.
