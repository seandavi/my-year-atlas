# World events by year — method and sources

Data layer for issue #40. Output: `site/public/data/events.json` — three world
events per year, 1926–2026, each with an original one-line description and an
English Wikipedia article title for the linkout.

## Method (license-clean by construction)

1. **Candidates.** For each year 1926–2026, the English Wikipedia year page
   (e.g. [`1971`](https://en.wikipedia.org/wiki/1971)) was fetched via the
   MediaWiki API (`action=parse`, `prop=wikitext`). Only the *Events* section
   was parsed, and only the **linked article titles** were extracted
   (`[[Target|label]]` → `Target`). Titles and the fact that an event occurred
   are not copyrightable; no sentence of Wikipedia prose enters the output,
   and the build asserts this (see below).
2. **Ranking.** Each candidate title was scored by its total 2024 pageviews
   from the Wikimedia Pageviews API (`per-article`, en.wikipedia, all-access,
   user agents, monthly 2024-01→2024-12). Higher views ≈ higher global
   salience. Titles with no pageview record were dropped. All API responses
   are cached in `data/raw/events/` (gitignored).
3. **Selection.** Three events per year: the highest-salience candidates that
   pass a quality gate and the project's framing rule (SPEC §9): at most
   **one** war/disaster/atrocity per year; the rest prefer firsts, science,
   culture, sport and exploration. The quality gate matters — the raw
   pageview top of every year is countries, cities and famous people, so
   generic pages (countries, cities, dates, offices) and person-name titles
   were excluded; people have their own section of the site. Two known
   limits of the pageview signal, resolved by editorial judgment: year pages
   often link an event through a **redirect** (e.g. `Dolly_the_sheep`,
   `IBM_PC`), whose direct view count is near zero, and articles about
   **post-2024 events** have no 2024 views at all. Both remain valid
   linkouts.
4. **Text.** Every description is an **original sentence** written for this
   project from general knowledge of these well-known events — plain factual
   voice, sentence case, ≤110 characters. The build enforces no-copying
   literally: no 10-word sequence of any description may appear in the fetched
   wikitext (substring check against the cached source).

Pipeline: `scripts/fetch_events.mjs` (harvest + rank + validate + emit; the
curated selection and all description text live in that file).

## License

- Wikipedia article **titles** and pageview **counts**: facts, not
  copyrightable; the Pageviews API data is public. No Wikipedia prose is
  reproduced, so no CC BY-SA obligation attaches to `events.json`.
- The descriptions are original text written for this repository and are
  covered by the repository's MIT license, as is `events.json` itself.

## Retrieval

- Year-page wikitext and pageviews retrieved: **2026-08-22/23**.
- Pageview window used for ranking: calendar year **2024**.
- Scale: 101 year pages; ~25,700 unique candidate titles ranked; 26,559
  pageview API responses cached in `data/raw/events/pv/`.

## Per-year counts

| years | entries per year |
|---|---|
| 1926–2025 | 3 (asserted by the build) |
| 2026 | 2 (year in progress) |

Total: 302 entries across 101 years.

## Review notes (lower-confidence entries)

Entries a human reviewer should double-check, and deliberate judgment calls.

**Person/organization linkouts.** The framing gate excludes person-name
articles, but for a few events the year page links no event article, so `w`
points at the closest person/organization page. The description is still an
event, not a biography: 1942 first controlled nuclear chain reaction
(`Enrico_Fermi`), 1952 accession of Elizabeth II (`Elizabeth_II`), 1959 Cuban
Revolution (`Fidel_Castro`), 1967 first heart transplant
(`Christiaan_Barnard`), 1978 election of John Paul II (`Pope_John_Paul_II`),
1979 Thatcher becomes PM (`Margaret_Thatcher`), 1990 release of Mandela
(`Nelson_Mandela`), 2013 (`Pope_Francis`, `Edward_Snowden`), 2025
(`Pope_Leo_XIV`, `Firefly_Aerospace`).

**Fact-confidence flags.**

- 1983: "most-watched US TV episode ever" — true for scripted episodes
  (Super Bowl broadcasts exceed it as programs).
- 2025 Blue Ghost: "first fully successful commercial Moon landing" — the
  standard qualifier (Intuitive Machines' 2024 lander touched down but
  tipped over); phrasing worth a check.
- **2026 (both entries): written from the event schedule** (Milan–Cortina
  Winter Olympics, North American FIFA World Cup), not from reporting on the
  outcomes. Verify both took place as planned before shipping.

**Deliberate omissions under the one-war/disaster-per-year rule** (not
errors): 1986 Challenger (Chernobyl took the slot), 1997 death of Diana,
2003 Columbia disaster (Iraq invasion took the slot), 2011 killing of
bin Laden (Tōhoku/Fukushima took the slot), 2023 Turkey–Syria earthquakes
(October 7 attacks took the slot), 1948 assassination of Gandhi, 1995
Srebrenica (Oklahoma City took the slot).
