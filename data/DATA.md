# Data contract for the app

Reference year ("now") is **2026** — a UN WPP 2024 medium-variant *projection*,
and the UI must label it as such (spec §4.3). Population figures are persons.
`birth_year = ref_year − age` (direct mapping, spec §4.1). The `open_ended`
flag marks the 100+ bucket: its `birth_year` means "born in or before".

## Files served with the site (`site/public/data/`)

### `world-now.json` — first paint. ~18KB, array of objects, one per birth year (1926–2026):
`birth_year, alive, alive_male, alive_female, open_ended, cum_alive_younger, total_alive, births`

- `births` — world births in `birth_year` (null before 1950). World only: `alive/births ≤ 1` = share still living.
- percentile "older than": `(cum_alive_younger + 0.5*alive) / total_alive` (own bucket counted half, spec §6.4).

### `locations.json` — country selector. ~285 rows:
`iso3, location_name, total_alive`

- Flag any location with `total_alive < 90000` as small-country/noisy (spec §4.4).

### `cohorts-now.parquet` — full current-year slice, 528KB SNAPPY (hyparquet-readable). Lazy-load on country selection. Columns:
`iso3, location_name, birth_year, alive, alive_male, alive_female, open_ended, cum_alive_younger, total_alive, births`

- `WLD` rows included.
- **Country `births` are net of migration relative to `alive`; `alive/births` can exceed 1 (UAE 1985 = 5.9). NEVER present country alive-vs-births as attrition/survival** (spec §4.2).

### `traj/iso3=XXX/*.parquet` — per-location cohort trajectory, lazy-load for the arc chart:
`birth_year, ref_year, alive` (iso3 is in the path, hive-style; excludes open-ended bucket).

## Hand-verified spot values (2026 slice)

| query | value |
|---|---|
| World total alive | 8,300,678,397 |
| World born 1971: alive / births | 91,070,227 / 123,739,681 = 73.6% still living |
| World 1971 percentile (older than) | 80.2% |
| USA born 1971 alive | 4,297,760 |
| UAE born 1985: alive / births-there | 232,060 / 39,301 (migration, ratio 5.9) |

## Attribution (must appear in the UI)

United Nations, DESA, Population Division. *World Population Prospects 2024*,
medium variant. License CC BY 3.0 IGO. Derived figures © the same terms.
