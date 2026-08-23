# Year Atlas

[![license: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE) [![data: CC BY 3.0 IGO](https://img.shields.io/badge/data-CC%20BY%203.0%20IGO-lightgrey.svg)](https://creativecommons.org/licenses/by/3.0/igo/)

Enter your birth year (and optionally a country) and see the company you keep: how many people alive right now share it, how much of the original worldwide cohort is still here, and where you sit in the age order of everyone on Earth. The frame is cohort as company — who's moving through time with you — built on official UN population data. It is explicitly **not** a death clock: no life expectancy, no countdown, no years-remaining number, anywhere.

Live numbers are the UN World Population Prospects 2024 medium-variant projection for mid-2026. Full caveats live on the [methods page](site/public/methods.html) (served at `/methods.html`).

**Preview:** https://seandavi.github.io/my-year-atlas/ (static; share cards need the worker deploy).

What a year gets you: the headline cohort count and age-rank percentile, the world's median birth year, a population anchor ("that's about the population of Iran"), the year you arrived in (infant mortality, median age, fertility, how much cooler the planet was), notable people born with you (Wikidata, gender-balanced, linked), popular baby names (9 countries, each under its national open license), the signature dot field, your cohort's arc with a net-migration strip for countries, an Equal Earth map of where your year lives now, and world events of your year. Interface in English, Spanish, and Portuguese (`?lang=es|pt`).

## Quickstart

**Data pipeline** (offline, run once per WPP revision; needs `python3` and `duckdb`):

```sh
./scripts/build.sh
```

**App:**

```sh
cd site && npm install && npm run dev
```

**OG-image worker:**

```sh
cd worker && npx wrangler dev
```

## Architecture

- **Offline DuckDB pipeline** — `scripts/fetch.py` downloads the raw UN CSVs with checksums; `scripts/build.sql` derives the tables and runs sanity assertions (the build fails if world survivors exceed births).
- **Static data slices** — a small JSON for first paint, one parquet for the country view, per-country parquet for trajectories. No database, no API.
- **Vanilla SPA + one stateless worker** — the page reads static files; a single Cloudflare Worker renders shareable OG images. URL is the state (`/?y=1971&c=USA`).

## Hand-verified spot values (2026 slice)

| query | value |
|---|---|
| World total alive | 8,300,678,397 |
| World born 1971: alive / births | 91,070,227 / 123,739,681 = 73.6% still living |
| World 1971 percentile (older than) | 80.2% |
| USA born 1971 alive | 4,297,760 |
| UAE born 1985: alive / births-there | 232,060 / 39,301 (migration, ratio 5.9) |

## Licensing

| what | license |
|---|---|
| Code in this repository | [MIT](LICENSE) |
| Source data (UN WPP 2024) | [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/), citation required |
| Derived parquet/JSON artifacts | CC BY 3.0 IGO (they inherit the source data's terms) |
| Temperature series | NASA GISTEMP v4 — US government work, public domain |
| Country geometry | Natural Earth 110m (public domain), via world-atlas |
| Notable people | Wikidata, CC0 |
| Baby names | per-country national licenses — see [data/NAMES_SOURCES.md](data/NAMES_SOURCES.md) |
| Events selection/text | candidates via Wikipedia year pages (titles only), ranking via Wikimedia pageviews, display text written for this project (MIT) — see [data/EVENTS_SOURCES.md](data/EVENTS_SOURCES.md) |

Required citation: United Nations, Department of Economic and Social Affairs, Population Division (2024). *World Population Prospects 2024*.

CC BY 3.0 IGO obliges anyone reusing the data (including our derived files) to: credit the UN as the source, link to the license, and indicate if changes were made. Our derived files are changed — aggregated and remapped from age to birth year — and we say so on the [methods page](site/public/methods.html).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, the demographic invariants you must not break, and PR expectations.
