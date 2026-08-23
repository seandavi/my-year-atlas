# Cohort — build spec

**Working name:** `cohort` (final name TBD; see §11)
**One-line:** Enter a birth year and country; see how many people alive on Earth right now share it.
**Status:** greenfield. This document is the source of truth for v1 scope.

---

## 1. What this is

A single-page, zero-backend web app. The user gives a birth year (and optionally a country). The app answers, from official UN data:

- How many people alive today were born in that year, worldwide.
- How many were born that year originally — i.e. how much the cohort has already thinned.
- Where the user sits in the age distribution of everyone currently alive ("you are older than 61% of people alive right now").
- How the same birth year plays out under a different passport.

The emotional frame is **cohort as company**, not death clock. See §9 — this is a real constraint, not decoration.

## 2. What this is not (v1 non-goals)

- No individual mortality projection, life expectancy estimate, or "years remaining" number. Not behind a toggle, not in small print. Out.
- No accounts, no login, no analytics beyond aggregate page counts.
- No sub-national granularity. Country-level only.
- No date-of-birth input. **Year only.** Asking for a full DOB changes the privacy posture and the vibe, and buys nothing the year doesn't give.

## 3. Data sources

### 3.1 Primary: UN World Population Prospects 2024

Bulk CSVs live under:

```
https://population.un.org/wpp/Download/Files/1_Indicator (Standard)/CSV_FILES/
```

Confirmed-format example (note the space in the path segment — URL-encode it):

```
.../CSV_FILES/WPP2024_PopulationBySingleAgeSex_High_2024-2100.csv.gz
```

**Files needed (verify exact names against the download page before writing the fetch script — do not assume):**

| Purpose | Expected file |
|---|---|
| Population by single age & sex, estimates | `WPP2024_PopulationBySingleAgeSex_Medium_1950-2023.csv.gz` |
| Population by single age & sex, projections | `WPP2024_PopulationBySingleAgeSex_Medium_2024-2100.csv.gz` |
| Annual births by country-year | `WPP2024_Demographic_Indicators_Medium.csv.gz` (contains `Births`, in thousands) |

License: CC BY 3.0 IGO. Attribution is required and must appear in the UI, not just the repo.

**Task 0 for the implementer:** fetch the download index, list the actual CSV filenames, and record them in `data/SOURCES.md` with sha256 of each downloaded file. Do not proceed on guessed filenames.

### 3.2 Deferred to v2

Human Mortality Database cohort life tables (~40 countries, registration required). Only needed if we later add true cohort survivorship curves. Not in v1.

## 4. The demographic caveats — read before coding

These are the things that make this app either credible or embarrassing. Each one needs a written answer in the UI, not just a code comment.

**4.1 Age is not birth year.** WPP population-by-single-age is a snapshot at a reference date, by *completed age*. Someone of completed age `a` on 1 July of year `Y` was born somewhere in the twelve months ending 1 July of year `Y−a`. So a single age bucket straddles two birth years.

Decision for v1: use the **direct mapping** `birth_year = reference_year − age`, and say so plainly in the methods note. Do not attempt a Sprague or half-year split; the added precision is smaller than the underlying estimate uncertainty and it complicates every downstream number. Document the choice; don't hide it.

**4.2 Country cohorts are not closed.** Globally, `survivors ≤ births` and the gap is mortality — clean. At country level it is not: migration means a country's 1985-born population today can plausibly *exceed* the number of babies born there in 1985. This is not a bug and the UI must not present it as attrition.

Consequence: **the "how much the cohort has thinned" statistic is a global-only stat.** For country view, show cohort size and rank, and — if births-vs-survivors is shown at all — label it as net of migration, with the ratio allowed to exceed 1.

**4.3 Recent years are estimates, not counts.** WPP 2024 gives estimates through 2023 and projections after. If the app displays "right now" (2026), it is reading the medium-variant projection. Label the reference year explicitly in the UI. Do not write "today" over a projected number without saying so.

**4.4 Small countries.** Below ~90k population the estimates get noisy and some age cells round oddly. Either suppress countries under a threshold or flag them.

## 5. Data pipeline

Offline, run once per WPP revision. Language: Python or R, implementer's choice — but the transformation itself should be **SQL in DuckDB**, with the script as a thin shell.

```
scripts/fetch.py      # download raw .csv.gz to data/raw/, record sha256
scripts/build.sql     # DuckDB: raw CSV -> derived parquet
scripts/publish.py    # upload data/derived/*.parquet to R2, print sizes
```

Outputs to `data/derived/`:

**`cohorts.parquet`** — the app's main table. One row per (location, reference_year, birth_year):

| column | type | note |
|---|---|---|
| `iso3` | VARCHAR | `'WLD'` for world |
| `location_name` | VARCHAR | |
| `ref_year` | SMALLINT | snapshot year |
| `birth_year` | SMALLINT | `ref_year − age` |
| `alive` | BIGINT | persons, not thousands — multiply out at build time |
| `alive_male` | BIGINT | |
| `alive_female` | BIGINT | |

**`births.parquet`** — one row per (iso3, year, births).

**`rank_index.parquet`** — precomputed cumulative distribution so the percentile is a lookup, not a scan: (iso3, ref_year, birth_year, cum_alive_younger, total_alive).

### Sizing reality check

Do not over-engineer this. A single reference-year slice is ~285 locations × 101 ages ≈ 29k rows — a few hundred KB. The full 1950–2100 history is ~2M rows and lands in the low tens of MB as Parquet.

So: **ship the current-year slice as a plain Parquet the page fetches directly.** Add DuckDB-WASM only for the historical-trajectory view (§6, stat 5), and load it lazily on that interaction. DuckDB-WASM is ~3MB of WASM; making the first paint wait on it for a 300KB lookup is the wrong trade.

## 6. The statistics

Each is a named function with a unit test against a hand-checked value.

1. **Cohort size now.** `SELECT alive FROM cohorts WHERE iso3=? AND ref_year=? AND birth_year=?`
2. **Original cohort size** (world only). `SELECT births FROM births WHERE iso3='WLD' AND year=?`
3. **Share still living** (world only). `alive / births`. Sanity bound: must be ≤ 1 for world. Assert it in the build; if it fails, the age↔birth-year mapping is wrong.
4. **Age rank.** `cum_alive_younger / total_alive` → "older than N% of people alive right now." This is the screenshot stat. Get the tie-handling explicit: count the user's own single-year bucket as half, and document it.
5. **Cohort trajectory.** `alive` for this `birth_year` across all `ref_year` — the cohort's own arc. Requires the historical table; lazy-load.
6. **Passport contrast.** Same birth year, 3–4 other countries, comparing share-still-living where valid and cohort rank. Pick contrasts that are informative rather than grim — this is where the framing constraint bites hardest.
7. **Bigger cohorts.** Which birth years alive today outnumber the user's, and by how much. Gives people born in a small year something interesting rather than something sad.

## 7. Frontend

- Static SPA. No framework requirement — vanilla + a small chart lib is fine and probably better. If a framework is used, justify it in the ADR.
- Hosted on Cloudflare Pages/Workers; Parquet on R2 behind a public bucket or Worker route with long cache TTLs.
- First meaningful answer in **under one second** on a cold load over 4G. This is the single most important non-functional requirement. Everything else yields to it.
- URL is the state: `/?y=1971&c=USA`. Shareable, back-button-correct, prerenderable.
- No signup, no cookie banner (don't set cookies), no modal before the answer.
- Accessible: keyboard path from input to answer, visible focus, reduced-motion respected, the headline number reachable by screen reader as a sentence not a pile of spans.

### Design direction

Deliberately *not* the default dashboard look. Two constraints that should drive the whole visual system:

- The subject is a **cohort** — a group moving through time together. The natural visual primitive is a mass of many small marks, not a bar chart. Something in the family of a unit chart / dot field, where one mark is a real number of people and the field visibly thins as it moves right. Let that be the signature element and keep everything else quiet.
- Numbers here are large and abstract. Typography has to make 71,300,000 legible and felt. Pick a display face with real character for the headline figure and a proper tabular-figures face for the data; set the type scale deliberately.

Avoid: cream-and-terracotta editorial, near-black-with-acid-accent, and broadsheet-with-hairlines. All three are current AI-design defaults and read as such.

Write the copy as design material. Plain verbs, sentence case, no filler. The empty state should invite an entry, not explain the app.

## 8. Share card

The distribution mechanism. Treat it as a first-class deliverable, not an export button.

- Server-rendered OG image via a small Cloudflare Worker: `GET /og?y=1971&c=USA` → PNG, using `workers-og` or Satori. Cache aggressively at the edge; the parameter space is small enough to be effectively fully cacheable.
- Page emits correct `og:image`, `og:title`, `twitter:card=summary_large_image` per URL, so a pasted link previews with the user's own number. This is what makes it spread — not a download button.
- Card contains: the headline cohort number, the rank line, birth year, country, and the wordmark. Nothing else. It must be readable as a thumbnail.
- Also offer a client-side canvas render for direct download at higher resolution.

Yes, this means one Worker. The data plane stays backendless; this is a rendering endpoint with no state.

## 9. Framing constraint (non-negotiable)

The same data supports a death clock and a "here's your cohort" tool. We are building the second one. Concretely:

- No countdown, no remaining-years figure, no shrinking-bar animation running toward zero.
- Attrition is stated as a fact in a sentence, never dramatized in motion or color.
- Copy is factual and warm. Not jokey — jokes about mortality age badly and get screenshotted uncharitably — and not solemn.
- The comparison features emphasize *company* (who else is here, which cohorts are larger) over *loss*.

If a design choice makes the page more shareable but tips it toward the first version, the framing wins. Flag the tension rather than resolving it silently.

## 10. Milestones

**M1 — data.** Filenames verified, raw downloaded with checksums, `build.sql` produces the three Parquet files, assertions pass (including the `alive ≤ births` world check). Deliverable: `data/SOURCES.md` + derived files + a README table of five hand-verified spot values.

**M2 — answer.** Birth year in, cohort size and rank out. Ugly is fine. Sub-second cold load measured, not assumed.

**M3 — country.** Country selector, passport contrast, migration caveat wired into the UI copy.

**M4 — design pass.** Signature visualization, type system, copy rewrite.

**M5 — share.** OG Worker, per-URL meta tags, canvas download. Test the preview render in at least three surfaces.

**M6 — methods page.** Every caveat in §4 written out for a general reader, with the exact source files and the build commit hash. This page is what makes the thing defensible when it gets attention.

## 11. Open questions for Sean

1. **Name.** Wants to survive being said out loud. Avoid anything that leans morbid — that's the framing risk in a single word.
2. **Country in v1 or v2?** Country roughly triples the interest and adds the migration caveat, the selector, and a much larger share-card parameter space. M3 is scoped as v1 here; it's the cheapest thing to cut if M1–M2 run long.
3. **Repo home** — `seandavi/` or a standalone org, and whether the data build lives in the same repo as the app.
4. **License** — code and the derived Parquet artifacts (the latter inherit CC BY 3.0 IGO obligations).

## 12. Acceptance criteria

- Every displayed number traces to a named source file and a query in the repo.
- The world-level `alive ≤ births` assertion runs in CI and fails the build.
- Cold-load to first answer under 1s on a throttled connection.
- A pasted URL previews with a correct, legible per-user card in three major surfaces.
- The methods page exists and a demographer could read it without wincing.
- Nothing in the UI states or implies an individual life expectancy.
