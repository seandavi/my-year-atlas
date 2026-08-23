# Data expansion — candidate sources

Research pass, 2026-08-22. Question: what other age- or cohort-resolved,
country-level datasets could add socioeconomic depth to the birth-year answer?

**Verification status is marked per source.** Items marked VERIFIED were checked
against the live source (or, for WPP, against the file already in `data/raw/`).
Items marked UNVERIFIED could not be confirmed in this pass — several source
sites returned HTTP 403 to automated fetches. Do not act on an UNVERIFIED
license claim; confirm it by hand first.

## Coverage policy

**Incomplete country coverage does not disqualify a source.** A feature may ship
for the subset of countries where the data exists — "available for 85 countries"
is an acceptable product state, and the UI should say so plainly rather than
hide the feature. Record coverage honestly (which countries, which years) and
design the empty state as a first-class case.

The two hard criteria are:

1. **License cleanliness** — redistributable, commercial use permitted, no
   registration gate on the derived artifact we serve.
2. **Age or cohort granularity** — the data must resolve by age or birth cohort.
   A country-year figure with no age dimension is context, not cohort data, and
   is ranked separately below.

Five-year age groups are *not* a blocker. They bin to birth years fine; the
caveat is that a single birth year inherits its group's value, so the number is
"your cohort's five-year band", and the copy must say that.

---

## 1. UN WPP 2024 Demographic Indicators — VERIFIED, already downloaded

**Publisher:** UN DESA Population Division.
**File:** `WPP2024_Demographic_Indicators_Medium.csv.gz` — already in
`data/raw/`, 16.5 MB, sha256 recorded in `data/SOURCES.md`.
**License:** CC BY 3.0 IGO. Same terms as the data already shipped; no new
attribution obligation beyond what the UI carries.

67 columns, read directly from the local file header. Not age-disaggregated —
it is one row per country-year — so this is **birth-year context**, not cohort
composition. The useful columns:

| column | meaning |
|---|---|
| `MedianAgePop` | median age of the country that year |
| `TFR` | total fertility rate |
| `MAC` | mean age at childbearing |
| `SRB` | sex ratio at birth |
| `CBR` | crude birth rate |
| `IMR`, `Q5` | infant and under-5 mortality per 1,000 |
| `CNMR` | net migration rate |
| `LEx`, `LExMale`, `LExFemale` | period life expectancy at birth — see §9 warning |
| `PopDensity`, `PopSexRatio` | |
| `Births1519` | births to mothers aged 15–19 |

**Size, measured:** country rows only, 1950–2026, six columns rounded to 1–2
decimals, ZSTD Parquet → **146 KB, 18,249 rows**. Unrounded with 15 columns and
SNAPPY it is 1.15 MB, so rounding is worth doing. Either way this is a
lazy-loaded file, not a first-paint cost.

**Verdict:** ship this first. The data is already on disk, the license is
already cleared, and the build is one `COPY … TO` statement.

### Feature sketch (real values, verified from the local file)

For birth year 1971, infant mortality in the year you were born:

- Japan 12.8 per 1,000 · USA 18.8 · Brazil 101.8 · India 138.2

That spread is the whole story and it costs one file we already have. The same
row gives median age (Japan 28.6, India 18.1 — "you were born into an old
country / a young one") and TFR (USA 2.32, India 5.56 — "the average family
around you").

### §9 framing warning — life expectancy

`LEx` is in this file and it is the most death-clock-adjacent number available.
It is a *period* measure: it describes the mortality conditions of that year
applied to a hypothetical newborn, not a forecast for anyone now alive. Readers
will not make that distinction unaided.

Recommendation: **lead with IMR and median age, not LEx.** If `LEx` is shown at
all, it needs the period-measure caveat inline, not in a methods footnote, and
it must never be differenced against the user's current age. Flagging rather
than resolving, per spec §9.

---

## 2. Wittgenstein Centre Human Capital Data Explorer — VERIFIED structure, UNVERIFIED license

**Publisher:** IIASA / Vienna Institute of Demography (Wittgenstein Centre).
**Version:** 3.3, the 2023 revision.
**Dimensions:** educational attainment distribution and mean years of schooling,
by **5-year age group** (0–4 through 100+) × sex × country.
**Coverage:** 200 countries. The v3.3 explorer presents **2020–2100** across
seven scenarios (SSP1–SSP5, plus SSP2 zero-migration and double-migration).
**Bulk access:** the `wcde` R package on CRAN (package code is GPL-3) wraps a
download endpoint.

Two open problems, both of which must be settled before this is buildable:

- **License: could not be confirmed.** The explorer states a suggested citation
  (K.C., Dhakad, Potancokova et al., 2024) but no license text was found on the
  page, and the CRAN page for `wcde` documents only the package's GPL-3 code
  license, explicitly not a data license. A citation request is not a license
  grant. **Email IIASA and get it in writing before building on this.**
- **Historical range unconfirmed.** The v3.3 explorer surfaces 2020–2100.
  Earlier WCDE versions carried back-projections to 1950, which is what this app
  actually needs — a 1971 cohort's schooling is history, not projection. Whether
  v3.3 still ships the reconstruction was not verified.

**Verdict:** the strongest candidate on storytelling value and the weakest on
paperwork. Highest-value next action of anything in this document is one email
to IIASA asking two questions: what is the data license, and does v3.3 include
pre-2020 reconstructions.

### Feature sketch (ILLUSTRATIVE — invented numbers, shows the form only)

> Of people born in Brazil around 1985, 62% completed secondary school or more.
> For those born around 1955, it was 31%.

Note the "around" — that is the five-year-bin caveat surfacing in the copy, and
it should stay there rather than be smoothed away.

---

## 3. Our World in Data — VERIFIED license, intermediary only

**License, quoted from their FAQ:** "Data produced by us falls under our
permissive CC BY license; you have permission to use, reproduce, and distribute
it, provided that you cite us." And: "Most of the data on Our World in Data
comes from third-party providers (such as the WHO, UN, and World Bank) and is
subject to the license terms of those providers."

**Access:** a Chart Data API giving direct CSV URLs plus JSON metadata, per
chart, either full data or the current chart subset.

**Verdict: useful for discovery, not a license launderer.** The second sentence
above is the operative one — pulling a third-party series through OWID does not
convert it to CC BY. Its real value here is as an index: it is the fastest way
to find which underlying dataset carries a given series, and its per-chart
metadata names the upstream source. Use it to locate sources, then license the
upstream directly.

---

## Rejected / problematic

**NCD-RisC height by birth cohort — license blocker.** This is the single best
storytelling fit in the whole survey: mean adult height by *year of birth*, the
one major dataset whose native key is literally the app's input. The download
page offers age-specific CSV and per-country ZIP files. But the only rights
statement found on it is **"© Copyright 2026 NCD Risk Factor Collaboration. All
Rights Reserved."** — no CC license, no reuse grant. OWID redistributes NCD-RisC
height under CC BY, which suggests a permissive upstream grant exists somewhere,
but it was not locatable on ncdrisc.org and the OWID third-party clause above
means their CC BY label cannot be relied on for the upstream. Worth one email;
do not ship on the assumption.

**IPUMS International — expected redistribution blocker, UNVERIFIED.** Census
microdata with occupation by age would be excellent, but IPUMS is
registration-gated and its terms historically forbid redistribution. Not checked
in this pass. Assume blocked until confirmed otherwise.

**Pew religion-by-age — expected registration gate, UNVERIFIED.** Pew has
published religious composition by age group and country. Their datasets are
typically free but registration-gated with redistribution restrictions. Not
verified.

---

## Not verified in this pass

The following were researched but not confirmed against live sources before this
document was written. Each needs a hand check of license and age granularity.
Nothing here should be treated as a finding.

| source | what it would add | main open question |
|---|---|---|
| ILOSTAT | labour force participation, employment by occupation, by sex × age | bulk URL pattern and exact license (site returned 403) |
| UNESCO UIS | enrollment and attainment | whether any bulk file is age-disaggregated; CC BY-SA 3.0 IGO would be a share-alike complication |
| Barro-Lee | attainment by 5-year age group, 1950–2010 | still maintained? license? — but its historical range is exactly what WCDE may lack |
| UN World Marriage Data | % ever married by sex × 5-year age group | irregular census-year coverage makes joins sparse |
| HMD / HFD | cohort life tables, ~40 countries | current registration and redistribution terms |
| World Bank WDI | age-banded labour and literacy indicators | which indicators carry a real age dimension; CC BY 4.0 expected |
| National baby-name registries | most common name for your birth year | per-country patchwork; SSA page returned 403 (US data is widely held to be public domain — confirm). Under the coverage policy above, a 10–15 country patchwork is shippable |
| UN World Urbanization Prospects | urban share in your birth year | almost certainly has no age dimension — context only, like §1 |
| OECD | age-disaggregated labour and education | member countries only; terms changed recently |

---

## Addendum: education deep-dive (same day, second pass)

A follow-up pass verified the education sources against live sites. It settles
several rows of the table above:

- **UNESCO UIS — REJECT, twice over.** Bulk files are live and keyless
  (`download.uis.unesco.org/bdds/202602/`, no registration), but all 235
  attainment indicators carry exactly one age token: `AG25T99` — one open-ended
  25+ bucket, no cohort dimension at all (verified by unzipping SDG.zip and
  scanning 233,730 attainment rows). License is now **CC BY-SA 4.0**
  (share-alike, viral into derived Parquet). Two independent blockers.
- **Barro-Lee direct — REJECT.** `barrolee.com` has no DNS record; the GitHub
  mirror footer reads "All rights reserved". Not redistributable.
- **Barro-Lee via World Bank EdStats — SAFE FALLBACK, CC BY 4.0.** 426 `BAR.*`
  indicators, real 5-year age groups (`1519` … `75UP`), attainment levels
  NOED/PRM/SEC/TER + years of schooling, ~146 countries, **1960–2010** in
  5-year steps (the WB copy is frozen at BL v2). Ships today, license-clean,
  historical-only.
- **Wittgenstein Centre — sharper picture, still license-blocked.** Current data
  is WIC3.004/V14 (Feb 2025; avoid older Zenodo records — V13 had a sex-swap bug
  in 37 countries). Historical reconstruction to **1950 exists** (`past_epop`,
  and the `wcde-v3-batch` files cover 1950–2100), answering the coverage
  question above. Pre-processed per-indicator files are plain HTTP, no R needed:
  `https://wicshiny2023.iiasa.ac.at/wcde-data/wcde-v3-batch/{scenario}/prop.rds`
  (~5 MB, ISO3/M49 codes, joins directly to WPP). But the only license signal in
  the whole ecosystem is **CC BY-NC on the companion working paper** — worse
  than "unknown". Written clarification from IIASA is mandatory before shipping.

**Education verdict:** build against World Bank EdStats `BAR.*` now if we want
cohort education ("of people born around 1975 in Brazil, N% finished secondary
school" — capped at cohorts observable by 2010, i.e. birth years up to ~1985),
and send the IIASA license email in parallel; WIC would extend the same feature
to 200 countries and recent cohorts.

## Ranking

Ranked on license cleanliness × granularity, per the policy above, using only
what is verified.

1. **WPP Demographic Indicators** — license already cleared, file already on
   disk, 146 KB, one SQL statement. Not age-resolved, so it is context rather
   than cohort composition, but it is free and it is real today.
2. **Wittgenstein Centre WCDE** — the best cohort-resolved socioeconomic data
   that exists for this purpose, blocked on one unanswered license question and
   one unanswered coverage question. Resolve both by email before writing code.
3. **Our World in Data** — as a discovery index for locating and attributing
   upstream sources, not as a data source in its own right.

Everything else in this document needs its license confirmed before it can be
ranked at all.
