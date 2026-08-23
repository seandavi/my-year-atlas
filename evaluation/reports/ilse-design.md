# Year Atlas — design critique

**Ilse Bergkamp**, Rotterdam · editorial & brand design · evaluated 22 Aug 2026
Safari-equivalent Chromium, 1440×900 / 768 / 393, both colour schemes, `/`, `/?y=1984&c=NLD`,
`/?y=1987&c=NLD`, `/?y=1987`, `/methods`, `/og?y=…`

---

## Verdict

I would show this in a talk — as the good example for **one slide** (the dot field is an honest
unit chart and I checked the arithmetic myself) and as the cautionary example for the **rest of
the talk**, because a product whose entire typographic identity is `system-ui` has not decided
what it looks like, and the share card and methods page were evidently built by three people who
never met.

---

## My own number, first

Netherlands, 1984. **222,758.** Then I counted the dots in the gold column: 45. Caption says one
dot is 5,000 people. 45 × 5,000 = 225,000 against a stated 222,758 — that is `round(44.55)`.
The mark is real. I want to say that before anything else, because it is the thing I most expect
to be a lie and it is not one.

Did the treatment make it land? Partly. The *shape* landed — seeing my column sit in the trough
between the two Dutch baby-boom humps, with 1970 towering over me, is a genuine visual argument
and it arrived without a word of copy. The *number* did not land. 222,758 at 104px is large. It
is not set. More on that below.

---

## Her eight questions

### 1. Does it look like anything?

No. It looks like the operating system.

The type stack for the entire site is `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
There is no display face. Not one webfont on the page. §7 asked, in plain words, for "a display
face with real character for the headline figure" — what shipped is the font the OS uses for its
own menus, pushed to weight 800.

This has a consequence beyond taste: **the product's appearance is not art-directed, it is
delegated.** On my Mac the headline is SF Pro Display Heavy — genuinely good, real optical sizing
at 104px. On Windows it is Segoe UI Bold with a synthesised 800. On Android, Roboto. Three
different brands. You cannot claim an identity that the visitor's OS chooses for you.

Nearest specific reference: a national statistics office — CBS StatLine, ONS, Our World in Data.
Single measure, sober sans, hairline tables, one accent, no chrome. That is respectable company.
But it reads as **default rather than deliberate**, because the one lever that would have made it
a decision — the face — was never pulled.

### 2. Is the dot field the right primitive, and are the marks honest?

Right primitive: **yes**, and it is better than what the spec described. The spec imagined a field
that "visibly thins as it moves right". What was built is a dot histogram of every birth year at
once, newest on the left, with your year picked out in gold. For the world (`/?y=1987`) it *is*
the thinning wedge the spec wanted, and it is lovely. For a country it becomes a rotated
population profile, and that is more informative — the 1984 Dutch cohort sitting in the dip
between two booms is a fact I did not know and could not have got from a headline.

Marks honest: **yes, verified.** `niceScale()` picks 1/2/2.5/5 × 10ᵏ so the tallest column lands
under 56 dots; `dots = round(alive / scale)`; the caption states the scale, the reference year and
the epistemic status; and the scale changes with the subject (5,000 for the Netherlands,
2,500,000 for the world). I counted pixels: 45 gold dots, 12.5 device-px pitch, exactly matching
the code. This is the one part of the project where craft and integrity are the same act, and it
should be the thing everything else is rebuilt around.

One asterisk, and it is small: `Math.max(1, ...)` floors every column at one dot. A birth year
with 800 surviving Dutch people gets the same mark as one with 4,000. At the far right tail that
overstates by up to 2.5×. Defensible — an empty column would read as missing data — but it should
either be stated or the tail should fade.

Does it reward a second look? Yes. That is rare and it is the strongest asset here.

### 3. How is the headline number set?

`system-ui` · `clamp(3rem, 13vw, 6.5rem)` → 104px desktop, 51px phone, 48px floor ·
weight 800 · tracking −3.12px (−0.03em) · `font-variant-numeric: tabular-nums` · ink #131f36.

The tracking is a competent optical correction. The fluid clamp is sensible. But the number is
**merely large**, and there are two reasons.

First, no display face — a UI font at its heaviest weight is a UI font, and at 104px you see every
compromise it made to be legible at 13px.

Second, and this is the more interesting error: **tabular figures are switched on in the
headline.** `.big { font-variant-numeric: tabular-nums }`. Tabular figures exist so that digits
stack in columns. In a single display number they do the opposite of a favour — every `1` is
forced into the same advance width as an `8`. Look at `118,520,004` on the world view: the two 1s
float in visible gaps and the number sags. The correct call is exactly inverted from what shipped:
**proportional (ideally titling) figures in the headline, tabular figures in the tables.**

Tables and captions: tabular-nums correctly applied (`table`, `.caption`, inputs). That part is right.

### 4. Is there a real type scale?

No. And the stylesheet knows it should be — line 2 of `style.css` reads:

> `Three type sizes, 8px spacing scale, tabular figures everywhere data appears.`

A stated intent, then violated. Measured on the answer page: **104 / 20 / 18 / 16 / 13.6 / 12.8** —
six sizes, not three. The shape of that set is the problem:

- a **5.2× canyon** between 104 and 20 with nothing in it, so the headline has no second voice
  to hand off to;
- then five near-identical steps — 20→18 is 1.11×, 18→16 is 1.125×, 16→13.6 is 1.18×, and
  **13.6→12.8 is 6%**, a distinction no reader will ever perceive that nonetheless costs a step.

Weights are 400 / 650 / 800. **650 is fiction** — `system-ui` on every mainstream platform has no
650 master, so it snaps to 700. Someone typed a number that felt precise and isn't.

Where it breaks down worst: **the methods page**, which is a separate stylesheet with eleven
distinct sizes including `12.3904px`, `14.784px` and `12.672px`. Those are the fingerprint of
`font-size: 0.88em` nested inside `0.88em`. No one chose 12.3904px. That scale was not decided,
it accumulated.

### 5. Spatial rhythm

The best-behaved system on the page, and I'll give credit. Spacing values are 8 / 16 / 24 / 40 /
48 / 64 — a clean 8px grid — with three strays (10, 12, 20). Measure is `min(672px, …)`, a good
line length. No horizontal overflow at any width from 1920 down to 320. Nothing clipped. It is
tidy.

The rhythm failure is at the scale above: **there is exactly one composition.** I dragged from
1920 to 320 and the layout never re-composes — same stack, fluidly scaled. At 1920 and at 1024 the
markup renders identically: a 672px column with 384px of dead grey each side on my MacBook. That
is a decision only if you defend it, and it costs you the one element that actually wants width
(see P2-3).

### 6. The three no-go clichés

| Cliché | Verdict |
|---|---|
| Cream-and-terracotta editorial | **Escaped** on the site (`#f5f6f8` cool grey). Methods page is `#fdfdfb` cream + Georgia — halfway there, saved only by the absence of terracotta. |
| Near-black + acid accent | **Escaped.** `#0c1322` is ink navy, not near-black; `#e8b64c` is gold, not acid. |
| Broadsheet with hairlines | **Closest hit.** Two tables with `rgba(ink,.14)` rules under every row, right-aligned figures, and letterspaced all-caps section labels. That is broadsheet furniture. It stops short of the cliché only because there is no serif display face — i.e. for the wrong reason. |

So: ink navy + gold does escape the second cliché. But be clear about what that is. It is a
**swerve, not a position.** The palette avoids three named traps and proposes nothing in their
place, and the reason the whole thing still feels unowned is the typeface, not the colour.

### 7. Copy

Written, not generated — and I mean that as a compliment. No "Discover", no "Explore", no "Dive
into", no em-dash-and-adjective filler. Sentence case throughout the prose. Plain verbs.

**Best line** (the dot-field caption):

> One dot is 5,000 people alive in mid-2026 (UN projection), by birth year — Netherlands. Newest
> years on the left.

One sentence carrying the unit, the scale, the reference year, the epistemic status, the subject
and the reading direction, with not one adjective. This is copy as design material and whoever
wrote it should write the rest.

Honourable mention for the best *idea* in the copy: "36 birth years outnumber yours in Netherlands
today." Plain, surprising, and it frames the cohort as company rather than loss.

**Worst line:**

> Cohort size and age rank vary a lot by country — migration included, so these are residents, not
> survival.

Three failures in one sentence. "Vary a lot" is vague on a page whose whole argument is precision.
"Migration included" is a parenthetical wearing a dash. And "these are residents, not survival"
contrasts a class of people with an abstract process — you cannot set *residents* against
*survival*, they are not the same kind of thing. It reads as a compressed engineering note that
was never rewritten.

Two more: **"born in Netherlands"** appears twice, missing the article. In Dutch or English it is
"the Netherlands". And **"50.0%"** — a decimal place on a percentile that is definitionally
approximate, which additionally reads like a rendering bug when it lands on exactly 50.0.

**Empty state:** it invites rather than explains — "Type the year you were born." — which is
precisely what §7 asked for, and it resists the urge to preamble. Credit given. But see P2-1: as a
*composition* it is a form floating above 520px of nothing.

### 8. Does the restraint hold?

Almost. Counting elements competing with the signature on the answer page: the trajectory line
chart, the passport table, the bigger-cohorts table, and the Download button — **four**.

**What I would delete first: the trajectory line chart.** It is a second visual idiom (line, on a
page whose argument is dots), it occupies 672×231 for information the dot field's shape already
implies, and it is the only element on the site that draws a cohort curving toward zero — running
to 2083, 57 years past the reference year. On a product whose stated frame is "cohort as company,
not death clock", that is the one graphic that argues the other way.

---

## Coherence: three products, one URL

This is the finding I would actually post.

| | Site | Share card (`/og`) | Methods |
|---|---|---|---|
| Face | `system-ui` | **Inter** 400/700 | Georgia + `system-ui` + mono |
| Background | `#f5f6f8` / `#0c1322` | `#101828` (dark only) | `#fdfdfb` / `#191a1c` |
| Accent | gold `#b07c1e` / `#e8b64c` | mint `#6ee7b7` + sky `#93c5fd` | blue `#1a5fb4` |
| Wordmark | navy + gold dot | sky blue, no dot | plain text link |
| Signature element | dot field | none | none |

**Not one shared colour value across the three.** Three different blacks, three different accents,
three different typefaces.

And the share card's palette has a name. `#93c5fd` is Tailwind blue-300. `#94a3b8` is slate-400.
`#cbd5e1` is slate-300. `#6ee7b7` is emerald-300. Those are exact, unmodified defaults. The card is
Inter plus the Tailwind swatch panel — which is four seconds from the thing I said I would close
the tab over. It is competently *laid out* as a card (big number, legible at thumbnail, correct
hierarchy, not the page shrunk — genuine credit there), and then dressed in someone else's kit.

The card also contradicts the page it came from:

| | Page | Card |
|---|---|---|
| World 1987 | 118,520,004 | 118,520,000 |
| Rank | older than 60.7% | older than 61% |
| Qualifier | "(mid-2026, UN projection)" | "alive **today**" |

The card is the artefact that travels. It is the only thing most people will ever see, and it is
the one that drops the caveat and rounds the number differently.

---

## Findings

### P0

**P0-1 · Whole product · No display face; identity is delegated to the OS.**
The complete type stack is `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Zero
webfonts. §7 explicitly required a display face with character for the headline and a tabular
face for the data. The headline renders as SF Pro Heavy / Segoe Bold / Roboto Black depending on
who is looking.
*Fix:* self-host one display face for the headline number and section labels only (two weights
max), keep `system-ui` for form UI and small print. Concretely: **GT Alpina** or **Söhne
Breit** if there's budget; free-with-character options that hold up at 104px and have real
tabular figures — **Newsreader** (display cut), **Instrument Sans**, or **Space Grotesk**. The
requirement is not "nicer", it is *decided and identical for every visitor*. ~40–70 KB WOFF2
subset to Latin + digits + comma.

**P0-2 · Site / `/og` / `/methods` · Three unrelated design systems.**
Zero shared tokens (table above). The share card is Inter + unmodified Tailwind
`blue-300`/`slate-400`/`emerald-300`; the methods page is Georgia + Adwaita link blue.
*Fix:* one token file — `--bg --ink --ink-soft --gold --line --card` — imported by all three
surfaces, including the Worker (it can inline the same six hex values). Kill `#6ee7b7` and
`#93c5fd` outright; the card's accent is `--gold`.

### P1

**P1-1 · Dot field, dark mode · The encoding logic changes between schemes.**
Light: `--dot-dim: rgba(19,31,54,.28)` (neutral ink) with a gold highlight → the user's column is
separated by **hue**. Dark: `--dot-dim: rgba(232,182,76,.3)` — gold at 30% — with a gold highlight
→ separated by **lightness only**. The dark field consequently reads khaki-brown against the navy
and the 1984 column is visibly weaker than its light-mode counterpart.
*Fix:* one line. Dark `--dot-dim: rgba(238,241,247,.28)`. Hue contrast preserved, field reads
neutral, highlight pops.

**P1-2 · Accent · Gold is 3.38:1 on light, 9.92:1 on dark — the two modes are not the same design.**
`#b07c1e` on `#f5f6f8` = **3.38:1**, below the 4.5:1 needed for the 16–18px text where it is
actually used ("50.0%", "1984", the highlighted Netherlands table row). `#e8b64c` on `#0c1322` =
**9.92:1**. The accent carrying the sentence's emotional payload is the weakest ink on the light
page and one of the strongest on the dark one.
*Fix:* darken the light-mode gold to **`#8a5f13`** → 5.21:1, passes AA, and reads richer against
the navy. Leave dark as is.

**P1-3 · Headline · Tabular figures used where they hurt.**
`.big { font-variant-numeric: tabular-nums }` forces every `1` into an `8`'s advance width.
Visible as gapping in `118,520,004` and `1,442,563`.
*Fix:* remove `tabular-nums` from `.big` (proportional or titling figures); keep it on `table`,
`.caption` and inputs, where it is correct.

**P1-4 · Type scale · Six sizes where the stylesheet claims three, with a 5.2× canyon.**
104 / 20 / 18 / 16 / 13.6 / 12.8 px. 13.6 vs 12.8 is a 6% difference — imperceptible, and it costs
a step. Weight `650` does not exist in `system-ui` and renders as 700. `style.css:2` documents an
intent the file does not keep.
*Fix:* commit to a ratio. A 1.25 scale from a 16px base gives 12.8 / 16 / 20 / 25 / 31 / … and a
separate display size for the headline. Collapse 13.6 and 12.8 into one. Drop 650 → 600 or 700.

**P1-5 · `/og` · Card disagrees with the page and drops the qualifier.**
118,520,004 vs 118,520,000; 60.7% vs 61%; "(mid-2026, UN projection)" vs "alive **today**".
*Fix:* one shared formatter for headline figure and rank string, used by page and Worker. Put the
reference year on the card — there is 101px of empty band at the bottom doing nothing.

### P2

**P2-1 · Empty state · A form floating in 520px of dead grey.**
At 1440×900 all content ends at y≈380; the remaining 58% of the viewport is empty background with
the footer stranded mid-page. The copy is right (it invites, it does not explain) but the
composition is leftover space, not composed space — and the signature element, the one thing that
makes this project itself, is entirely absent before you type.
*Fix:* render the dot field on load, world-scale, with no column highlighted, and let the entry
light one up. The empty state then *is* the product, and the first interaction has a payoff.

**P2-2 · Dot field on mobile · Stops being a unit chart.**
`dotR = clamp(1.2, colW*0.32, 2.6)`. At 393px, `colW ≈ 3.7px` → radius floors at 1.2, vertical
pitch 3.9px. The marks merge into a grey silhouette; you cannot count them, so "one dot is 5,000
people" becomes an unverifiable claim exactly where most users are.
*Fix:* pass a `maxDots` to `niceScale()` that scales with width — ~24 on phone instead of 56.
Fewer, bigger, countable dots at a coarser stated scale (one dot = 10,000). The caption already
prints whatever scale it is given, so this costs one argument.

**P2-3 · Wide viewports · The signature is capped at 672px on a 27-inch display.**
The layout is one fixed composition from 1920 to 320. A unit chart is the single element on this
page that converts extra width directly into more resolvable marks and better honesty.
*Fix:* let the canvas break the measure — `width: min(1040px, 100vw - 64px)` above 1100px, text
column stays at 672. One breakpoint, large payoff.

**P2-4 · Tables · Never restructure; three columns at 288px.**
At 393px "Born 1984, alive there" and "Older than" each wrap to two lines and the `1.19×` column
sits hard against the right margin. Nothing overflows — it is not broken — but it is the desktop
table narrowed, not a mobile table designed.
*Fix:* below 560px, stack each row as place / figure / rank on two lines, or drop the third column
(it is the least load-bearing).

**P2-5 · Copy · Three specific lines.**
(a) "so these are residents, not survival" — category error, rewrite as "…so these are people
living there now, not survivors of that birth year." (b) "born in Netherlands", twice — missing
article, should be "the Netherlands"; needs a general fix for `the` -countries (the Netherlands,
the Philippines, the United States, the UAE). (c) "50.0%" → "50%"; the decimal asserts precision
the percentile does not have and reads as a bug at exactly 50.0.

### P3

**P3-1 · Bigger cohorts table · The "vs yours" column prints `1.16×` four times running.**
On `/?y=1987` (world) rows 2014/2016/2017/2015 all render 1.16×. A column with no variance is not
a column.
*Fix:* one more significant figure, or replace the ratio with a 60px inline bar — which would also
put a second dot/mark idiom on the page instead of a third table.

**P3-2 · Section labels · A fourth type role, and the only all-caps on the site.**
`YOUR COHORT OVER TIME` / `SAME YEAR, DIFFERENT PASSPORT` / `BIGGER COHORTS` at 12.8px/650 with
wide tracking. Combined with the hairline tables this is the broadsheet vocabulary the spec named.
*Fix:* sentence case at the same size in `--ink-soft`, or set them in the new display face at
small size — either way, stop making them a separate register.

**P3-3 · Dot field · The one-dot floor overstates the smallest cohorts.**
`Math.max(1, Math.round(alive/scale))` gives a full mark to any column, so the oldest years are
overstated by up to 2.5× at the tail.
*Fix:* half-opacity for any column where `alive < scale/2`, or one clause in the caption.

**Counts — P0: 2 · P1: 5 · P2: 5 · P3: 3 (15 total).**

---

## Feature requests

**1. Buy the product a face — and spend it only on the number.**
This is the single change that moves Year Atlas from "well-made statistics page" to "a thing with
a name". One self-hosted display face, subset to digits, comma and uppercase, used for the
headline figure and the wordmark and *nothing else*. Everything else stays `system-ui` — that
restraint is the point, and it keeps the payload under 40 KB. Pair it with P1-3 (proportional
figures in the headline) and 222,758 will finally be *set* rather than large.

**2. Put the dot field on the share card.**
The card currently has 101px of dead band at the bottom and the entire right half below the
wordmark empty, and it carries no evidence of what this product actually is. Drop a miniature of
the user's own field into that space — the full silhouette in `--dot-dim`, their column in gold,
maybe 12 dots tall. It costs nothing at 1200×630, it is legible at thumbnail as a texture with one
bright stripe, it makes the card unmistakably *this* product in a feed, and it carries the
"company" idea visually rather than asking the rank line to do it. Rebuild the card on the site's
tokens at the same time (P0-2) and the coherence problem closes with one file.

**3. Make the empty state the dot field.**
Load the world field immediately, unhighlighted, with "Type the year you were born." over or
beside it. Typing a year lights a column. This kills the 520px void (P2-1), shows the signature
element to every first-time visitor before they commit anything, and turns entry into an
interaction with a visible consequence instead of a form submission. It also means the page has
something to show while the country Parquet loads.

**4. Replace the trajectory line chart with a second reading of the same dots.**
Delete the line chart (§8 above — wrong idiom, and it draws your cohort toward zero in 2083). If
the "your cohort over time" idea is worth keeping, express it in the established primitive: the
same column of dots at three moments — 1984, 2026, and one honest near horizon — dots fading
rather than a curve descending. Same information, one visual language instead of two, and the
motion of the metaphor stops pointing at the floor.

---

## What is genuinely good, precisely

- **The dot field's integrity.** `niceScale()` → nice 1/2/2.5/5 values, `round(alive/scale)`,
  scale restated in the caption *and* the aria-label, and it adapts per subject. I counted the
  dots and it holds. Most projects that look like this are lying; this one is not.
- **The caption sentence.** Quoted above. Best-written line in the project.
- **Copy discipline.** No filler verbs anywhere. Sentence case. Someone resisted every temptation
  to write marketing.
- **The 8px spacing grid**, kept on 6 of 9 values, with a sensible 672px measure.
- **Zero layout failure** from 1920 to 320 — no overflow, no clipping, no truncation. Boring and
  correct.
- **The share card's *layout***, as distinct from its dressing: real card hierarchy, big number,
  legible at thumbnail. It is not the page shrunk. Someone designed it — with the wrong kit.
