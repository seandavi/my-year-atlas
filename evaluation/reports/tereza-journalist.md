# Year Atlas — evaluation by Tereza Muniz, data desk, São Paulo

**Persona:** #2 in `evaluation/PERSONAS.md`. Born 1991, Brazil. Evaluating the app as a
source and possible embed for a piece on Brazil's fertility decline.
**Build:** `http://localhost:8787`, methods page reports commit `9609783`, reference year
mid-2026, UN WPP 2024 medium variant.
**Date:** 2026-08-22.

---

## Verdict

**Cite the page, with caveats — but do not let the share cards out of the building:** the
site itself is the most traceable public demography toy I have used (every headline number
reproduced from the named source file in one command), but the OG and download cards strip
the reference year, the source, and the country out of the sentence, and one of them states
a number that is flatly false when read alone.

### The one-paragraph brief for my editor

The web page is honest. It labels every figure "mid-2026, UN projection", it puts the
migration caveat directly under the number rather than three scrolls down, and the methods
page names the exact file, the sha256, the build commit and the query behind each stat — I
reproduced all four of my headline numbers from `/data/world-now.json` in a single command
and they matched to the digit. That is better sourcing than most of what we link to. What I
would not touch is the sharing layer. The downloaded PNG says "3,203,691 people alive now
were born in 1991" with "Brazil" as a detached grey label at the bottom — read alone, that
sentence is false by a factor of 38, because the world 1991 cohort is 122 million. And no
card carries a source line or the reference year, so any of them landing in a WhatsApp
thread is an unattributed number with no provenance. I would quote the page and rebuild the
graphic myself.

---

## Findings

Severity is editorial, not engineering: **P0** = I would have to run a correction. **P1** =
blocks citation until fixed. **P2** = I work around it and grumble. **P3** = polish.

### P0-1 — The downloadable share card states a country number in a worldwide sentence

**Location:** `site/src/share.js:56` (and the `rankLine` helper it consumes,
`site/src/main.js:56-59`). Reproduce: `/?y=1991&c=BRA` → "Download image" →
`year-atlas-1991-BRA.png`. Screenshot: `harness/shots/tereza-04-canvas-view.png`.

**What's wrong.** The card's headline sentence reads:

> **3,203,691**
> people alive now were born in 1991
> Older than 48.9% of people alive right now there.
> Brazil

The country appears nowhere in the sentence. "Brazil" is a small grey label at the bottom,
visually detached from the claim, and the rank line uses the pronoun "there" with no
antecedent anywhere on the card. Read as a standalone image — which is the entire purpose
of a download button — the card asserts that 3,203,691 people alive now were born in 1991.
The true worldwide figure is 122,029,464. The card is wrong by a factor of 38.

The `rankLine` comment says "the country name gets its own line there", so this is
deliberate. It is still a false sentence, and it is the artifact most likely to be
screenshotted and reposted with no link back.

Note that the server-rendered `/og` card gets this **right** — "people alive today in
United Arab Emirates were born in 1985". The two card renderers disagree.

**What would satisfy me.** Put the place inside the sentence on the canvas card, exactly as
the worker card already does, and replace the dangling "there" with the country name. If
the design needs the place on its own line, then the sentence has to be self-limiting
("...were born in 1991, in Brazil").

---

### P1-1 — Every share card writes "today" over a projection, with no source and no attribution

**Location:** `worker/src/index.js:133` (`people alive today${inPlace} ${born}`) and
`site/src/share.js:56` (`people alive now were born in ${year}`). Reproduce:
`curl 'http://localhost:8787/og?y=1991&c=BRA'`. Screenshots:
`harness/shots/og_y_1991_c_BRA.png`, `og_y_1985_c_ARE.png`.

**What's wrong.** Three separate omissions, all on the artifact designed to travel without
its page:

1. **"today" / "now" over a 2026 medium-variant projection.** SPEC.md §4.3 says this in as
   many words: *"Do not write 'today' over a projected number without saying so."* The page
   obeys — "(mid-2026, UN projection)" sits in the headline sentence. The cards do not.
2. **No source.** Nothing on any card says UN, WPP, 2024, or medium variant. A card in a
   Slack channel is a big confident number with a wordmark and no provenance. If a reader
   asks me where 3.2 million comes from, the image cannot answer.
3. **No attribution, which is a licence problem, not just an editorial one.** The data is
   CC BY 3.0 IGO. SPEC.md §3.1: *"Attribution is required and must appear in the UI, not
   just the repo."* A 1200×630 PNG containing derived UN figures, served from a public
   endpoint and designed for redistribution, is the clearest case of a distributed
   derivative work in the whole product, and it is the one surface with zero attribution.

**What would satisfy me.** One line of small type across the bottom of both cards:
`UN World Population Prospects 2024 (medium variant) · mid-2026 projection · yearatlas.…/?y=1991&c=BRA`.
That is four facts and it makes the card standalone-defensible, citable, and licence-clean
in a single row. It also gives the card a URL, which is what makes the share loop close.

---

### P1-2 — The card number and the page number disagree for the same query

**Location:** `worker/src/index.js:106-109` (`fmt`) versus `site/src/stats.js:99-101`
(`fmt`). Two independent implementations of the same function.

**What's wrong.** The worker rounds to the nearest 10,000 but only above a million; the
site does not round at all. For one query, `/?y=1991&c=BRA`, I get three renderings and two
different numbers:

| surface | shows |
|---|---|
| page headline | 3,203,691 |
| `/og` card (Slack preview) | 3,200,000 |
| downloaded PNG | 3,203,691 |

The threshold also means sub-million countries are never rounded: the UAE card asserts
`232,060` and the Tuvalu card asserts `114`, both to the single person.

I do not object to rounding — I would *prefer* rounding, see P2-4. I object to the preview
image and the page disagreeing, because a fact-checker comparing my screenshot against the
live page finds a number that moved and assumes the methodology changed. That is precisely
the failure that burned me on the last interactive I embedded.

**What would satisfy me.** One rounding function, shared, applied identically to page and
both cards. If the card rounds, the page rounds.

---

### P1-3 — `/og?y=1926` claims "older than 100% of the world"

**Location:** `worker/src/index.js:101-103`. Screenshot:
`harness/shots/og_y_1926_c_WLD.png`.

**What's wrong.** The card reads:

> **671,933** people alive today were born in 1926 or earlier
> **older than 100% of the world**

Nobody is older than 100% of a population that includes them. The methods page is explicit
that your own cohort is counted half-younger, half-older, so the true value is a shade under
100% and can never reach it.

The fix already exists in this codebase and was not carried across: `site/src/stats.js:110-115`
has an explicit guard with the comment *"a true fraction should never display as 100%"*.
The worker reimplements the percentile with a bare `Math.round()` and inherits the bug the
site already fixed.

This is the single most quotable-out-of-context artifact the app produces, and it is
self-evidently false, so it discredits every other number on the card next to it.

**What would satisfy me.** Import the site's `fmtPct` guard into the worker, or floor the
displayed percentage at 99%.

---

### P1-4 — Nothing versions the data, so my published URL is a moving target

**Location:** whole app. No `rev`/`v` parameter is read anywhere; no changelog file exists
in the repo; `grep -riE "changelog|data_version"` returns nothing.

**What's wrong.** This is the check I run before I link to anything, because I have been
burned by an embed that silently changed its methodology after publication. `/?y=1991&c=BRA`
encodes the question but not the answer's provenance. When this is rebuilt on WPP 2026, the
same URL I printed in a story returns a different number, and there is no way for a reader
arriving in 2027 to know that the figure I quoted is not the figure they are seeing.

Partial mitigations exist and deserve credit: the footer names "World Population Prospects
2024 (medium variant)" and the methods page names the build commit `9609783` and the sha256
of each raw file. So a careful reader *can* tell which revision they are looking at today.
But a published article cites a URL, not a footer, and there is no record of what changed
between revisions.

**What would satisfy me.** Either an optional pin — `/?y=1991&c=BRA&rev=wpp2024` — that
resolves to the archived slice, or, much cheaper and nearly as good, a dated changelog
section on `/methods` listing each rebuild with its WPP revision, build commit and date, so
I can footnote "retrieved 2026-08-22, WPP 2024 revision, build 9609783" and a reader can
verify that string still describes the live site. See feature request 1.

---

### P2-1 — The link preview's text says nothing, and says it in ISO codes

**Location:** `worker/src/index.js:152-155`. Reproduce:
`curl -s 'http://localhost:8787/?y=1991&c=BRA' | grep og:`.

```
og:title       Born in 1991 (BRA) — Year Atlas
og:description How many people alive today were born in 1991? See the cohort in BRA on Year Atlas.
```

**What's wrong.** Two things. First, `(BRA)` and "the cohort in BRA" are raw ISO 3166
alpha-3 codes shown to readers. The card image resolves the same code to "Brazil"
correctly, so the data to do it is right there in the same request — the text meta just
doesn't use it. For BRA a reader guesses; for ARE, ISL or TUV they do not.

Second, the description is a *question* and contains no number. Every surface that renders
the text but not the image — most CMS embed cards, RSS, plain-text link unfurls, email
clients — shows a preview that conveys nothing at all. The whole value proposition is "the
preview has your own number in it", and it does, but only in the image layer.

**What would satisfy me.** `og:description` = the answer, with its qualifier:
`3,203,691 people living in Brazil were born in 1991 — mid-2026 UN projection.` And resolve
the ISO code to the country name in both title and description.

---

### P2-2 — The small-country caveat is on the page and missing from the card

**Location:** caveat at `site/src/main.js:91` (`Small population — estimates are noisy.`,
threshold `SMALL_POP = 90000` at `main.js:10`); absent from `worker/src/index.js` entirely.
Screenshot: `harness/shots/og_y_1991_c_TUV_v.png`.

**What's wrong.** `/og?y=1991&c=TUV` renders "**114** people alive today in Tuvalu were born
in 1991" as a clean, confident, caveat-free image. The page for the same query flags it as
noisy; the card does not. This is the same structural problem as P1-1 and P1-3 — the card
consistently drops the honesty the page carries — but it is worse here because the number is
small enough that single-person precision on a UN estimate for a country of 11,000 people is
not a rounding quibble, it is fiction.

**What would satisfy me.** Carry the flag onto the card, or round small-country figures to
two significant figures on the card and say "about".

---

### P2-3 — The UAE case is explained on `/methods` and hedged on the page that shows it

**Location:** `/?y=1985&c=ARE`, caveat paragraph under the headline. Screenshot:
`harness/shots/tereza-02-are1985-top.png`.

**Credit where it is due first:** this was the probe I expected to fail and it does not. The
headline is *"232,060 people living in United Arab Emirates were born in 1985"* — correct
scoping, residents born that year, not survivors. It does **not** read as impossible
survival. The caveat sits directly under the number, above the fold, before I could possibly
have drafted a paragraph off it. The passport-contrast block repeats it. The methods page
then works the UAE example out in full, by name, with both figures. That is exactly the
disclosure sequence that stops me writing a correction, and it is the strongest thing in the
app.

**What's wrong** is only that the page never states the actual fact. The caveat is
hypothetical where the reality is emphatic:

> "It can even be larger than the number of babies born in United Arab Emirates in 1985, so
> it's not a survival rate."

*Can even be.* For the UAE it **is**, by 5.9×. I verified the figures against the derived
files myself:

```
$ duckdb -c "select c.location_name, c.alive, b.births, c.alive/b.births
             from 'data/derived/cohorts.parquet' c
             join 'data/derived/births.parquet' b on b.iso3=c.iso3 and b.year=c.birth_year
             where c.iso3='ARE' and c.birth_year=1985 and c.ref_year=2026"
United Arab Emirates | 232060 | 39301 | 5.9046843591766120
```

The number is on disk, it matches `data/DATA.md` exactly, and SPEC.md §4.2 explicitly
permits showing it — *"if births-vs-survivors is shown at all — label it as net of
migration, with the ratio allowed to exceed 1."* The app is being more cautious than its own
spec requires, and the cost is that the single most interesting true fact about the UAE
cohort is only visible to the small minority who read the methods page. See feature
request 2.

---

### P2-4 — Seven significant figures on a projection

**Location:** page headline, `site/src/stats.js:99-101`.

`3,203,691`. `138,306,865`. `122,029,464`. These are medium-variant projections for a date
eight months in the future, and they are displayed to the individual person.

The page is not *lying* — it says "UN projection" in the same sentence, which is more than
most tools manage. But the digits and the label pull in opposite directions, and readers
believe digits. Practically, it means I round in my copy and the site does not, so my number
and the site's number visibly differ and I have to explain why in a footnote.

**What would satisfy me.** Lead with `3.2 million` and offer the exact figure on hover, in
the export, or in the methods table. The app already has `fmtCompact` (`stats.js:104-108`)
doing exactly this and apparently unused on the headline.

---

### P3 — Smaller things I noticed

- **`og:url`, `og:site_name` and `og:image:alt` are all absent** (`worker/src/index.js:156-163`;
  `grep -c 'og:url|og:site_name|og:image:alt'` returns 0). Missing `og:image:alt` means the
  preview image is unlabelled for screen readers in every surface that unfurls it, and our
  CMS requires alt text on every image we publish.
- **No way to take the number as text.** The only export is "Download image". I can fetch
  `/data/world-now.json` directly — it returns 200 and 18 KB, and I reproduced all four
  world 1991 headline figures from it — but the methods table *names* the files without
  linking them, so I only found this by guessing the path.
- **The passport contrast cannot be made to say anything inflammatory, which is good, and
  cannot be made to say anything useful to me, which is not.** The pool is hardcoded
  (`site/src/stats.js:51`, `['JPN','NGA','BRA','USA','IND','DEU']`, first three excluding
  yours) with no URL parameter. So the answer to "can I force a grim pairing by choosing
  badly" is no — I have no choice at all. The framing is size and age rank, never anything
  welfare-shaped, so it reads as informative rather than as a poverty ranking, and I would
  not hesitate to put it in the paper. But for a Brazil story I want Argentina, Portugal and
  Mexico, and I cannot have them.
- **The trajectory chart is the framing risk, not the headline.** "Your cohort over time"
  draws a dashed projection running from 2026 down toward the axis at 2090. Screenshot:
  `harness/shots/tereza-01-part1.png`. In context, with the solid/dashed legend, it is
  clearly a cohort-size projection. Cropped and posted alone it is a chart of when my
  generation dies out, and it is the most screenshottable secondary element on the page. Not
  my primary axis — but it is the thing a hostile reader would clip.

---

### What passed, and passed well

I want this on the record because it is unusual:

- **Full reproducibility, verified.** The methods page names a source file and a query for
  every displayed statistic. I ran them. All four world-1991 figures matched to the digit:

  | statistic | page | from `/data/world-now.json` |
  |---|---|---|
  | cohort alive | 122,029,464 | 122,029,464 |
  | births | 138,306,865 | 138,306,865 |
  | share still living | 88.2% | 88.2% |
  | percentile | 54.9% | 54.9% |

  I have never been able to do that with a public interactive on the first attempt.
- **The methods page is publishable as-is.** WPP revision named, medium variant named,
  reference year stated, sha256 for each raw file, build commit, the age-to-birth-year
  mapping admitted rather than hidden, the open-ended 100+ bucket explained, and an explicit
  section on what the app deliberately refuses to compute. The UAE is worked as the example.
  I would link to this page directly in a story.
- **URL state is clean.** `/?y=1991&c=BRA` round-trips, the year input rewrites the URL, and
  the back button restores both the URL and the rendered answer correctly. Fresh requests
  get correct per-URL meta tags.
- **The migration caveat is above the fold**, in prose, immediately under the number — not in
  a footer, not in a tooltip. This is the specific thing that would have made me write a
  correction and it is handled.
- **No signup, no cookie banner, no modal, no console errors.**

---

## Feature requests

### 1. A dated changelog on `/methods`, and an optional revision pin in the URL

**Why:** this is the single item that decides whether I link to the app or screenshot it and
walk away. Everything else on this list is an improvement; this one is a gate. Addresses P1-4.

**What:** a `## Changelog` section on `/methods` with an anchor, one row per rebuild —
date, WPP revision, build commit, and a one-line note on anything that moved. The facts
already exist (`data/DATA.md` carries the reference year and the spot values; the methods
page already prints commit `9609783` and the raw-file checksums); they just are not
addressable or historical. Then let me cite `retrieved 2026-08-22 · WPP 2024 · build 9609783`
and have a reader verify that string a year later.

The URL pin (`&rev=wpp2024` resolving to an archived slice) is the stronger version and I
would love it, but the derived slice is 528 KB, so keeping old revisions is cheap and this
is a "when you have time" upgrade. The changelog alone unblocks me.

### 2. "Born here that year" as a labelled country stat

**Why:** it turns the UAE from a hedge into the app's best story, and it is the number my
actual Brazil piece needs. Addresses P2-3.

**What:** show the country's births alongside the living cohort, explicitly labelled *net of
migration*, ratio allowed to exceed 1 — which is what SPEC.md §4.2 already sanctions and
what `data/DATA.md` documents on the `cohorts-now.parquet` `births` column. For the UAE:

> 232,060 residents were born in 1985. About 39,301 babies were born here that year — the
> difference is migration, not survival.

For Brazil it gives me the births series by year, which is the spine of a fertility-decline
story and is currently invisible: "Bigger cohorts" ranks birth years by who is *alive today*,
which is a different quantity and cannot carry a fertility argument. The data is already in
the pipeline (`births.parquet`, and the `births` column on the country slice) — I verified
the join returns 232,060 / 39,301 / 5.90 from the shipped derived files. Nothing needs
fetching.

The framing risk is real and the mitigation is the label plus never showing a ratio below 1
as a percentage — "62% of babies born in Brazil in 1991 are still resident there" is the
sentence that must never render, and it would if the same component were reused carelessly.

### 3. A cite-and-embed block under the answer

**Why:** every number I use has to arrive in the CMS with an attribution string and a source
link, and right now I would retype both by hand. Addresses P2-1, P2-4 and the P3 export gap.

**What:** three things behind one disclosure, under the headline:

- **A copy-able citation:** `Year Atlas, from UN World Population Prospects 2024 (medium
  variant), mid-2026 projection. Retrieved 2026-08-22. https://…/?y=1991&c=BRA`
- **The number as text**, exact and rounded, so I can paste `3,203,691` or `3.2 million`
  without reading digits off a screen.
- **The data behind this view**, as a link — `/data/world-now.json` already works and returns
  the row I need. Make the filenames in the methods table clickable, and add a per-query CSV
  or JSON link. Five columns, one row: the query, the figures, the reference year, the
  revision, the source file.

The embed side belongs here too. I did try to picture this in our CMS and there is no embed
path at all — no `<iframe>` snippet, no oEmbed. A 400×300 iframe of just the headline
sentence plus the source line, with the same `?y=&c=` parameters, is the difference between
"link out to a tool" and "run their graphic in our story". Note that an embed inherits every
card finding above: it must carry the reference year and the attribution, because in an
iframe there is no footer of ours to lean on.

### 4. One row of birth-year context: what the world looked like the year you were born

**Why:** it is the difference between a stat and a story, and `docs/DATA_EXPANSION.md` ranks
it #1 with the paperwork already done.

**What:** `DATA_EXPANSION.md` §1 is unambiguous — `WPP2024_Demographic_Indicators_Medium.csv.gz`
is already in `data/raw/` with its sha256 recorded, the licence is the same CC BY 3.0 IGO
already cleared for the shipped data, the build is one `COPY … TO` statement, and rounded to
six columns it lands at **146 KB for 18,249 rows**, lazy-loaded. Infant mortality, median
age, and total fertility rate in your birth year and country.

The document's own worked example is the pitch: for 1971, IMR was 12.8 per 1,000 in Japan,
18.8 in the USA, 101.8 in Brazil, 138.2 in India. That spread *is* a story, and for a 1991
Brazilian reader the TFR line lands directly on the fertility-decline argument I am writing.

Two constraints I would hold the team to, both already flagged in the document itself:
`LEx` stays out — §1's own framing warning is right that a period life-expectancy figure is
the most death-clock-adjacent number in the file and that readers will not make the
period-versus-cohort distinction unaided, and it must never be differenced against the
reader's age. And this is country-year data with no age dimension, so the copy has to say
"the year you were born", never "your cohort".

The two socioeconomic sources with real cohort granularity — Wittgenstein Centre for
schooling, NCD-RisC for height by birth year, the latter being the only dataset whose native
key is literally this app's input — are both blocked on an unanswered licence question, per
that document. I would send those two emails now, because the height-by-birth-cohort feature
is the one that would get this app written about.

---

## Answers to the persona's eight questions

1. **Is the headline defensible exactly as written?** On the page, yes — "3,203,691 people
   living in Brazil were born in 1991 — you're older than 48.9% of people there (mid-2026,
   UN projection)" carries its own qualifier, and screenshotting it alone publishes nothing
   false. On the download card, **no** — see P0-1, the country falls out of the sentence and
   the claim becomes false by a factor of 38.
2. **Does the URL encode state, and will it resolve identically after a data update?** State,
   yes — cleanly, with a correct back button. Identically, **no**, and nothing warns me. P1-4.
3. **Is the WPP revision and reference year discoverable, and is there a signal of when the
   data last changed?** Revision and reference year, yes, in the page footer and prominently
   on `/methods`, with the build commit and raw-file checksums. When it last changed, **no** —
   there is no changelog and no dated history.
4. **Passport contrast — informative or a poverty ranking? Can I force a grim pairing?**
   Informative: the metrics are cohort size and age rank, nothing welfare-shaped, and the
   caption states the migration caveat. I cannot force a grim pairing because I cannot choose
   at all — the pool is hardcoded to six countries with no URL parameter. Safe, and
   inflexible. P3.
5. **What does it show for the UAE — anomaly, error, or explained fact?** Correctly scoped
   fact, honestly hedged, but not actually stated. The headline says "people living in
   United Arab Emirates were born in 1985", which is right; the caveat directly beneath says
   the figure *can* exceed local births; the methods page explains the 5.9× in full. What is
   missing is the page saying that for the UAE it *does*. It never reads as impossible
   survival. P2-3.
6. **Does the pasted link preview correctly, with my number, legible at thumbnail?** The
   image, yes — I rendered `/og?y=1985&c=ARE` down to 360px and the number, place and rank
   line all held up (`harness/shots/og_y_1985_c_ARE_thumb.png`). The *text* of the preview,
   no: title and description use raw ISO codes and contain no number. And the image is
   missing its source line and reference year. P1-1, P2-1.
7. **Is there a clean way to cite this?** Better than most — a stable URL, a real source line
   in the footer, and a methods page naming the file and query for every stat, which I
   verified end to end. But there is no attribution string to copy, no per-query export, and
   the file names on the methods page are not links. Feature request 3.
8. **Which sentence survives being quoted out of context worst?** Two. "**older than 100% of
   the world**" on the 1926 card, because it is self-evidently impossible and taints every
   number beside it (P1-3). And the download card's "**3,203,691 people alive now were born
   in 1991**", because unlike the first one it is not obviously wrong — it is quietly,
   plausibly wrong, which is the kind that gets repeated (P0-1).

---

## Artifacts

Scripts and screenshots under
`/data/davsean/tmp/claude-1727698091/-home-davsean-Documents-git-my-year-atlas/017440f9-06de-466a-9041-28282980f5bd/scratchpad/harness/`:

| file | what |
|---|---|
| `tereza-01-self.js` | Brazil 1991, own run |
| `tereza-02-uae-methods.js` | UAE 1985 probe + full `/methods` capture |
| `tereza-03-world-share.js` | world view, URL state and back-button round-trip |
| `tereza-04-canvas.js` | downloads the client-side share card |
| `shots/tereza-01-part0.png` … `part2.png` | full Brazil page, split for reading |
| `shots/tereza-02-are1985-top.png` | UAE headline and caveat |
| `shots/tereza-04-canvas-view.png` | the P0 download card |
| `shots/og_*.png`, `og_*_thumb.png` | OG cards incl. 1926, Tuvalu, Andorra, and thumbnails |
