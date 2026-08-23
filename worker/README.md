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
(spec §4.2). Numbers ≥ 1M are rounded to the nearest 10,000 and rendered in
the `91,070,000` style.

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

No secrets, no bindings beyond the auto-configured ASSETS static-assets
binding. The site must be built into `../site/dist` first. Cache invalidation
after a data refresh: bump nothing — edge cache entries expire with s-maxage,
or purge the zone cache for `/og*` in the Cloudflare dashboard.
