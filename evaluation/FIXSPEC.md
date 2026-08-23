# Shared spec for eval-round-1 fixes

Both the site and the worker implement these EXACTLY. A fixture test on each
side asserts the same outputs so the surfaces can never disagree again
(tereza P1-2 / folasade F7).

## Display number formatting (`fmtPeople`)

Displayed people-counts never carry more than 3 significant figures.

| magnitude | rule | example (input → display) |
|---|---|---|
| ≥ 10,000,000 | millions, 1 decimal | 91,070,227 → "91.1 million" |
| 1,000,000–9,999,999 | millions, 2 decimals | 4,297,760 → "4.3 million" (trim trailing 0) |
| 100,000–999,999 | round to nearest 1,000, digits | 232,060 → "232,000" |
| 1,000–99,999 | round to nearest 100, digits | 38,108 → "38,100" |
| 10–999 | round to nearest 10 | 847 → "850" |
| 1–9 | exact integer — never display a living cohort as 0 | 4 → "4" |

Prefix headline uses with "about" ("about 91.1 million people"). Locale
digit-grouping via `toLocaleString('en-US')` for the digit forms.

Fixture (assert on both sides):
`91070227→"91.1 million" · 4297760→"4.3 million" · 123739681→"124 million"
· 232060→"232,000" · 38108→"38,100" · 847→"850" · 1957713→"1.96 million"
· 97736443→"97.7 million" · 8300678397→"8.3 billion"`
(≥ 1e9: billions, 1 decimal.)

## Percentile display

`pct = 100 * (cum_alive_younger + 0.5*alive) / total_alive`, displayed as a
whole number. Clamp: if rounding gives ≥ 100 → "99"; if 0 → "1". Never "100%". Applies to page, canvas card, OG card.

## Reference-year label

Every surface that states a "now" number carries the vintage. Cards (OG +
canvas): one small line, exactly: `mid-2026 · UN World Population Prospects 2024`.
Page: keep inline "(mid-2026, UN projection)" phrasing.

## Card style tokens (OG worker + canvas card use the SITE's palette)

- background `#0c1322` (site dark bg), ink `#eef1f7`, soft ink `#9aa6bd`
- accent GOLD `#e8b64c` — replaces the worker's green; rank line in gold
- wordmark "Year Atlas" in gold, weight 700
- country display name, never ISO3, on every text surface (og:title,
  og:description, <title>, card header). Use short conventional names where
  the UN name is unwieldy — mapping: "United States of America"→"United
  States", "United Kingdom of Great Britain and Northern Ireland"→"United
  Kingdom", "Russian Federation"→"Russia", "Iran (Islamic Republic of)"→
  "Iran", "Bolivia (Plurinational State of)"→"Bolivia", "Venezuela
  (Bolivarian Republic of)"→"Venezuela", "Republic of Korea"→"South Korea",
  "Dem. People's Republic of Korea"→"North Korea", "Lao People's Democratic
  Republic"→"Laos", "Syrian Arab Republic"→"Syria", "Viet Nam"→"Vietnam",
  "Russian Federation"→"Russia", "United Republic of Tanzania"→"Tanzania",
  "Democratic Republic of the Congo"→"DR Congo", "Türkiye"→"Türkiye" (keep),
  "Micronesia (Fed. States of)"→"Micronesia", "State of Palestine"→
  "Palestine", "China, Taiwan Province of China"→"Taiwan", "China, Hong Kong
  SAR"→"Hong Kong", "China, Macao SAR"→"Macao", "Côte d'Ivoire"→"Côte
  d'Ivoire" (keep). Everything else: UN name as-is. In running text after a preposition, names in the shared THE-set take a definite article ("living in the Philippines"). Both sides duplicate the mapping + THE-set; fixture-test a sample.

## Copy templates (shared sentences)

- Country headline sentence (page + both cards):
  `about {N} people living in {Country} were born in {Y}`
- World headline: `about {N} people alive right now were born in {Y}`
- Rank line, world: `older than {P}% of the world`
- Rank line, country: `older than {P}% of people in {Country}`
- World survival line (company-first, per gudrun P2-1):
  `{alive} of the {births} people born in {Y} are still living.`
  (No percentage-gone framing. Percentage still-living may follow in parens.)
- Small-population caveat (page + OG card, gudrun/tereza P2-2):
  `Small population — estimates are noisy.`
- 1926 open-ended: birth year renders as `1926 or earlier`.
- Years ≥ 2025 (unfinished/projected birth years, folasade F5): suppress the
  "born in {Y} … still living" sentence entirely; instead
  `The UN projects about {births} births in {Y}.`
