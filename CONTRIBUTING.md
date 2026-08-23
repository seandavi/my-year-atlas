# Contributing to Year Atlas

Thanks for helping. This page covers setup, the invariants that keep the numbers honest, and what we expect in a PR. The design source of truth is [SPEC.md](SPEC.md); the public explanation of the numbers is [site/public/methods.html](site/public/methods.html).

## Dev setup

- **Data pipeline:** `python3` and `duckdb` on your PATH, then `./scripts/build.sh`. It downloads the raw UN CSVs (recording sha256 in `data/SOURCES.md`), builds the derived tables, runs assertions, and writes the app slices.
- **App:** `cd site && npm install && npm run dev`.
- **Worker:** `cd worker && npx wrangler dev`.

## Repo layout

| path | what |
|---|---|
| `scripts/` | offline pipeline: `fetch.py`, `build.sql` (all real logic), `build.sh` |
| `data/` | `SOURCES.md` (files + checksums), `DATA.md` (data contract), `raw/`, `derived/` |
| `site/` | the static SPA; `site/public/data/` holds the served slices; `site/public/methods.html` |
| `worker/` | the stateless OG-image worker |
| `SPEC.md` | build spec — scope, caveats, milestones |

## Demographic invariants — do not break these

These are what make the app credible instead of embarrassing (spec §2, §4, §9):

1. **World alive ≤ births.** For any world birth year, survivors cannot exceed births. `scripts/build.sql` asserts this and the build fails if it trips. Never weaken or remove the assertion; if it fails, the age↔birth-year mapping is wrong.
2. **Country births vs alive is net migration, not survival.** Country cohorts are open: a country's 1985-born residents can outnumber the babies born there in 1985 (UAE 1985: ratio 5.9). "Share still living" is a **world-only** statistic. Any country-level alive-vs-births figure must be labeled net of migration and never presented as attrition.
3. **No individual life-expectancy features.** No years-remaining number, no countdown, no mortality projection for a person — not behind a toggle, not in small print (spec §2, §9). **PRs adding death-clock features will be declined.** This is a framing constraint, not a backlog item.

Also keep intact: the direct `birth_year = ref_year − age` mapping, the explicit projection labeling for the reference year, the open-ended 100+ bucket flag, and the UN attribution in the UI.

## Issues and milestones

We use GitHub issues for everything, tagged to the spec's milestones: **M1** data, **M2** answer, **M3** country, **M4** design, **M5** share card, **M6** methods page. When filing, use the issue templates — especially `data_question` if you think a number is wrong; it asks for the URL, the number, and the source you're comparing against, which is what we need to reproduce it.

## PR expectations

- **Tests for stat functions.** Every named statistic (spec §6) has a unit test against a hand-checked value; new or changed stats need the same.
- **Keep the first-paint budget.** First meaningful answer under one second on cold 4G is the top non-functional requirement. Don't add anything to the critical path — new dependencies, blocking fetches, render-blocking assets — without measuring.
- **No framing violations** (invariant 3 above) and **attribution stays intact**.
- If a displayed number changes, update the spot-value table in `data/DATA.md`/README and the methods page if the methodology moved.

## Data refresh for a new WPP revision

1. Check the UN download index for the new revision's filenames — do not assume they match the old pattern.
2. Update `scripts/fetch.py` with the new filenames; run it; record the new files, sizes, and sha256 in `data/SOURCES.md`.
3. Bump `ref_now` in `scripts/build.sql` if the reference year moves; run `./scripts/build.sh` and make sure all assertions pass.
4. Re-verify the spot values by hand and update the tables in `data/DATA.md` and the README.
5. Update `site/public/methods.html`: filenames, checksums, reference year, and the build commit hash.
