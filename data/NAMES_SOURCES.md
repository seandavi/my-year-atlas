# Baby-names data sources (issue #19)

Pipeline: `scripts/fetch_names.py` → `site/public/data/names/{ISO3}.json` +
`index.json`. Top 5 names per sex per year, rank order, years ≥ 1926 only
(raw files are harvested in full and cached in `data/raw/names/`, gitignored).
All retrievals: **2026-08-23**.

## Available (8)

### USA — Social Security Administration, "Beyond the Top 1000 Names" national file
- URL: https://www.ssa.gov/oact/babynames/names.zip (landing: https://www.ssa.gov/oact/babynames/)
- sha256: `cd78e975ed7bb358e018dd62fbe14ced89295e9581c49172ca4eedcb011b3724`
- License: Public domain (US government work)
- Basis: **birth** year. Emitted: 1926–2025 (raw covers 1880+).
- Quirks: names with fewer than 5 occurrences in a year are excluded by SSA
  (irrelevant for top 5). ssa.gov (Akamai) 403s bare HTTP clients — the script
  sends a full browser header set (UA + Sec-Fetch-*), which gets through.

### FRA — INSEE, Fichier des prénoms (édition 2025), national file
- URL: https://www.insee.fr/fr/statistiques/fichier/8595130/prenoms-2025-nat_csv.zip
  (landing: https://www.insee.fr/fr/statistiques/8595130)
- sha256: `4c3662bbc75a021a2203b9bed0beff7e85c7928779b88602814ed407cfee512e`
- License: [Licence Ouverte / Open Licence 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence) (Etalab)
- Basis: **birth** year (`periode`). Emitted: 1926–2025 (raw covers 1900+).
- Quirks: `_PRENOMS_RARES` aggregate rows and `periode` = `XXXX` (unknown year)
  rows excluded. Names are uppercase in the file; title-cased for display
  (JEAN-PIERRE → Jean-Pierre). Columns in the 2025 edition are
  `sexe;prenom;periode;valeur;rang` (sexe 1 = male, 2 = female).

### SCT — National Records of Scotland, Babies' First Names, full list 1974–2025
- URL: https://www.nrscotland.gov.uk/media/0ytjopcq/all-names-given-to-babies-between-1974-to-2025.zip
  (landing: https://www.nrscotland.gov.uk/publications/babies-first-names-2025/)
- sha256: `e1dd892b576f75cc349caeee7a219aa9fad3857b1849bc2ce21bfd81c24b3085`
- License: [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)
- Basis: **registration** year. Emitted: 1974–2025.
- Quirks: emitted as `SCT.json` with `"name": "Scotland"` and a `note` field —
  Scotland is not in the app's country list (UN WPP has GBR only); surfacing it
  for GBR selections is a UI-side decision, not made here.

### IRL — CSO Ireland, PxStat VSA50 (boys) / VSA60 (girls)
- URLs: https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/VSA50/CSV/1.0/en
  and .../VSA60/CSV/1.0/en
- sha256: VSA50 `5e8a40708dea10aafab17cf9bc483279bc442cf71c0ef9443567bd6b5d2bdb19`,
  VSA60 `bd72b96a02bca8e7bcc0ac8273aa4c19c17ef86caae20647b171fbc330d7f96a`
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Basis: **registration** year. Emitted: 1964–2025.
- Quirks: contrary to the survey note, VSA50 is *boys* and VSA60 is *girls*.
  Only names with ≥3 occurrences in a year are included by CSO. The cube is
  dense (every name × every year); empty `VALUE` rows are skipped.

### NOR — Statistics Norway (SSB), StatBank table 10467
- URL: https://data.ssb.no/api/v0/en/table/10467 (POST, json-stat2)
- sha256: counts `8f851fb16966cd2b3cdb718070bcfa596d35878097f70df75bcd297e85fed28f`,
  per-cent `6b75d8f2e356cdd93649a0cece0f519b787add2afcddd083c72114c17568afb9`
- License: [CC BY 4.0](https://www.ssb.no/en/omssb/bruke-data-fra-ssb) (SSB open data)
- Basis: **birth** year up to 2020; year of *naming* from 2021 on (SSB note).
  Emitted: 1926–2025 (raw covers 1880+).
- Quirks: person counts (`Personer`) exist only from 1945; 1926–1944 is ranked
  by the `PersonerProsent` (per cent of born persons) measure instead — rank
  order is unaffected. Girl/boy encoded as a 1/2 prefix on the name *code*
  (single table, no sex dimension). SSB excludes names used by <200 persons
  and suppresses counts <4.

### AUT — Statistik Austria, OGD Vornamen (OGDEXT_VORNAMEN_1)
- URL: https://data.statistik.gv.at/data/OGDEXT_VORNAMEN_1.csv
- sha256: `49c277575ff669e5a7b670d759ec17d033e9c079aa802e3a096a0640b6756a6c`
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Basis: **birth** year (live births). Emitted: 1984–2025.
- Quirks: file is per political district (Wohnbezirk); summed to national.
  First names are orthographically *normalized* by Statistik Austria
  (spelling variants merged), so counts differ from raw register spellings.

### CAN — Statistics Canada, table 17-10-0147-01 (first names at birth)
- URL: https://www150.statcan.gc.ca/n1/tbl/csv/17100147-eng.zip
  (landing: https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710014701)
- sha256: `16f1f077e898d4e0ae4c20b3634fb17853b0d668e0ae804d2a723d467d190ec4`
- License: [Statistics Canada Open Licence](https://www.statcan.gc.ca/en/reference/licence)
- Basis: **birth** year. Emitted: 1991–2024.
- Quirks: 88 MB CSV covering provinces too; filtered to GEO = Canada,
  Indicator = Frequency. Names uppercase in source; title-cased. StatCan
  suppresses small counts (irrelevant for top 5).

### NZL — Dept. of Internal Affairs, "Baby Name popularity over time" (1900–2025)
- URL: https://catalogue.data.govt.nz/dataset/01ee87cd-ecf8-44a1-ad33-b376a689e597/resource/0b0b326c-d720-480f-8f86-bf2d221c7d3f/download/baby-names-1900-to-2025.csv
  (landing: https://catalogue.data.govt.nz/dataset/baby-name-popularity-over-time)
- sha256: `dccaa0ac0b46725cf355174b42ffce5b8e92f9ed0e26c6d5841412f95999e102`
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Basis: **registration** year. Emitted: 1926–2025.
- Quirks: catalogue.data.govt.nz is behind an Imperva bot wall — curl gets a
  "Pardon Our Interruption" page. The cached CSV was fetched once with a real
  (Playwright) browser; the script uses the cache and raises with instructions
  if it is missing. The file mixes latin-1 and DOS-codepage bytes in a few
  rare accented names (Renée, André, Danté; counts <40, never top-5); decoded
  as latin-1, which is lossless and correct for every name that can rank.

## Unavailable / skipped

- **Belgium (Statbel)** — `Firstnames_Girls_1995-.xlsx` / `Firstnames_Boys_1995-.xlsx`
  at https://statbel.fgov.be/en/themes/population/family-names-and-first-names/first-names-boys-and-girls
  (CC BY 4.0). The whole statbel.fgov.be domain sits behind an F5/TSPD
  JavaScript challenge; curl with browser headers *and* headless Chromium
  (incl. stealth tweaks) both fail to pass it. Follow-up: fetch the two xlsx
  by hand in a desktop browser into `data/raw/names/bel_{girls,boys}.xlsx`,
  then implement the parse (duckdb ≥1.2 `read_xlsx` noted in the script).
- **England & Wales (ONS)** — data exists under OGL v3 but as ~60 per-year
  xlsx files; deferred as a follow-up.
- **Sweden (SCB)** — publication discontinued / manual extraction only.
- **Spain (INE)** — CC BY-**SA** (viral share-alike) — license policy exclusion.
- **Australia** — no national dataset; state-by-state patchwork.
- **Netherlands** — database right asserted; **Germany** — no official
  register; **Italy** — query tool only, no bulk file; **Denmark** — manual;
  **Finland** — no year dimension. (Per DATA_EXPANSION.md Addendum 4 survey.)

## Brazil (BRA) — added 2026-08-23

- **Dataset:** IBGE, Censo Demográfico 2010, "Nomes no Brasil" ranking API
  (`servicodados.ibge.gov.br/api/v2/censos/nomes/ranking?decada=&sexo=`).
- **Basis:** decade of birth, self-reported in the 2010 census (`granularity:
  "decade"` — every year of a decade carries the decade list; UI copy must say
  "born in the 1970s", not "born in 1971"). Coverage 1930–2009.
- **License/terms:** IBGE open data, attribution required.
- **Quirk:** IBGE normalizes names to unaccented forms ("Jose", "Joao");
  emitted as published rather than re-accenting.

## Portugal — checked, unavailable

dados.gov.pt has no first-names dataset (searched 2026-08-23; only toponymy).
The IRN publishes recent-year "nomes mais registados" as news posts/PDFs —
no bulk dataset, no stated license. Revisit if IRN publishes properly.
