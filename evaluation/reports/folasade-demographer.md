# Year Atlas — evaluation by Dr. Folasade Balogun

**Persona 1** · demographer, born 1979, Nigeria · desktop Firefox, work machine
Evaluated against the dev stack at `http://localhost:8787`, build commit `9609783`,
UN WPP 2024 medium variant, reference year 2026.

---

## My own number, first

I typed 1979 and Nigeria, because that is me, and the page said:

> **1,957,713**
> people living in Nigeria were born in 1979 — you're older than 87.6% of people there
> (mid-2026, UN projection).

I want to be fair about my first reaction, because it was two reactions at once.

The sentence underneath the number is better than I expected. *"This counts today's
residents born anywhere — people move. It can even be larger than the number of babies
born in Nigeria in 1979, so it's not a survival rate."* That is the §4.2 caveat, in
plain English, sitting directly under the figure rather than in a footer. Whoever wrote
that has actually thought about country cohorts. And `(mid-2026, UN projection)` is in
the same sentence as the percentage, not three scrolls down. I was ready to be annoyed
and I was not.

Then I looked at the number again. **1,957,713.** Seven significant figures. For a
single-year age cell, in Nigeria, in a projection year, from a country whose last census
was 2006 and whose single-year age distribution is a model output smoothed over reported
ages that heap on digits ending in 0 and 5. I have spent twenty years writing about
exactly this. The app is telling me it knows the number of 47-year-old Nigerians to the
person. It does not. Nobody does. The uncertainty on that figure is comfortably in the
hundreds of thousands, and the display asserts one.

Then I switched to the world view for my year and it got worse:

> **97,736,443** people alive right now were born in 1979
> 125,000,293 people were born in 1979. 78.2% are still living.

One hundred and twenty-five million, two hundred and ninety-three. That trailing "293"
is not information. It is the residue of multiplying the UN's thousands column by 1000
and printing whatever fell out. It is the single most quotable thing on this site and it
is quotable for the wrong reason.

So: my own number did not upset me, and the framing around it did not upset me. The
typesetting of it did.

---

## Verdict

**I would not assign this to students yet, and I would not post the thread either.**

I came in expecting to do one or the other. The reason I would do neither is that this
is the first public demography toy I have opened where the methods page is genuinely
better than the product. It documents the direct age→birth-year mapping and says the
bucket straddles two calendar years. It names the medium variant. It publishes sha256
checksums and a build commit. It has a section titled "What we deliberately do not
compute." It documents the tie-handling in the percentile — *"your own single-year
cohort as half younger, half older — the standard mid-rank treatment of ties"* — which I
have reviewed papers that did not bother to state. Every number I checked reproduced
exactly from the file it names. That is not a toy; that is someone doing the work.

Which is precisely why the precision defect is unforgivable rather than merely sloppy.
The methods page argues, correctly, that a half-year birth-year split is pointless
because *"the extra precision would be smaller than the uncertainty already inside the
underlying estimates"* — and then the interface prints those estimates to the individual
person. The page and the product contradict each other. Fix the formatter and I will
assign this. It is one function.

If it ships as it stands and starts circulating, this is the sentence I would post:

> Year Atlas tells me 125,000,293 people were born in 1979 and that 1,957,713 of them
> live in Nigeria today — seven-figure precision on a medium-variant projection whose own
> methods page admits the uncertainty is larger than the rounding it refused to do.

---

## Answers to my evaluation questions

**1. What reference year, estimate or projection, and does the interface say so?**
2026, projection, and yes — near the number. `(mid-2026, UN projection)` is inside the
headline sentence on every result view, the dot-field caption repeats it, and the footer
says `Figures for mid-2026 are a UN projection (medium variant), not a count.` on every
page including the empty state. This is done properly *on the page*. It is not done on
the share card or in the meta tags — see F2, which is where it matters most, because the
card is the thing that travels.

**2. Does the stated source and query reproduce the number on screen? (§12)**
Yes. Completely. I fetched `http://localhost:8787/data/cohorts-now.parquet` (200, 537 KB,
no auth, no gate) and `world-now.json` (200, 18 KB, 101 rows) directly and ran the
methods page's own queries in DuckDB:

| on screen | from the file | match |
|---|---|---|
| 1,957,713 (NGA 1979 alive) | `1957713` | ✓ |
| 87.6% (NGA 1979 percentile) | `(cum_alive_younger + 0.5*alive)/total_alive` = 87.612% | ✓ |
| 97,736,443 (WLD 1979 alive) | `97736443` | ✓ |
| 125,000,293 (WLD 1979 births) | `125000293` | ✓ |
| 78.2% still living | 78.189% | ✓ |
| 71.2% percentile | 71.173% | ✓ |
| 1,628,361 (JPN 1979, passport table) | `1628361` | ✓ |
| 232,060 (UAE 1985) | `232060` | ✓ |

The traceability table on `/methods` lists every statistic against its source file and a
query sketch. This is the acceptance criterion in §12 and it is met. I have no complaint
here at all, and I want to say so as loudly as I am complaining elsewhere.

**3. How is the age→birth-year mapping described, and does it admit the straddle?**
Well, and yes. From `/methods`:

> The UN data counts people by *completed age* at mid-year. Someone who is 54 on 1 July
> 2026 was born somewhere in the twelve months ending 1 July 1972 — so a single age
> bucket straddles two calendar birth years, roughly half and half.

Then it names the choice, `birth_year = reference_year − age`, and justifies it. A
first-year student could read that paragraph. It is the best thing on the site.

One correction: the paragraph closes with *"it does not change the shape of any
comparison."* That is true for the middle of the distribution and false at the young
edge — see F5.

**4. Does world "share still living" stay ≤ 1, and what happens at the boundaries?**
Yes, everywhere, and the build asserts it. Maximum ratio across all birth years with a
births figure is 0.978. I checked directly:

```sql
SELECT count(*) FROM 'site/public/data/cohorts-now.parquet'
WHERE iso3='WLD' AND births IS NOT NULL AND alive > births;   -- 0
```

- **1950** (`/?y=1950`): 36,712,733 alive, 91,823,936 born, 40.0% still living. Clean.
- **1949** (`/?y=1949`): the births line simply vanishes, with no explanation (F9).
- **1926** (`/?y=1926`): correctly identified — *"This figure counts everyone born in or
  before 1926 — the UN's open-ended 100-plus group"* — and the survival line is
  suppressed. Exactly right. The 100+ bucket is where these things usually break and it
  does not break here.
- **2025 / 2026**: numerically fine, verbally not. See F5.

**5. Does Nigeria's country view avoid presenting births-vs-survivors as attrition, and
is the migration caveat at the point of the number?**
The headline: yes, and the caveat is directly beneath the figure, which is what I asked
for. The passport-contrast table shows cohort size and rank only, never a survival share,
and its own caption repeats *"migration included, so these are residents, not survival."*
Someone read §4.2 and implemented it.

**But the trajectory chart undoes it.** See F3. That chart draws Nigeria's 1979 cohort
falling from 3,170,197 in 1979 to 1,957,713 in 2026, under the heading "Your cohort over
time", with no migration caveat anywhere near it. That is births-versus-survivors as
attrition — drawn as a line instead of written as a number, which makes it harder to
argue with, not easier.

**6. How many significant figures, and does the precision match the estimate?**
Every figure on the page is rendered to the unit. No, it does not match, not remotely.
See F1. Note the irony that the OG card *does* round — `worker/src/index.js:106` rounds
anything over a million to the nearest 10,000 — so the rounding function already exists
in this codebase. It is just applied to the artefact that has no source line and not to
the one that does.

**7. Any acknowledgement that data quality varies by country?**
**No.** This is my discipline and it is the gap I care most about after F1. The only
quality signal in the entire app is population size: below 90,000 residents you get
*"Small population — estimates are noisy."* (verified on Andorra, `/?y=1979&c=AND`,
1,402). That is a real flag, honestly implemented, and it is answering the wrong
question. Andorra's problem is small numbers. Nigeria's problem is that the age
distribution is reconstructed, not observed — no census since 2006, incomplete vital
registration, and age heaping in every survey round that feeds it. Nigeria has 230
million people, sails past the 90,000 threshold, and is rendered in identical typography
to Japan, which has a household registration system that knows how many 47-year-olds it
has. Those two numbers on the same passport-contrast row — Japan 1,628,361 and Nigeria
1,957,713 — are not the same kind of object and the interface says they are.

**8. Would I be embarrassed to cite this in a lecture? What single change makes it
citable?**
As it stands: yes, and only because of the digits. A student would screenshot the
headline and I would have to spend ten minutes explaining why the last four are noise —
which is a good lecture, but not the one I planned.

**The single change: round every displayed figure to three significant figures and say
"about".** "About 1.96 million people living in Nigeria were born in 1979." Nothing else
about the app needs to move. That one change makes the interface consistent with its own
methods page, and it converts my thread into a recommendation.

---

## Findings

### F1 — Every displayed figure carries seven significant figures on a projection · **P0**

**Where:** all result views. `/?y=1979&c=NGA` headline `1,957,713`; `/?y=1979` headline
`97,736,443` and note `125,000,293 people were born in 1979`; the passport-contrast table
(`3,108,019`, `4,381,846`); the bigger-cohorts table (`138,295,873`); the downloadable
share card. Source: `site/src/stats.js:99` —

```js
export function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}
```

**What's wrong:** these are medium-variant projections for a date fourteen months past
the end of the WPP 2024 estimate period, built from censuses of varying age and quality
and smoothed to single years. The uncertainty on the Nigerian 1979 cell is plausibly
±10%; the display asserts ±0.5 persons. `125,000,293` is the worst of them: the UN
publishes births in thousands, so the final three digits are an artefact of
`round(Births * 1000)` in `scripts/build.sql:47`, not a measurement. This is the
specific failure that ends an evaluation for anyone in my field, and it is doubly bad
here because `/methods` explicitly argues that the underlying uncertainty exceeds the
precision being discarded — the product contradicts its own documentation.

**What would satisfy me:** three significant figures with a hedge word, everywhere a
figure is displayed to a reader. "About 1.96 million." "About 125 million were born in
1979." Keep full precision in the Parquet, where it belongs and where I can get at it.
If you want the exact integer visible, put it in a `title` attribute or a details row
labelled "value as stored" — not in 132px type. The rounding function already exists at
`worker/src/index.js:106`; promote it to `stats.js` and use it in all three surfaces.

### F2 — "alive today" on the share card and meta tags, with no year, no variant, no source · **P0**

**Where:** `/og?y=1979&c=NGA` (the PNG itself) — the card reads *"1,960,000 / people
alive today in Nigeria were born in 1979 / older than 88% of people in Nigeria"*.
Sources: `worker/src/index.js:133` (country/world card), `:143` (generic card), `:154–155`
(`og:description`); `site/src/share.js:56` (downloadable canvas card, *"people alive now
were born in {year}"*); `site/index.html:7` (`meta name="description"` — *"how many
people alive on Earth right now"*).

**What's wrong:** the page gets this right and every shareable derivative of the page
gets it wrong. The card is a 2026 medium-variant projection captioned "today", which is
the exact thing §4.3 forbids. It carries **no reference year, no variant name, and no
attribution at all** — no "UN WPP 2024", no CC BY notice, which is also a license
compliance problem given CC BY 3.0 IGO requires attribution on the derivative. And the
card is the only artefact most people will ever see: it gets screenshotted into WhatsApp
and separated from the page permanently. Meanwhile `og:description` says *"How many
people alive today were born in 1979?"* — that string is what renders in Slack, above the
image, also unlabelled.

**What would satisfy me:** one line on the card, small, bottom-left: `mid-2026 · UN WPP
2024, medium variant`. Change "alive today" to "alive in mid-2026" in
`worker/src/index.js:133,143`, in `og:description`, and in `share.js:56`. The card has
room; it is currently three elements on a 1200×630 field.

### F3 — The country trajectory chart draws a closed cohort · **P1**

**Where:** `/?y=1979&c=NGA`, section "Your cohort over time". Copy at
`site/src/main.js:154–156`:

> People born in 1979, counted in each year — solid is UN estimates, dashed is projection.

**What's wrong:** for Nigeria that line falls from 3,170,197 (1979) to 1,957,713 (2026) and
on to 1,733 by 2078. A reader sees a cohort being thinned by death. It is not: it is
residents-in-Nigeria-by-year, and the fall is mortality *plus* net emigration, in
unstated proportions. I confirmed the series is a residents series and not a
survivorship series by checking the UAE, where the same chart *rises* from 39,533 to
259,981 — which is the correct behaviour for the underlying data and proves the chart
cannot be read as survival. §4.2 confines the thinning statistic to the world view; this
chart reintroduces it for countries in graphical form, which is worse than a number
because there is nothing to caveat inline. The migration note is attached to the headline
figure and does not travel down the page to the chart.

**What would satisfy me:** for `iso3 != 'WLD'`, change the caption to name what it is —
"People born in 1979 living in Nigeria, counted in each year. Changes reflect migration
as well as mortality." For the world view the current caption is fine. Better still,
show the UAE line as the worked example on `/methods`; it makes the point in one image.

### F4 — Data quality is flagged by country *size* only, never by country *data quality* · **P1**

**Where:** `/methods`, section "Small countries are noisy"; the flag itself at
`site/src/main.js:88–90` (`total_alive < SMALL_POP`, 90,000). Nigeria at
`/?y=1979&c=NGA` carries no flag of any kind.

**What's wrong:** the threshold catches 36 locations and addresses sampling noise in
small numbers. It does not address the far larger source of error in this dataset, which
is that WPP's single-year age distributions are reconstructions whose quality varies by
an order of magnitude across countries. Nigeria's inputs are a 2006 census plus surveys
with substantial age heaping; Denmark's are a population register. The app renders both
in the same weight, same size, same confidence. The passport-contrast table puts Japan
and Nigeria on adjacent rows to four extra digits each and invites a comparison the data
does not support at that resolution. Nothing on `/methods` tells a reader this varies at
all — the closest it comes is *"the UN has modeled it from the most recent censuses,
surveys, and vital registration"*, which is true and carries no warning.

**What would satisfy me:** two things, neither of them a research project. (a) A
paragraph on `/methods` titled something like "Some countries are better measured than
others", saying plainly that single-year ages are reconstructed, that census recency and
civil-registration completeness differ, and that age heaping in reported ages is smoothed
by the UN rather than eliminated. (b) A per-country data-vintage line at the point of the
number: "Nigeria's age structure is modelled from its 2006 census and later surveys."
The census year alone would do enormous work and it is one small lookup table. If you
want a defensible ready-made ordering rather than hand-curation, the UN's own
`DataSourceYear`/data-quality metadata in the WPP sources file gives you it.

### F5 — The 2026 birth year states a completed-year birth count for a year that is not over · **P1**

**Where:** `/?y=2026` — *"132,503,469 people were born in 2026. 97.8% are still living."*
Also `/?y=2025` (97.2%).

**What's wrong:** today is 22 August 2026. About a third of those births have not
happened. The sentence is in the past tense and gives a completed figure. Separately, the
ratio is comparing two different twelve-month windows: the numerator is people of
completed age 0 at 1 July 2026, i.e. born July 2025–June 2026, while the denominator is
calendar-year 2026 births. The magnitude comes out plausible because consecutive birth
cohorts are similar in size, but "97.8% of people born in 2026 are still living" is not a
statement about any actual group of people, and it is the one place where the methods
page's claim that the direct mapping *"does not change the shape of any comparison"* is
false — the straddle matters most exactly where first-year mortality is steepest.

**What would satisfy me:** suppress the share-still-living line for birth years within
two years of the reference year, and phrase the births figure as a projection: "The UN
projects about 133 million births in 2026." Add one clause to the methods straddle
paragraph acknowledging that the approximation degrades at the youngest ages.

### F6 — Page `<title>` is constant and never names the reference year · **P1**

**Where:** `site/index.html:6`. Every URL — `/?y=1979&c=NGA`, `/?y=1950`, `/?y=2026` —
returns `Year Atlas — everyone born in your year`. The worker rewrites `og:title` to
`Born in 1979 (NGA) — Year Atlas` but never touches `<title>`.

**What's wrong:** the title is the label on the browser tab, the bookmark, the citation,
and the search result. It identifies neither the cohort nor the reference year. Someone
with six tabs open comparing birth years cannot tell them apart, and a saved bookmark
carries no indication of which data vintage it was taken against.

**What would satisfy me:** `Born in 1979, Nigeria — 1.96 million alive mid-2026 · Year
Atlas`. Rewrite it in the worker alongside the other tags at `worker/src/index.js:156`.

### F7 — The same statistic is rendered three different ways across three surfaces · **P2**

**Where:** NGA 1979 renders as `1,957,713` on the page, `1,960,000` on the OG card, and
`1,957,713` again on the downloadable canvas card (`share.js` imports the unrounded `fmt`
from `stats.js`). The percentile renders as `87.6%` in the headline sentence, `88%` in
the passport table, and `88%` on the card.

**What's wrong:** anyone who screenshots the card and compares it to the page sees two
different figures for the same quantity and has to work out which is authoritative.
Neither says "about". It also means the codebase currently holds two rounding policies
and applies the stricter one to the artefact with less context.

**What would satisfy me:** one formatter, one policy, imported by all three renderers.
Resolving F1 resolves this.

### F8 — `og:title` shows the raw ISO3 code, not the country name · **P2**

**Where:** `worker/src/index.js:152` — `Born in 1979 (NGA) — Year Atlas`.

**What's wrong:** the card image beneath it correctly says "Nigeria", so the worker has
the name available by the time it draws the PNG. "NGA" in a Slack unfurl reads as an
unresolved code and undercuts the care visible everywhere else.

**What would satisfy me:** use `location_name`, as the card already does.

### F9 — Pre-1950 birth years drop the births line silently · **P2**

**Where:** `/?y=1949` versus `/?y=1950`. At 1950 you get *"91,823,936 people were born in
1950. 40.0% are still living."*; at 1949 that sentence is simply absent
(`site/src/main.js:97`, guarded on `births != null`).

**What's wrong:** a reader who compares the two years concludes the statistic is missing,
or broken, or that something about 1949 is different in a way the app will not say. The
real reason — WPP's births series begins in 1950 — is a one-line fact and is
interesting rather than embarrassing.

**What would satisfy me:** print it. "The UN's births series starts in 1950, so there is
no original-cohort figure for 1949."

### F10 — Fifty-two years of projection drawn as a fine dotted line with no uncertainty band · **P2**

**Where:** the trajectory chart on every result view; `/?y=1979` runs the dashed segment
from 2026 to 2078.

**What's wrong:** the caption distinguishes estimate from projection, which is correct
and more than most tools do. But a single thin line to 2078 conveys a point forecast. A
medium-variant projection half a century out has a wide interval, and the app has the
high and low variant files available from the same UN download directory it already
fetches from.

**What would satisfy me:** either a shaded high/low band behind the dashed segment, or —
cheaper and nearly as good — truncate the projection at 2050 and say why.

### F11 — Query "sketches" on /methods are not runnable · **P3**

**Where:** `/methods`, "Where each number comes from" table — e.g. `alive where iso3 = C
and birth_year = Y`.

**What's wrong:** this satisfies §12 as written and I am not going to pretend otherwise.
But the thing I actually wanted was to send a colleague a link that produces the number,
and I had to write the DuckDB myself. It took two minutes; it should have taken zero.

**What would satisfy me:** one copy-pasteable line per row against the public URL, e.g.

```sql
SELECT alive FROM 'https://yearatlas.example/data/cohorts-now.parquet'
WHERE iso3 = 'NGA' AND birth_year = 1979;
```

That is the artefact that ends WhatsApp arguments, and it is a formatting change to a
table you have already built.

### F12 — Out-of-range years fail silently · **P3**

**Where:** `/?y=1925` returns the empty state with no message; the hint text *"A year
between 1926 and 2026"* is present but does not react.

**What would satisfy me:** "1925 is outside the range — the UN's oldest group pools
everyone born in or before 1926." Which is a genuinely interesting sentence.

---

## Feature requests

Out of character now, and constructive. These are grounded in what is already on disk or
in `docs/DATA_EXPANSION.md`, not wishes.

### 1. Infant mortality in the year and country you were born

**What:** one line under the headline: "In Nigeria in 1979, about 110 of every 1,000
babies died before their first birthday. In Japan that year it was 8." Optionally the
same for median age and TFR — "you were born into a country whose median age was 17."

**Why:** it is the single most effective way to make a cohort number mean something
without going anywhere near an individual mortality claim, and it directly serves the
"company, not death clock" constraint — it is about the world the cohort entered, not
about what happens to them next. It also does honest work on the world-versus-country
contrast that the passport panel currently makes only in raw headcounts. For my own
teaching, it is the number I would actually use: it makes the fertility-mortality
transition visible from a single birth year.

**Data source:** `WPP2024_Demographic_Indicators_Medium.csv.gz` — **already in
`data/raw/`, sha256 already recorded in `data/SOURCES.md`, license already cleared as CC
BY 3.0 IGO**. Columns `IMR`, `Q5`, `MedianAgePop`, `TFR`, `MAC`. `docs/DATA_EXPANSION.md`
§1 measures the derived file at 146 KB / 18,249 rows, lazy-loaded, built with one
`COPY … TO`. This is the highest value-per-unit-effort item available and it needs no new
paperwork. Heed that document's own warning and leave `LEx` out entirely — it is a period
measure, readers will difference it against their age, and §9 forbids the result.

### 2. Uncertainty made visible: show the high and low variants

**What:** on the trajectory chart, a band between the WPP high and low variants for the
projected segment. On the headline, on hover or in a details row, the range: "1.9–2.0
million under the UN's high and low variants." Not a confidence interval — the variants
are scenarios, not a posterior — and the copy must say so.

**Why:** it is the honest answer to F1 and F10 at once, and it turns the app's biggest
liability into its most distinctive feature. Nothing in this genre shows variant spread;
almost everything in this genre publishes a point estimate to seven digits. Doing the
opposite is both more correct and more interesting, and it is what would make me assign
the page as a reading on why projections are not counts. It also directly reinforces the
"mid-2026 is a projection" label that the app already works hard to place.

**Data source:** the same UN download directory `scripts/fetch.py` already pulls from —
`WPP2024_PopulationBySingleAgeSex_High_2024-2100.csv.gz` and the corresponding `_Low_`
file. Same format, same license, same build path; `scripts/build.sql` needs a variant
column and the app needs one extra lazy-loaded slice. SPEC §3.1 already names the High
file as the confirmed-format example, so the URL pattern is verified.

### 3. A data-vintage line per country

**What:** at the point of the number, one sentence naming what the country's age
structure is actually built from: "Nigeria's single-year ages are modelled from the 2006
census and later surveys." For a register country: "Denmark's come from a continuously
maintained population register." Plus a paragraph on `/methods` explaining why these are
different kinds of object.

**Why:** this is F4's fix and it is the difference between a tool I warn students away
from and one I use to *teach* age misreporting. Right now the app's only quality axis is
population size, which is the less important one. Showing census recency next to the
figure would make Year Atlas the first popular demography tool that admits its inputs are
uneven — and it costs a lookup table, not a research programme.

**Data source:** WPP 2024's own sources/metadata file (the `DataSourceYear` and
data-type fields published alongside the standard CSV set, from the same download index
`scripts/fetch.py` already reads). Fall back to a hand-curated 285-row CSV of latest
census year if the metadata file proves awkward — it is a one-afternoon job and it does
not expire quickly.

### 4. Cohort education attainment, once the license is clean

**What:** "Of people born in Brazil around 1975, 62% completed secondary school or more.
For those born around 1955, it was 31%." The "around" stays in the copy, because the
source is five-year bins.

**Why:** it is the strongest available answer to "what does my cohort have in common",
which is the emotional promise the app makes and currently answers only with headcount.
Cohort education is also the variable that makes the country contrast informative rather
than a poverty ranking — it shows a *trajectory* within each country, so the comparison is
"how much changed between these two generations here" rather than "which country is
worse". That framing is worth having in place before anyone accuses the passport panel of
being a league table.

**Data source:** two options, both documented in `docs/DATA_EXPANSION.md`. Ship now
against **World Bank EdStats `BAR.*`** (Barro-Lee via the World Bank copy) — CC BY 4.0,
verified, real five-year age groups, ~146 countries, 1960–2010, which covers birth years
to roughly 1985. In parallel send the IIASA email about the **Wittgenstein Centre WCDE**
data license, which would extend the same feature to 200 countries and recent cohorts and
has a verified 1950 reconstruction. Do not ship WCDE before that answer arrives — the
only license signal in that ecosystem is CC BY-NC on a companion paper, which is worse
than silence.

---
---

# Re-check — 22 August 2026

Focused verification of F1–F12 against the rebuilt stack. Not a fresh review.

**Environment note.** The shared instance on `:8787` returned `404` for every path
except `/og` — `site/dist/` was rebuilt at 20:41 against a wrangler started at 20:40, so
the asset manifest was stale. I could not restart a server I don't own, so I ran my own
`wrangler dev --port 8799` from the same tree and evaluated against that. Everything
below is from `:8799`, build `43746c2`, and the numbers reconcile to the same files.

## Verdict

**Yes. I would now assign this to students, and I would post the thread as a
recommendation rather than a complaint.**

The defect that ended the last evaluation is gone, and it is gone *properly* — not
patched at the headline but routed through one shared formatter that both the site and
the worker import, so the page, the download card, and the OG card cannot drift apart
again. That was the actual fix, and someone did the harder version of it.

I want to be precise about what changed my mind, because it was not only F1. It was that
the trajectory chart now stops at the reference year and says "Residents born in 1979
living in Nigeria … migration included, so this is people living there now, not
survivors." That chart was my most serious objection after the digits, because a line
falling across a page is an argument you cannot annotate away, and it now says what it
is. Truncating at 2026 also disposes of F10 at the same time: there is no fifty-two-year
point forecast left to mistake for knowledge.

One thing must be fixed before anyone cites this, and it is embarrassing precisely
because provenance is what I praised loudest last time — see **N1**. It is a two-string
edit, not a rebuild.

What I still want, in order: the per-country data-vintage line (F4), the runnable queries
(F11), and the one honest clause on the methods straddle paragraph (F5b). None of them
block a lecture. All three would make this the tool I teach *from* rather than the tool I
teach *with*.

## Findings

| | finding | status |
|---|---|---|
| F1 | seven significant figures everywhere | **fixed** |
| F2 | share card has no year/variant/source | **fixed** (variant name still absent) |
| F3 | trajectory chart draws a closed cohort | **fixed** |
| F4 | quality flagged by size, never by data quality | **not fixed** |
| F5a | 2025/2026 stated as completed births | **fixed** |
| F5b | methods straddle paragraph overclaims | **not fixed** |
| F6 | `<title>` constant, never names the year | **partially fixed** |
| F7 | same statistic rendered three ways | **fixed** |
| F8 | `og:title` shows raw ISO3 | **fixed** |
| F9 | pre-1950 births line drops silently | **fixed** |
| F10 | 52 years of projection, no uncertainty | **fixed** (by truncation) |
| F11 | query sketches not runnable | **not fixed** |
| F12 | out-of-range years fail silently | **partially fixed** |
| N1 | *new* — methods page cites the wrong build commit | **open** |

### F1 — **fixed**

`site/src/stats.js` and `worker/src/format.js` now both export `fmtPeople`, capped at
three significant figures, and the copy carries "about". Verified on every surface:

| surface | NGA 1979 |
|---|---|
| headline | `about 1.96 million` |
| passport-contrast table | `1.96 million` |
| bigger-cohorts table | `7.29 million`, `6.92 million` |
| dot-field caption | `One dot is 200,000 people` |
| downloadable canvas card | `about 1.96 million` |
| `/og` PNG | `about 1.96 million` |
| `og:description` | `About 1.96 million people living in Nigeria …` |

The tables were the ones I expected to be missed and they were not. The world view now
reads *"About 97.7 million of the 125 million people born in 1979 are still living
(78%)."* — `125,000,293` is gone, and with it the sentence I was going to quote.

Rounding is honest at both ends: Andorra renders `about 1,400` (stored 1,402) and the
100-plus bucket renders `about 672,000`, so the policy is significant figures rather than
a blanket "millions" conversion that would have destroyed the small countries.

### F2 — **fixed**, with one omission

`/og?y=1979&c=NGA` now carries a bottom line: `mid-2026 · UN World Population Prospects
2024`. The canvas card carries the identical string. No "alive today" anywhere on a
country card — it reads *"people living in Nigeria were born in 1979"*.

Two residual notes, neither blocking. The card says "World Population Prospects 2024" but
not **medium variant**, which is the word that distinguishes a scenario from a number;
and there is still no CC BY notice on the derivative, which CC BY 3.0 IGO asks for. There
is room on the line for both. The world card also still says "alive right now", but the
vintage line now sits directly beneath it, so the card is self-correcting in a way it was
not before.

### F3 — **fixed**

`site/src/main.js:267–272`. Country view heads the section **"Residents born in 1979 over
time"** and captions it *"People born in 1979 living in Nigeria, counted in each year
since 1979 — migration included, so this is people living there now, not survivors."*
The world view keeps the old caption, correctly. Confirmed on Nigeria (falling) and the
UAE (rising) — the caption now covers both behaviours honestly.

Minor, not a finding: the section lazy-loads on intersection, so it is absent from a
full-page screenshot taken without scrolling. Anyone printing or archiving the page loses
the chart.

### F4 — **not fixed**

No per-country data-vintage line, and no methods paragraph. `grep` for
census/heaping/register across `site/src` and `methods.html` returns only the pre-existing
sentence *"the UN has modeled it from the most recent censuses, surveys, and vital
registration"*. The size threshold at 90,000 is still the only quality axis, so Nigeria
(230 million residents, last census 2006) and Japan (household registration) remain
adjacent rows in identical type.

The 3-sig-fig rounding does soften this — `1.96 million` next to `1.63 million` invites a
far less false comparison than `1,957,713` next to `1,628,361` did — so the harm is much
reduced. It is no longer a P1 for me. It is still the difference between a tool I use in
a lecture and a tool I use to *teach age misreporting*, which is the better lecture.

### F5 — **fixed** in the app, **not fixed** on the methods page

`/?y=2026` now reads *"The UN projects about 133 million births in 2026."* The
share-still-living line is suppressed for 2025 and 2026. Both halves of what I asked for
— past tense removed, mismatched-window ratio withdrawn — are done.

The methods straddle paragraph still closes *"it does not change the shape of any
comparison."* Unchanged. That claim is still false where first-year mortality is
steepest, which is exactly the region the app now (rightly) declines to compute a ratio
for. The code learned the lesson and the prose did not. One clause fixes it.

### F6 — **partially fixed**

The worker emits precisely what I asked for:

```
$ curl -s "http://localhost:8799/?y=1979&c=NGA" | grep -o "<title>[^<]*</title>"
<title>Born in 1979, Nigeria — 1.96 million alive mid-2026 · Year Atlas</title>
```

But the browser tab reads `Born in 1979 in Nigeria — Year Atlas`, because
`site/src/main.js:83–87` unconditionally overwrites it on render:

```js
function updateTitle() {
  document.title = state.year
    ? `Born in ${state.year}${state.iso3 ? ` in ${placeName()}` : ''} — Year Atlas`
    : 'Year Atlas — everyone born in your year';
}
```

So crawlers and unfurls get the good title and every human gets the weaker one — the tab,
the bookmark, the citation, the screenshot. Both halves of my complaint (name the cohort,
name the vintage) are satisfied only on the surface no reader sees. The client title
drops the count *and* `mid-2026`, which is the part that identifies the data vintage in a
saved bookmark. Have `updateTitle()` build the same string as the worker, or delete it
and let the server-rendered title stand.

### F7 — **fixed**

`1.96 million` and `88%` on the page, the canvas card, and the OG card. One formatter,
one policy, three surfaces agreeing. The headline percentile moved from `87.6%` to `88%`,
matching the tables — the right direction, and consistent with the argument in F1.

### F8 — **fixed**

`og:title` is `Born in 1979, Nigeria — 1.96 million alive mid-2026 · Year Atlas`. No
ISO3.

### F9 — **fixed**

`/?y=1949`: *"The UN's births series starts in 1950, so there's no original-cohort figure
for 1949."* Printed, as asked.

### F10 — **fixed**, by the cheaper route

`site/src/main.js:264` filters the arc to `ref_year <= REF_YEAR`. The chart ends at 2026
with a `2026 · 1.96 million` endpoint label and no forward projection at all. I offered
truncation as the cheap alternative to a variant band and I meant it; this is better than
truncating at 2050, because it removes the point-forecast reading entirely rather than
shortening it. The high/low band remains the more interesting feature (see feature
request 2) but it is no longer a correction.

### F11 — **not fixed**

The "query sketch" column still reads `alive where iso3 = C and birth_year = Y`. No
runnable SQL anywhere on the page. Unchanged, and still the thing I would most like to
send a colleague.

### F12 — **partially fixed** (was P3)

Typing `1925` into the year field now surfaces **"That year is outside 1926–2026."** —
the silent failure is gone on the path most people take. Navigating directly to
`/?y=1925` still renders the bare empty state with no message. And the message does not
carry the interesting fact I suggested (that the UN's oldest group pools everyone born in
or before 1926). Both remainders are P3 and I am not pressing them.

### N1 — *new* — the methods page cites a build commit that did not produce the figures · **P1**

`/methods.html` says, twice, that the figures were produced at commit **`9609783`**:

> Reference year 2026 · built from UN World Population Prospects 2024 · build commit 9609783
> … The figures on this site were produced at commit 9609783.

The live data disagrees. `site/public/data/meta.json` is
`{"source":"UN WPP 2024","variant":"medium","ref_year":2026,"built":"2026-08-23","commit":"43746c2"}`,
and the footer on every other page renders `build 43746c2` from it. So a reader who
follows "How we count" is handed a commit that is not the one that built the numbers
they just read, and the two strings are hardcoded in `site/public/methods.html` while the
footer reads the manifest.

This is the one thing on the list I would call disqualifying for *citation*, as opposed
to teaching, and only because §12 traceability is the part of this project I hold up as
exemplary. A provenance page that is confidently wrong about provenance is worse than one
that says nothing. Read `meta.json` for both strings, the way the footer already does.

The underlying provenance is otherwise intact — I re-verified the three sha256 checksums
printed on the methods page against `data/raw/` and all three match byte for byte.

## Spot-check: did the data path change corrupt anything?

No. The build moved country data to per-ISO3 JSON under `site/public/data/now/`, so I
checked the new file against the parquet the worker still reads:

```sql
SELECT alive, cum_alive_younger, total_alive,
       round(100*(cum_alive_younger + 0.5*alive)/total_alive, 3) AS pctile
FROM read_json_auto('site/public/data/now/NGA.json') WHERE birth_year = 1979;
--  1957713 | 211420513.0 | 242431835.0 | 87.612

SELECT alive, round(100*(cum_alive_younger+0.5*alive)/total_alive,3)
FROM 'site/public/data/cohorts-now.parquet' WHERE iso3='NGA' AND birth_year=1979;
--  1957713 | 87.612
```

Identical, and identical to what I recorded in the original review. The displayed `about
1.96 million` and `88%` are the correct 3-sig-fig and whole-percent renderings of
`1957713` and `87.612`. Full precision is preserved in the data files, exactly where I
asked for it to stay.

The world figures are also unchanged — `alive = 97,736,443`, `births = 125,000,293`,
78.2% — and the closure invariant still holds: `max(alive/births)` across all birth years
with a births figure is `0.978`. Rounding was applied at the display layer only, which is
the correct place and was the whole point.

## What I would post now

> Year Atlas will tell you about 1.96 million people living in Nigeria were born in 1979,
> and it will tell you that figure is a mid-2026 UN medium-variant projection, on the
> page and on the card you screenshot. Its trajectory chart stops at the present and
> admits that a country's cohort changes by migration as well as by death. I do not know
> another tool in this genre that does either.
