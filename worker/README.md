# Year Atlas edge worker

Stateless Cloudflare Worker fronting the static site (Workers Static Assets).
It does two things; everything else is served straight from `../site/dist`:

- `GET /og?y=1971&c=USA` — 1200×630 PNG share card (workers-og / satori).
  World numbers come from `/data/world-now.json`, country numbers from
  `/data/cohorts-now.parquet` (read with hyparquet), both fetched through the
  ASSETS binding — no third-party requests at runtime. Invalid or missing `y`
  returns a generic wordmark card (HTTP 200). Responses carry
  `Cache-Control: public, max-age=86400, s-maxage=31536000` and are also
  cached in `caches.default` keyed on normalized `y`/`c`.
- HTML navigations to `/` — HTMLRewriter injects per-URL `og:title`,
  `og:description`, `og:image` (absolute `/og?...` URL) and
  `twitter:card=summary_large_image` so a pasted `/?y=1971&c=USA` link
  previews with that user's numbers.

Percentile is `(cum_alive_younger + 0.5 * alive) / total_alive` (own bucket
counted half, spec §6.4). Country cards never show survival/attrition
(spec §4.2). Number formatting follows `evaluation/FIXSPEC.md` (max 3
significant figures, "about 91.1 million" style), shared with the site via
`../site/src/i18n/` — cards and meta localize with `&lang=es|pt`, and the
edge-cache key includes the language.

## Dev

```
npm install
npx wrangler dev        # requires ../site/dist to exist (site build output)
```

If the site build isn't present, stub it: minimal `../site/dist/index.html`
plus `cp -r ../site/public/data ../site/dist/data`.

Fonts: Inter latin 400/700 WOFF, vendored in `assets/` (from @fontsource/inter
via jsdelivr), bundled as binary modules by the `rules` entry in
`wrangler.jsonc`.

## Deploy

```
npx wrangler deploy
```

Deploys to **year-atlas.seandavis.net** (Workers custom domain, configured in
`wrangler.jsonc`; requires the `seandavis.net` zone in the Cloudflare account
and an API token with Workers + zone DNS permissions — kept in Google Secret
Manager, project `cdsci-infra`: `cdsci-cloudflare-workers-token` and
`cdsci-r2-account-id`). No other secrets, no bindings beyond the
auto-configured ASSETS static-assets binding. The site must be built into `../site/dist` first. Cache invalidation
after a data refresh: bump nothing — edge cache entries expire with s-maxage,
or purge the zone cache for `/og*` in the Cloudflare dashboard.
