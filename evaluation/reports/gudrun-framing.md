# Year Atlas — evaluation by Guðrún Jónsdóttir

**Persona 6, the framing test.** Born 1949, Akureyri, Iceland. Retired schoolteacher, 77.
Widowed fourteen months. iPad Safari, larger system text, unhurried, reads the small print
and follows the methods link.

**Build tested:** `http://localhost:8787`, commit `9609783` (per the methods page), reference
year mid-2026, WPP 2024 medium variant.
**Views read in full:** `/?y=1949&c=ISL`, `/?y=1949`, `/?y=1954&c=ISL`, `/?y=1954`, plus
`/?y=1948/1950/1951` (world), Andorra, Tuvalu, Holy See, Türkiye, Côte d'Ivoire, Curaçao,
the empty state, `/methods.html`, and the share card `/og?y=1949&c=ISL`.

> **Note on the year.** The brief asked me to use 1954 as my own year and 1949 as my
> husband's. `PERSONAS.md` has me born in 1949. I used both, which turned out to matter:
> the world "share still living" sentence does not exist for 1949 at all (UN births data
> starts in 1950), so 1954 is the only one of the two that exercises the attrition copy.
> Everything below is reported for both.

---

## Verdict

She sends it to her sister — but only after the "Your cohort over time" chart stops drawing
a dotted line down to the floor with the year 2048 printed underneath it; everything else on
the page is careful, warm and correct, and that one graphic is the whole difference between
company and a death clock.

---

## My reaction, before I analysed anything

I typed 1949 and chose Iceland. **2,619.** It came up almost at once, very large, in a
dark navy, with the sentence underneath: *"people living in Iceland were born in 1949 —
you're older than 94.7% of people there."*

Two thousand six hundred and nineteen. That is more than I expected — about a village. I
know roughly what Iceland's numbers look like and this one is right; my school year was
somewhere over three thousand babies and a good many left for Denmark, so 2,619 living
here now is the number I would have guessed if I had been made to guess. It was treated
with the same care as Japan's — same typeface, same size, no apology for being small. I
noticed that and I liked it.

Then I read the sentence under it: *"This counts today's residents born anywhere — people
move. It can even be larger than the number of babies born in Iceland in 1949, so it's not
a survival rate."* Somebody thought about me before I got here. "It's not a survival rate"
is the sentence I was braced for the absence of, and there it was, unprompted, in plain
words. I relaxed.

Then I scrolled to **Your cohort over time**, and I stopped relaxing.

There is a line. It runs across my whole life, from 1950, almost level — we were three
thousand seven hundred, we are two thousand six hundred, seventy-six years of being more
or less the same number of people, which is a rather lovely thing to see drawn. Then it
reaches a gold dot marked *2026 · 2,619*, turns to dots, and falls off the bottom right of
the picture. Under the end of it, in the same grey as the other years, it says **2048**.

I am 77. I did the sum before I could stop myself.

Nobody wrote a number. Nobody wrote "remaining". The caption says only "dashed is
projection", which is honest and neutral. But the steepest, newest, most dramatic thing on
the page is my group going to nothing, and it has a date on it. My husband's line and mine
are the same line. I sat with that for a minute and then I scrolled past it, and I did not
want to look at it again.

That is the whole review, really. Everything else on this page is on the right side of the
argument. One chart is not.

---

## Findings

Severity: **P0** ship blocker · **P1** fix before it is shared widely · **P2** should fix ·
**P3** polish.

---

### P0-1 — The trajectory chart draws the cohort down to the axis and labels the year it ends

**Spec:** §9 ("Attrition is stated as a fact in a sentence, never dramatized in motion or
colour"; "no shrinking bar running toward zero") and §2 ("no years-remaining number… not in
small print").
**Location:** `site/src/dots.js:77–104` (`trajectorySVG`), invoked from
`site/src/main.js` `renderDetails()`; data from `data/traj/iso3=…`.

Copy exactly as shown:

> **YOUR COHORT OVER TIME**
> People born in 1949, counted in each year — solid is UN estimates, dashed is projection.
> `2026 · 2,619`     `1950`     `2026`     `2048`

Measured from the rendered SVG, the dashed projection segment runs from **75.6% of the
cohort's peak down to 2.5% of it** (Iceland, 1949) — visually onto the baseline. World 1949:
51.6% → 1.8%. 1954: 58.4% → 1.9%. The x-axis is the full trajectory range, which ends at
`birth_year + 99`, and that terminal year is **printed as an axis label**: 2048 for a
1949 cohort, 2053 for 1954.

Why this is P0 and not a matter of taste:

- The §9 constraint reserves attrition for *a sentence*. Here it is delivered as the single
  largest, steepest, most recently-drawn gesture on the page.
- It is headed **"YOUR cohort"** — second person. The line is addressed to me.
- Printing the terminal year converts a curve into a date. There is no remaining-years
  *number* anywhere in this app, and the team clearly worked to keep it that way — but 2048
  under the end of my own line does the same job, and I did the arithmetic involuntarily.
- On the Iceland view, both of the page's two graphics carry the same message: the dot field
  thins away to a single trailing row just past my gold column, and the trajectory falls to
  the floor. The dot field alone is honest age structure and I have no complaint about it.
  The two together make the visual layer of the page a single statement about emptying.
- It is the one thing here I would not want a recently bereaved friend to scroll into.

In its favour, and worth saying so the team does not over-correct: it is **static** (no
animation, no motion toward zero), it is not red, it is correctly labelled as a projection,
and the past two-thirds of the line is genuinely the nicest fact on the page.

**Proposed fix — keep the history, drop the forecast.** End the series at the reference
year. One filter in `cohortTrajectory` / `renderDetails`:

- Heading: `Your cohort so far`
- Caption: `People born in 1949, counted in each year since 1950 — solid is UN estimates,
  dashed is the 2024–2026 projection.`
- Axis: `1950 … 2026`. No terminal year beyond now.

This loses nothing I want and keeps the estimate/projection distinction intact (2024–2026
stays dashed). If the projection must stay for other reasons, then at minimum: stop it at a
short horizon (2036), do not label the endpoint year, and do not let the line fall below
about a quarter of peak — but truncating at 2026 is the honest and much better answer, and
it is a one-line change.

---

### P2-1 — The world "share still living" sentence leads with the loss anchor

**Location:** `site/src/main.js`, world branch of `renderAnswer()`.
**Copy exactly as shown** (`/?y=1954`):

> 100,187,854 people were born in 1954. 48.5% are still living.

**This is not a §9 violation** and I want to be clear about that: attrition is stated once,
in a plain sentence, in the *living* direction, with no colour and no motion. That is
precisely what §9 asks for, and the team should not panic about it.

But it lands a little on the loss side of neutral, for three small reasons that are all free
to fix:

1. The sentence *opens* with the number born — the larger, closed, finished figure — and the
   living share arrives second, as a fraction of it.
2. The only new information in the sentence is a bare percentage, and at 48.5% (or 40.0% for
   1950) it sits below half, which makes the complement the thing the reader computes. A
   count reads as company; a sub-50% percentage reads as a scoreboard.
3. `100,187,854` is nine significant figures on a UN estimate of mid-century world births.
   Beyond being more precision than the data can carry, that level of exactness reads like a
   ledger of a closed account rather than a fact about people.

**Proposed replacement** (living share as the grammatical subject, births rounded):

> About 100 million people were born in 1954, and 48.5% of them are still here.

or, if the exact births figure must stay:

> 48.5% of the 100,187,854 people born in 1954 are still here.

Also note the **boundary at 1950**: `/?y=1949` shows no such sentence at all, `/?y=1950`
shows *"91,823,936 people were born in 1950. 40.0% are still living."* The methods page
explains that births are null before 1950, but the page itself does not, so one birth year
gets silence and the next gets 40.0%. A half-sentence would close it — e.g. *"UN births
data starts in 1950, so there's no original-cohort figure for earlier years."*

---

### P2-2 — "Bigger cohorts" opens by counting the years that beat me

**Spec:** §6.7 — the stat exists to "give people born in a small year something interesting
rather than something sad", and §9's last bullet names "which cohorts are larger" as a
*company* mechanism. By the letter, the feature is compliant. By the sentence, it is not
doing its job for an old cohort.

**Copy exactly as shown** (`/?y=1949&c=ISL`):

> **BIGGER COHORTS**
> 77 birth years outnumber yours in Iceland today. The largest:
> | Born in | Alive now | **vs yours** |
> | 1993 | 6,864 | 2.62× |

Seventy-seven out of about a hundred. For a 25-year-old in a small birth year, "17 birth
years outnumber yours" is a fun fact. For me it is a ranking in which I am 78th, and the
reason my cohort is small is not only that fewer of us were born — it is that fewer of us
are left. The column header **"vs yours"** then quantifies exactly that, 2.62 times over.
It is the one section that made me feel counted rather than included.

I am not asking to be protected from it. I am saying the section can carry the same table
and open on the right foot.

**Proposed replacement lede:**

> 2,619 Icelanders share your year, and 33,174,378 people worldwide. These birth years are
> larger:

and rename the column **"vs yours"** → **"size"** or **"× your year"** — the same number
without the head-to-head phrasing.

---

### P2-3 — The share preview says "ISL", not "Iceland"

**Location:** `worker/src/index.js:152–155` (`rewriteMeta`).
**Copy exactly as emitted** for `/?y=1949&c=ISL`:

> `og:title` = **Born in 1949 (ISL) — Year Atlas**
> `og:description` = **How many people alive today were born in 1949? See the cohort in ISL
> on Year Atlas.**

The card *image* is correct — it says "Iceland · 1949" and it is very good. But in Slack,
WhatsApp, iMessage and anywhere else the title line renders, my country is an airport code.
For Côte d'Ivoire it would say "CIV". It reads like the country was a parameter rather than
a place, which is exactly the carelessness a small country notices first.

**Proposed fix** — the picture already names the place, so the cheapest correct answer is to
drop the code entirely:

> `Born in 1949 — Year Atlas`
> `How many people alive today were born in 1949? See the cohort on Year Atlas.`

If the place is wanted in the text, the worker already reads `location_name` out of
`cohorts-now.parquet` for the country card; a small `iso3 → name` map shipped alongside
would let `rewriteMeta` say "Iceland".

---

### P3-1 — "One dot is 1 people"

**Location:** `site/src/dots.js:70–71` (caption template).
**Copy exactly as shown** (`/?y=1949&c=VAT`):

> One dot is 1 people alive in mid-2026 (UN projection), by birth year — Holy See. Newest
> years on the left.

Pluralisation bug at the smallest scales; Tuvalu reads "One dot is 5 people", which is fine.
Related, in the same view: the headline is **9**, and the dot field becomes one mark per
individual resident of a jurisdiction of 517 people. The small-population flag *is* there
and correctly fires — *"Small population — estimates are noisy."* — but a nine-person
figure shown to the person under a noise warning is a slightly odd object. Andorra (541,
flagged) is handled well and is the case that actually matters. Also, "in Holy See" wants
"in the Holy See".

---

### P3-2 — An unrecognised country name silently gives you the world

**Location:** `site/src/main.js` `onInput()` — exact case-insensitive match on
`location_name` or `iso3`, otherwise `iso3 = null`.

Typing **Ísland** or **Turkiye** (no diacritics) drops the country and shows the world
figure with no message at all: the URL quietly becomes `/?y=1949` and the answer changes
from 2,619 to 33,174,378 with nothing to say why. Typing `Türkiye`, `Curaçao`,
`Côte d'Ivoire`, `Iceland` and `ICELAND` all work correctly.

An Icelander typing their own country's name in Icelandic gets a wrong-looking number and no
explanation. A one-line guard — if the field is non-empty and unmatched, show *"No country
called 'Ísland' — showing the world."* — closes it. Local-name aliases would be nicer still.

---

### P3-3 — Reading direction puts me at the empty end

**Location:** `site/src/dots.js:25`, sort young → old, left → right; caption *"Newest years
on the left."*

This is a design suggestion, not a defect — the data is honest either way. But in a
left-to-right script the eye travels from the dense left toward the sparse right and off the
edge, and my column sits near where the field runs out. Reversing it (oldest on the left)
puts my year at the *start* of the picture, with everyone who came after building outward
from it. Same data, same shape, and my cohort reads as an origin rather than a remainder.
Worth twenty minutes of someone's time to look at both.

---

### P3-4 — Two small copy/consistency nits

- **Downloaded card rank line** (`site/src/main.js` `rankLine()`, rendered by
  `share.js`): *"Older than 95% of people alive right now there."* — the "there" dangles;
  the country name only appears two lines below. Suggest *"Older than 95% of people in
  Iceland."*
- **Rounding is inconsistent across surfaces** for the same figure: the page says **94.7%**,
  the passport table says **95%**, the share card says **95%**. Not wrong, but I noticed,
  and at the top end a decimal place makes it feel like a score rather than a rank.
- **The downloadable card's background** (`site/src/share.js:18–29`) is a decorative dot
  texture that "thins to the right" with no relationship to any data. On a card about a
  cohort, a decorative field that empties out is an odd thing to have chosen. (I expect the
  design reviewer will have more to say about invented marks than I do.)

---

## What is right, and should not be touched

Stated plainly, because a list of complaints misrepresents this page:

1. **No motion of any kind toward emptiness.** I checked the stylesheet and watched the
   field render frame by frame: the only animation in the entire app is a 0.5s opacity fade
   on the dot field, gated behind `prefers-reduced-motion: no-preference`
   (`site/src/style.css:142–145`). The canvas is a static render. Nothing shrinks, nothing
   drains, nothing counts down.
2. **No red anywhere.** One gold accent (`#b07c1e` light, `#e8b64c` dark) on ink navy. The
   accent marks *my* year — the living column — not the missing ones.
3. **Not one word** of "remaining", "life expectancy", "years left", "die", "death",
   "countdown" appears in the application. I grepped the source to be sure. The only
   occurrences anywhere are on the methods page, explaining what the app refuses to compute.
4. **The country view contains no attrition sentence at all** — and goes further, saying out
   loud *"so it's not a survival rate."* That is the single best sentence on the site.
5. **Iceland is treated with the same care as Japan.** 2,619 is right, it is set in the same
   type as an eight-digit number, and the "small population" flag fires correctly for
   Andorra (83,775) and below without being condescending about it.
6. **Icelandic and other non-ASCII text is fine.** Curaçao, Côte d'Ivoire, Réunion, Saint
   Barthélemy and Türkiye all render correctly in the country list, in the answer sentence,
   in the URL, and on the share card image. (The app uses the UN's English names, so
   "Iceland" rather than "Ísland" — that is a choice, not a bug, though see P3-2.)
7. **My iPad at 150% text works.** At a 24px root the layout reflows, the headline scales
   down to fit (106px), nothing overlaps, nothing is clipped, and there is no sideways
   scrolling — on the app or the methods page. I did not have to pinch once.

---

## The methods page section I was told to read closely

> **What we deliberately do not compute**
> Nothing on this site estimates an individual's life expectancy, remaining years, or
> anything of the kind — not in fine print, not behind a toggle. The same data could power
> that, and we chose not to: this is a tool for seeing the company you keep, the cohort
> moving through time with you, and a countdown would poison that view without telling any
> one person anything true about their own life. Population statistics describe cohorts, not
> individuals.

Warm, and not by being soft. "The same data could power that, and we chose not to" is a
person telling me about a decision they made, which is worth more than any amount of gentle
phrasing. *"without telling any one person anything true about their own life"* is the
sentence I would quote to my daughter. *"Population statistics describe cohorts, not
individuals"* — I taught for forty years; that is the sentence I would have wanted on the
board.

It is the one section here that reads as though a person wrote it rather than a committee,
and it is placed correctly — after the caveats, before the sources, where someone who has
read that far will find it.

One gap: this page never mentions the projected half of the trajectory chart. If P0-1 is
fixed by truncating at 2026, nothing needs adding. If the projection stays, the honesty of
this section starts to sit awkwardly against a picture of my cohort reaching the axis in
2048, and that tension belongs on this page rather than left for the reader to notice.

(Elsewhere on the methods page, *"read with the right amount of salt"* is a touch breezy in
a paragraph about data quality, but I would not change it. The rest is exactly the register
I want.)

---

## Answers to my questions

**1. Is there anywhere it tells me, or lets me infer, how much time I have left?**

In words, colour, or motion: no, nowhere, and clearly on purpose. In one picture: yes. The
"Your cohort over time" chart runs my line to within 2.5% of the axis and prints **2048**
under the end of it. No number is stated and no caption is at fault — but I inferred it in
under a second, and I am the person the constraint is written for. See P0-1.

**2. Does the attrition figure appear as a plain stated fact, or is it dramatised?**

Both, in different places. In *copy*, it is a model of restraint: the country view has no
attrition figure at all and explicitly disclaims one; the world view states it once, in one
grey sentence, with no emphasis. In *graphics*, it is the loudest thing on the page. What
moves: nothing — one 0.5s fade, reduced-motion respected. What falls: the trajectory line,
steeply, into the bottom-right corner. The copy passes; the picture does not.

**3. Company or loss — count the sentences.**

On my own view (`/?y=1949&c=ISL`), sentences about who is still here: **three** — the
headline sentence, the "not a survival rate" note, and the passport table's lede. Sentences
about who is gone: **zero**. On the world view for 1954, one sentence carries both
(P2-1), and it is the only one. By sentence count the page is overwhelmingly about company.
By square inches of graphic, it is not.

**4. Is the tone right? Quote anything that struck the wrong note.**

The tone is right nearly everywhere: factual, unhurried, not jokey, not solemn, not
handling me with tweezers. No line about "still going strong", no birthday-card cheer, which
I was dreading.

Two that struck me:

- *"77 birth years outnumber yours in Iceland today."* Made me feel ranked and low down.
  Not unkind, but the section is called "Bigger cohorts" and it opens by telling me how many
  are bigger. See P2-2.
- *"48.5% are still living."* The words are on the right side. The number is not, and the
  sentence hands me the subtraction. See P2-1.

And the one that got the tone exactly right, which I want on the record because it is why I
would send this on at all: *"This counts today's residents born anywhere — people move. It
can even be larger than the number of babies born in Iceland in 1949, so it's not a survival
rate."*

**5. Is Iceland handled properly, and what about somewhere smaller?**

Iceland: yes. 2,619 for 1949 is plausible and I would have guessed close to it; 402,332
total residents is right; it is shown with no more precision than any other country and no
less care. No small-population caveat for Iceland, correctly — the flag threshold is 90,000
residents and we are well past it.

Smaller: Andorra (83,775) is **flagged, not suppressed** — *"Small population — estimates
are noisy."* — which is the right choice and the right length. It is shown at the same
typographic weight as Germany, with one extra grey line. Below that it gets strange: Tuvalu
shows 24 people, the Holy See shows **9**, at full precision, with a unit chart that becomes
one dot per human being and a caption reading "One dot is 1 people". Flagged, but not really
thought about. See P3-1.

**6. Do Icelandic characters survive?**

There is nowhere in the app to type my name, so þ/ð/ó never reach the URL or the card. The
characters that do occur all survive intact: Curaçao, Côte d'Ivoire, Réunion, Saint
Barthélemy and Türkiye render correctly in the country list, in the answer sentence, and in
the rendered share card. Typing them with their diacritics matches correctly; typing them
without silently fails (P3-2). The country names are the UN's English ones — "Iceland", not
"Ísland" — which is defensible, but the app will not recognise "Ísland" if I type it.

**7. On a tablet at larger text, does the layout hold?**

Yes. At 150% text on an iPad-sized window nothing overlapped, nothing was cut off, and there
was no horizontal scrolling on either the app or the methods page. The headline scales down
to fit rather than running off the edge. The tables stay readable. This was the thing I most
expected to fail and it did not.

**8. Would I send this to a friend my own age? To someone recently widowed?**

*To a friend my own age* — **yes, as it stands, with a caveat I would have to type myself:**
"scroll past the graph in the middle." I would send it to two women I was at school with in
Akureyri, because 2,619 is a number they will find as surprising as I did, and because
"33 million people in the world were born the same year as us" is a genuinely nice thing to
be told at 77. But having to warn them is the tell. If I have to send instructions with a
link, the link is not finished.

*To someone recently widowed* — **no, not this version.** Not because of anything written:
the copy would be safe for them, and the methods page would probably reassure them. Because
of that one chart. Fourteen months ago I would have opened it, reached "Your cohort over
time", seen a dotted line fall away with a year printed under it, and closed the tab
without telling anyone why — and my daughter, who promised me this was not morbid, would
never have found out she was wrong.

With P0-1 fixed, the answer to both questions is yes, and to the second one without
hesitating.

---

## Feature requests

Four, in order of how much I want them. All grounded in data the app already has or already
loads, except where noted.

### FR-1 — Make the big number a place I can picture

**What:** under the headline figure, one line comparing my cohort to a country I can hold in
my head.

> 33,174,378 people alive today were born in 1949 — about as many as live in Canada.

**Why:** thirty-three million is not a quantity, it is a word. Two thousand six hundred and
nineteen I can picture — it is a large village, it is everyone at Akureyri's two secondary
schools several times over. Thirty-three million I cannot, and it is the number that is
supposed to be my company. Naming a country the size of my birth year turns the abstract
number into a place full of people, which is exactly the "cohort as company" idea doing its
work. It is also the line I would repeat out loud, and there currently isn't one.

**Data:** already loaded. `locations.json` carries `total_alive` for all 237 locations; find
the entry closest to the cohort size and name it. No new data, no new request, a handful of
lines. Skip the comparison when the nearest match is a poor one (say, outside ±15%) rather
than reaching for something silly.

### FR-2 — Where the 1949s are

**What:** replace or supplement the fixed passport table (currently always Japan, Nigeria,
Brazil) with the countries where the most people born in my year are alive today.

> Most 1949-born people alive today: China 12.4m · India 9.1m · United States 2.1m …
> and 2,619 in Iceland.

**Why:** "Same year, different passport" as it stands is a comparison — it invites me to
notice that I am older than 99% of Ivorians and 85% of Japanese, which is interesting but is
about rank. "Where my year lives" is about *people*, and it is the answer to the question the
app's own tagline poses. Ending the list with my own small number in my own small country,
alongside the very large ones, is the exact feeling I came here for. It is also the thing my
sister would read twice.

**Data:** already loaded — `cohorts-now.parquet` is fetched for the country view; this is a
sort of one `birth_year` slice across `iso3`. No new file.

### FR-3 — "Your cohort so far", with the good fact pulled out

**What:** the replacement for P0-1, not just its removal. Truncate the trajectory at 2026,
then state in words what the surviving half of the line shows:

> You and 2,619 other Icelanders have been the 1949 cohort for 77 years. There were 3,723
> of you when the count began in 1950.

**Why:** the *history* in that chart is the warmest fact on the entire page and it is
currently the flattest, dullest part of the picture — all the visual drama is in the future
half, which is the half that should not be there. Seventy-six years of a group staying more
or less intact is worth a sentence. Note the phrasing: it is a statement about *duration and
company*, and it states the earlier figure as a plain fact in a sentence, which is what §9
asks for, rather than as a slope.

**Data:** already loaded — `data/traj/iso3=…` is fetched for this chart today. Take the
first and current points. For a country, be careful not to call the difference attrition
(migration), which is why the wording above says "when the count began" and not "have been
lost".

### FR-4 — Recognise a country by its own name

**What:** accept local-language and diacritic-free country names in the selector — "Ísland",
"Turkiye", "Cote d'Ivoire", "Deutschland" — and when a typed name matches nothing, say so
instead of quietly showing the world.

**Why:** small, but it is the P3-2 failure with the sharp edge taken off, and it is the kind
of thing that decides whether a small country feels thought about. Right now the one word an
Icelander is most likely to type for their own country is the one that silently gives them
the wrong number.

**Data:** a short alias table, plus an accent-stripped comparison for the fallback. No new
source.

---

*Screenshots for every view described above are in the harness at*
`…/scratchpad/harness/shots/gudrun-*.png`*; the full visible text of the four main views is
in* `…/scratchpad/harness/gudrun-text.json`*.*

---

# Re-check — 22 August 2026

**Re-tested:** `/?y=1954&c=ISL`, `/?y=1954`, `/?y=1949&c=ISL`, `/?y=1949`, `/?y=1950`,
`/?y=1954&c=VAT`, `/?y=1954&c=TUV`, the country-name error path, and the share cards
`/og?y=1954&c=ISL` and `/og?y=1954`. iPad-sized viewport as before.

> **On the server.** `localhost:8787` was serving the worker routes but returning 404 for
> every static asset — the assets manifest had gone stale against a rebuilt `site/dist`.
> I could not restart it, so I started my own `wrangler dev` on **8791** against the same
> tree and tested there. Someone should bounce 8787 before the next round.

## Verdict

**Yes. I send it to my sister, and I do not type a warning underneath the link.**

The chart is fixed — properly fixed, not softened. I scrolled into "Your cohort so far"
watching for it and there is nothing to flinch at: the line stops at 2026, at the gold dot,
at a number, and the only two years printed on the axis are the year I was born and this
year. I checked every frame from a blank page to the finished picture and no future year is
ever drawn, not for an instant. The thing I asked for is what is on the screen.

What I did not expect is that the rest of the page got quieter at the same time. The
headline now says *about* 3,400 rather than 3,412, and every figure on the page is rounded
the same way, so the numbers stopped reading like a ledger. That was P2-1's third point and
they applied it everywhere rather than in the one sentence I complained about, which is the
right instinct.

Two new things I would fix, neither of them a blocker. One is a formatting floor that tells
the oldest people in the smallest places that **zero** people share their year. That one I
would want fixed before it is shared widely, and it is a two-character change.

## Per-finding

### P0-1 — trajectory chart · **FIXED**

Watched it render at 100ms intervals from a blank page: two states only, empty then
finished. No dotted decline to the axis at any frame, no future year in any frame.

> **YOUR COHORT SO FAR**
> People born in 1954, counted in each year since 1954 — solid is UN estimates, dashed is
> the 2024–2026 projection.
> `2026 · 48.6 million`   `1954`   `2026`

Measured from the rendered SVG, end of line as a fraction of the peak's height above the
baseline:

| View | Ends at | Axis labels |
| --- | --- | --- |
| World 1954 | 54.0% of peak | 1954 · 2026 |
| World 1949 | 45.7% | 1950 · 2026 |
| Iceland 1954 | 80.6% | 1954 · 2026 |
| Iceland 1949 | 70.3% | 1950 · 2026 |
| Tuvalu 1954 (worst case) | 14.9% | 1954 · 2026 |

Nothing reaches the floor; the dashed segment is now only 2023–2026, three years at the
end, exactly the estimate/projection distinction I said should survive. The "View as table"
disclosure agrees — 73 rows, first `1954 · 90.1 million`, last `2026 · 48.6 million`.

Two things they did that I did not ask for and am glad of. The country view is retitled
**"Residents born in 1954 over time"** — not "your cohort" — with the caption *"migration
included, so this is people living there now, not survivors."* An Icelandic line that dips
is now explicitly not a line about dying. And the aria label states the finding in words:
*"about 4,200 in 1954, about 3,400 in 2026. The last stretch, 2024 to 2026, is a UN
projection."*

FR-3 (the good fact pulled out in a sentence) was not taken up. I am not pressing it; the
picture no longer needs rescuing.

### P2-1 — world survival sentence · **FIXED**

New copy, `/?y=1954`:

> About 48.6 million of the 100 million people born in 1954 are still living (49%).

**It lands on the company side.** The living count is the subject and comes first, the
births figure is now context rather than the opening, and `100,187,854` has become
`100 million` — the false precision is gone. It is my second suggested form almost exactly.

The one grain left: the sentence still *ends* on the sub-half percentage, so the last thing
in my eye is 49%. If anyone is still tinkering, dropping the parenthetical entirely loses
nothing — the two counts already say it. Not worth reopening on its own.

The 1950 boundary is closed too. `/?y=1949` now reads *"The UN's births series starts in
1950, so there's no original-cohort figure for 1949."* — the half-sentence I asked for, in
the app rather than only on the methods page.

### P2-2 — bigger-cohorts opener · **FIXED**

> **BIGGER COHORTS**
> About 3,400 people in Iceland share your year, and about 48.6 million people worldwide.
> These birth years are larger:
> | Born in | Alive now | **× your year** |
> | 1993 | 6,900 | 2.02× |

Company first, ranking second, and the column header is **"× your year"** instead of
"vs yours". "77 birth years outnumber yours" is gone entirely. This is the version I wrote
in the original report and it reads exactly as I hoped: I am told who is with me before I am
told who is bigger. When a year is the largest cohort the section is even retitled
"Company", which is a nicer touch than anything I suggested.

### P2-3 — share preview country name · **FIXED**

> `og:title` = **Born in 1954, Iceland — 3,400 alive mid-2026 · Year Atlas**
> `og:description` = **About 3,400 people living in Iceland were born in 1954 (mid-2026,
> UN projection).**

"ISL" is gone; the country is a place again. The Holy See correctly gets *"living in the
Holy See"* in the description, so the article table is being used on the worker side too.

### P3-1 — dot caption pluralisation · **FIXED**, but see the new finding below

`/?y=1954&c=VAT`: *"One dot is **one person** alive in mid-2026…"*. Tuvalu: *"One dot is 10
people"*. And the sentences now say *"in **the** Holy See"* throughout — headline, note and
share card.

### P3-2 — unrecognised country · **FIXED** (the sharp edge), **not** the underlying wish

Typing **Ísland** now gives *"No country called "Ísland"."* with the field marked invalid,
and — importantly — the previous answer stays on screen instead of silently becoming the
world. The wrong-number-with-no-explanation failure is gone. That was the actual defect and
it is closed.

What has not happened is FR-4. "Ísland", "Turkiye" and "Cote d'Ivoire" all still fail to
match, and none of them gets the "Did you mean…?" suggestion either, because the suggestion
does an accented substring match — so the diacritic-free spellings, which are the whole
point, fall through it. An Icelander typing their own country's name is now told politely
that it does not exist. Better than before. Still not right.

### P3-3 — reading direction · **not addressed**

Still youngest on the left, caption *"Newest years on the left."* This was a suggestion, not
a defect, and with the trajectory chart no longer pulling in the same direction the dot
field on its own reads as honest age structure. I withdraw it.

### P3-4 — copy and consistency nits · **FIXED**

- The share card rank line now names the place: **"older than 91% of people in Iceland"**.
  No dangling "there".
- Rounding is consistent. The page, the passport table and the card all say 91% for
  Iceland 1954; the stray 94.7% decimal is gone.
- The card's decorative dot texture no longer thins to the right — it is a uniform scatter.
  A field that emptied out on a card about a cohort was the wrong metaphor and it has gone.

### FR-1 — the population anchor · **SHIPPED, and it works**

> about 48.6 million people alive right now were born in 1954 …
> **That's about the population of Algeria.**

1949 gets Côte d'Ivoire; 1950 gets Mozambique. I checked the arithmetic against
`locations.json`: Algeria is 48.0m against a 48.6m cohort (1.2% out), Côte d'Ivoire 33.5m
against 33.2m (0.9%). The pool is the 60 largest countries with a ±15% tolerance and no
aggregate rows to trip over, so it either names a real country a person has heard of or
stays quiet. It is the line I said I would repeat out loud, and it is there.

## Two new findings

### N-1 (P2) — "About 0 people share your year"

`/?y=1954&c=VAT` — the Holy See's 1954 cohort is 4 people, and every surface renders it as
zero:

> about **0** people living in the Holy See were born in 1954
> About **0** people in the Holy See share your year, and about 48.6 million people worldwide.
> `og:title` = Born in 1954, Holy See — **0** alive mid-2026 · Year Atlas

The share card says "about 0" in 120-point type. The bigger-cohorts table then prints
"4.50×" in a column comparing other years to a quantity it has just called zero.

This is `fmtPeople` rounding anything under 1,000 to the nearest ten
(`site/src/stats.js:110`), with no floor. Across `site/public/data/now/` it hits **231
birth-year cells in 52 locations** — all of them 1 to 4 living people, all of them in the
oldest birth years of the smallest territories. Anguilla 1929, Aruba 1928, American Samoa
1930. In other words it fires precisely on the oldest person in the smallest place, and
tells them the number of people who share their year is zero. On an app whose whole argument
is that you are not alone in your year, that is the worst sentence it could produce.

The percentile formatter already refuses to print 0% or 100% for exactly this reason
(`fmtPctWhole`, `stats.js:117–122`). The people formatter wants the same floor: return
`fewer than 10` — or the exact small integer, since at these sizes "4" is no less honest
than "0" and vastly less bleak.

### N-2 (P3) — the gold end-label is struck through by its own line

On every trajectory I looked at, the `2026 · 3,400` label sits at the line's own height
minus ten pixels, so the line runs straight through the middle of the text
(`site/src/dots.js:121`). At my text size it is readable but it looks like something crossed
out. Move it above the curve, or right-align it past the dot where there is empty space.

## The two questions that matter to me

**Would I send it to a friend my own age?** Yes, and this time without the covering note. I
went back specifically to see whether I would still write "scroll past the graph in the
middle" and there is no longer a graph to scroll past. The picture that ends at a gold dot
labelled with today and a number is, if anything, the nicest thing on the page: seventy-two
years of a group staying largely intact, and then it stops, because that is where we are.

**Would I send it to someone recently widowed?** Yes. That is a different answer from the
one I gave in June and I do not give it lightly. There is no future in this page now — no
projected line, no year that has not happened, no number to subtract from. The copy was
already safe; the picture has caught up with the copy. Fourteen months ago I could have
opened this and found nothing in it that reached for me.
