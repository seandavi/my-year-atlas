# Rhea Salvador — casual sharer, mobile, Philippines

**Persona:** #4 in `evaluation/PERSONAS.md`. 25, born 2001, nursing graduate, Cebu City.
Mid-range Android, Chrome from a Facebook link, mobile data on a jeepney, 23% battery,
one hand. Gives it about eight seconds.

**Rig.** Playwright, `devices['Pixel 7']` overridden to a 393×851 viewport, `hasTouch`,
CPU throttled 4×, network throttled over CDP `Network.emulateNetworkConditions`.
Two network profiles: **1.6 Mbps / 150 ms** ("good signal") and **400 kbps / 300 ms**
("jeepney"). Scripts and screenshots in
`/data/davsean/tmp/claude-1727698091/-home-davsean-Documents-git-my-year-atlas/017440f9-06de-466a-9041-28282980f5bd/scratchpad/harness/`
(`rhea-cold.js`, `rhea-ttn.js`, `rhea-flow.js`, `rhea-edge.js`, `rhea-taps.js`;
shots at `shots/rhea-*.png`). The server on :8787 is the Cloudflare worker fronting
the **production build** in `site/dist`, so these are not dev-server numbers.

---

## Verdict

**She closes it.** The friend's shared link — the only way she ever arrives — shows
"Looking up your country…" for **3.0 seconds on good signal and 10.2 seconds on real
jeepney data**, and by the time her number lands she is back in the feed; the world-only
link renders the same kind of number in **0.47 s**, so the app is fast right up until you
give it a country, which is exactly what a shared link does.

If she *does* wait, the number is genuinely good and she would post it — but the button
that makes a postable picture is 2.2 screens below the answer, past two tables and a
line chart of her cohort declining to zero, and it downloads a file instead of opening
the share sheet. So even the patient version of Rhea ends up screenshotting and cropping
it herself, which is the loop the spec was trying to remove.

---

## Her eight seconds, in order

**0–0.4 s.** Header, both input boxes already filled in ("1996", "Philippines"). First
contentful paint at 364 ms — the shell is genuinely fast and there is no cookie banner,
no modal, no signup, no unstyled flash. Good.

**0.4–3.0 s.** A single line where the answer should be: **"Looking up your country…"**,
set at 24px in grey. No spinner, no skeleton, no partial number. Just a sentence that sits
there. On the 400 kbps profile this sentence sits there for **ten seconds**
(`shots/rhea-spotty-2s.png` — that is what her screen looks like at the two-second mark,
the moment she decides it's broken).

**3.0 s.** The answer lands, and it lands well: `2,004,235`, then "people living in
Philippines were born in 1996 — you're older than **55.1%** of people there". On a
393×851 viewport the number starts at y=269 and the whole answer paragraph ends at
y=507 — **no scrolling required**, and the dot field's top edge is visible below it as a
hint there's more. Zero horizontal scroll (`scrollWidth` 393 = `innerWidth` 393). This
part of the design is right.

**Would she screenshot it?** Yes, the "older than 55% of people there" line. That is the
line she'd read out loud. For her own year it's better: born 2001, *"I'm 25 and I'm older
than 46% of the Philippines"* is a real groupchat message. The number alone (2.1 million)
is big but abstract; the percentile is the part that's about *her*.

**Does it feel like a death clock?** On the first screen, no — it's about company, and
the "it's not a survival rate" note is doing quiet work. But the very first thing below
her answer, once she scrolls, is **"Your cohort over time"**: a line that runs flat and
then slides to zero at 2095 (`shots/rhea-page-1.png`). She's 25. That reads as a graph of
when everyone she knows dies, and it is the second-most prominent element on the page.
She wouldn't say anything about it. She'd just not send the link. That is the invisible
failure mode the persona brief warns about.

---

## Findings

### P0

**1. A shared country link takes 3 s (good signal) / 10 s (real signal) to show a number.
`site/src/main.js:179-186` + `site/src/parquet.js`.**
Any URL with `&c=` blocks the answer on `loadCohorts()`, which fetches
`site/dist/data/cohorts-now.parquet` — **536,900 bytes, 412 KB gzipped on the wire** —
the entire 237-country × 101-year table, to read one row. It is preceded by the
`parquet-*.js` chunk (60,934 B, 19 KB gz), so nothing starts until that lands.

Measured, cold, from `Network.loadingFinished` totals:

| link | 1.6 Mbps / 150 ms | 400 kbps / 300 ms | wire bytes |
|---|---|---|---|
| `/?y=1996` (world) | **470 ms** | 926 ms | 36 KB |
| `/?y=1996&c=PHL` (country) | **2,956 ms** | **10,220 ms** | 449 KB |

Against a fair budget: 1 s on 1.6 Mbps is ~200 KB. The parquet alone is 2× that; the
whole country path is 2.2 s of pure transfer at line rate before any parsing. This is not
a dev-server artifact — assets are already minified and gzip is on
(`index.js` 5.0 KB gz, `index.css` 1.2 KB gz, `world-now.json` 3.4 KB gz). The world path
is comfortably inside budget. Only the country path blows it, and the country path is the
one every shared link uses.

*Fix:* serve the per-country slice the way `traj/` is already partitioned — one
`data/country/PHL.json` of ~101 rows is ~2 KB, answers in one round trip, and drops the
country path from 449 KB to about 40 KB. Keep the big parquet as the lazy load for the
"same year, different passport" table further down the page, which is below the fold
anyway. Same change removes the worker's need to pull 537 KB per OG card
(`worker/src/index.js:79-98`).

**2. The share action is 2.2 screens below the answer, and it downloads a file instead of
opening the share sheet. `site/index.html:41`, `site/src/share.js:71-80`.**
The "Download image" button sits at pageY 1878 on a 2127 px page — she must scroll past
the dot field, the trajectory chart, the passport table and the bigger-cohorts table to
find it. Nothing near the number suggests the app can make a picture at all.

Then `downloadShareImage()` synthesises an `<a download>` click. On Android Chrome that
drops a PNG in Downloads with a notification chime; she then has to leave the browser,
open Photos, find it, and attach it. `navigator.share` appears nowhere in the codebase.

*Fix:* put one button directly under the answer paragraph, and make it
`navigator.share({ files: [new File([blob], name, {type:'image/png'})], text, url })`
with the current download as the fallback when `navigator.canShare({files})` is false.
That is the difference between four app-switches and one tap, and it is the entire
distribution mechanism.

### P1

**3. Editing the year collapses the page and throws her scroll position to the top.
`site/src/main.js:194-207`, `211`.**
The `input` handler treats any out-of-range value as "no year", so typing `2001` over
`1996` renders the empty state on three of the four keystrokes:

```
typed "2"    → "Type the year you were born."   scrollHeight 851
typed "20"   → "Type the year you were born."   scrollHeight 851
typed "200"  → "Type the year you were born."   scrollHeight 851
typed "2001" → "2,137,292 people living in…"    scrollHeight 2127
```

Measured separately: scrolled to y=700, **one backspace** in the year field takes
`scrollHeight` 2127 → 851 and slams `scrollY` 700 → **0**. One-handed, on a moving
vehicle, the page jumps out from under her thumb every time she edits.

*Fix:* keep the previous answer on screen (dimmed, or simply untouched) while the typed
year is incomplete, instead of tearing down `#dotfield-section` and `#details`. Only show
the invite state when the field is genuinely empty.

**4. An unrecognised country silently becomes the world, with no message.
`site/src/main.js:196-206`.**
Typing `Pilipinas` — what she'd actually type — matches nothing, `iso3` falls to `null`,
and the app switches to the world without a word: the headline goes from 2,137,292 to
123,393,693 and the `c=` param quietly vanishes from the URL. She'd read the bigger number
as her country's and screenshot it. Same for any typo, any local-language name, any
"Philipines".

*Fix:* on no match, keep the previous country and say so inline ("No country called
'Pilipinas' — showing Philippines"), or don't clear until the field is empty. Aliases for
local-language names (`Pilipinas`, `Filipinas`) are a small JSON addition to
`locations.json`.

**5. The downloaded card and the link-preview card are two different designs with two
different numbers. `site/src/share.js` vs `worker/src/index.js:121-137`.**
Same query, `y=2001&c=PHL`:

| | downloaded PNG | `/og` preview |
|---|---|---|
| number | 2,137,292 | 2,140,000 |
| palette | navy + gold | navy + cornflower + mint |
| rank line | "Older than 46.3% of people alive right now there." | "older than 46% of people in Philippines" |
| country | grey, 30px, bottom-left | grey, 34px, top-left |

The downloaded one is worse of the two for her: **"…of people alive right now there."** —
"there" has no antecedent in the image, because the country is a small separate grey line
at the bottom. Posted standalone to a story, the sentence is broken. And the two numbers
being different for the same question is the kind of thing a friend calls out in the
replies.

*Fix:* one card renderer, one rounding rule. The worker's is better designed for
thumbnail scale — reuse it, and have the download button just fetch `/og?y=…&c=…`.
Fold the country into the sentence: "Older than 46% of people in the Philippines."

**6. The dot field is effectively invisible on a phone in daylight.
`site/src/style.css:10` (`--dot-dim: rgba(19,31,54,0.28)`), `site/src/dots.js:32`.**
At 393 px wide with 101 columns, `colW` is 3.9 px, so `dotR` clamps to 1.25 px — dots a
pixel across at ~28% opacity, which composites to roughly `#b6bac2` on `#f5f6f8`, about
**1.9:1**. On screenshots at full device pixel ratio it reads as a pale grey smudge
(`shots/rhea-own-2001.png`). Her own year — the only part that's *about her* — is a
single hairline column in `#b07c1e` that is easy to miss entirely.

*Fix:* darken `--dot-dim` toward 0.45–0.5 in light mode, and give the user's column real
weight on small screens — a wider gold band or a marker above it, not a one-pixel line.

### P2

**7. No way to swap years quickly. `site/index.html:20-21`.**
`type="number"` means no select-on-focus (`selectionStart` is `null`), and there is no
clear button, so changing 1996 → 2001 is: tap the field, four backspaces, four digits.
The persona brief's "hand the phone to a friend and they get their number in two taps"
is not achievable. Once the parquet is cached the *compute* is instant — second and third
queries resolved in **252 ms and 256 ms** — so the cost is all in the input.
*Fix:* `select()` on focus, or a small × in the field.

**8. "people living in Philippines". `site/src/main.js:85`, `88`, `worker/src/index.js:133`.**
Missing the definite article, three places, plus the share card. Filipinos notice this
immediately; it reads as written by someone who has never met the country.
*Fix:* an `article` field in `locations.json` for the handful of countries that take
"the" (Philippines, Netherlands, UK, USA, UAE, Bahamas, Gambia, Maldives, …).

**9. The country field gives no sign it is searchable. `site/index.html:23-24`.**
It's a `<input list>` with 237 `<option>`s. Android Chrome does render a filtering
dropdown, so it is not the 200-item scroll disaster the brief feared — but the label says
"Country (optional)", the placeholder says "World", and nothing says "start typing". On a
shared link the field arrives pre-filled with "Philippines", so there is no reason to
suspect it does anything at all.
*Fix:* placeholder "Type a country", and a hint line "237 countries".

**10. The first thing under her answer is her cohort declining to zero. `site/src/dots.js:77-104`.**
"Your cohort over time" plots to 2095, ending at the x-axis. Combined with the section
title using the second person, the takeaway for a 25-year-old is a timeline of her own
group disappearing. It is factually fine and emotionally the reason she doesn't forward it.
*Fix:* stop the visible arc at a horizon she'd care about (2050), or lead the details
section with "Bigger cohorts" — the genuinely fun one — and put the trajectory last.

### P3

**11. Everything that isn't the headline is 12.8–13.6 px.** Notes, dot-field caption,
footer and section headings all compute to 13.6 px or 12.8 px in `#4a5670` on `#f5f6f8`.
Legible indoors, marginal at arm's length in sunlight. The headline (51 px) and lede
(18 px) are fine, and nothing needed pinch-zoom.

**12. Full-precision `2,137,292` on the page, rounded `2,140,000` on the card.** She
wouldn't object to either, but they should agree — see finding 5.

**13. No reset path.** No "try another year" affordance, no way to hand the phone over
cleanly. Related to finding 7.

---

## Answers to her PERSONAS.md questions

1. **Time to a real number, from a shared link on mobile data?** 3.0 s on good signal,
   10.2 s on realistic signal. Nothing blocks it — no banner, modal, form or unstyled
   flash, which is a real credit — but "Looking up your country…" is a blank wall for
   longer than she waits. The world link is 0.47 s, so the shell is not the problem.
2. **Is the first screen obviously about me and inviting?** Yes. Two labelled boxes at the
   top, both pre-filled from the shared link, no explanatory paragraph. The tagline
   "Everyone born in your year." does its job in five words.
3. **Taps to a second year (mum's, 1972)?** Compute is instant once the parquet is cached
   (252 ms), but the input costs a tap plus eight key presses because the year field has
   no select-all and no clear. Not two taps.
4. **Country selector one-handed?** Usable — it's a filtering datalist, not a 237-row
   scroll — but it doesn't advertise itself, it only commits on blur (`change`, not
   `input`), and an unrecognised name silently switches the whole answer to the world.
5. **Legible in daylight without zooming?** The number and the lede, yes. Everything else
   is 13 px grey. No pinch-zoom needed, no landscape needed, no horizontal scroll.
6. **Does a picture with my number appear in the post preview?** Yes, and this is the
   best-built part of the app: `worker/src/index.js` rewrites `og:image` per URL, and
   `/og?y=2001&c=PHL` returns a real 1200×630 card with her number in 56 ms, 43 KB. It
   reads clearly at thumbnail size. The problem is not the preview, it's that the
   *in-app* share flow produces a different, worse card via a file download.
7. **One line I'd repeat out loud?** "I'm older than 46% of the Philippines." That's the
   one. The raw cohort size isn't it — 2.1 million doesn't mean anything to her — and
   "23 birth years outnumber yours" is the runner-up but it's buried at the bottom in a
   table with a "1.18×" column.
8. **Fun fact or death clock?** The first screen is a fun fact, and the "it's not a
   survival rate" note is well judged. Scroll once and it becomes a chart of her cohort
   going to zero. That's what tips it to homework.

**Methods page:** did not look. Never will.

---

## Feature requests

**1. Native share sheet, next to the number.**
One button under the answer, `navigator.share({files:[png], text, url})`, falling back to
today's download when `canShare({files})` is false. This is the single highest-leverage
change in the report: it turns four app-switches into one tap, it puts the app's own
caption in the post instead of whatever she types, and the card and the URL travel
together so the person who receives it lands on a working link. The card renderer already
exists in `worker/src/index.js` — fetch `/og?y=…&c=…` as the blob and skip the second
implementation in `site/src/share.js` entirely.

**2. Compare with the friend who sent it.**
The URL already fully encodes state (`?y=&c=`), so adding `&from=1994` costs nothing on
the data side. When present: "Ana sent you this. She's one of 2,213,401 born in 1994 —
209,166 more people than your year." Then the share button offers "send yours back". This
is the mechanic that makes the loop go round instead of terminating at Rhea; right now
every share is a fresh cold start with no memory of who sent it. It also gives her the
second thing to say in the groupchat, which is what actually drives a thread.

**3. Instant country answers (per-country data slice).**
Split `cohorts-now.parquet` into `data/country/<ISO3>.json` the way `data/traj/` is
already partitioned per `data/DATA.md`. ~101 rows per country ≈ 2 KB gzipped, one round
trip, no parquet reader on the critical path. Shared country links go from 449 KB to
about 40 KB and from 3 s to well under 1 s; the jeepney case goes from 10 s to about 1.5 s.
Keep the full parquet lazily for the passport-contrast table, which is below the fold.
The `/og` worker benefits too — it currently reads all 537 KB to render one card.

**4. One line about the year she was born in.**
`docs/DATA_EXPANSION.md` §1: the WPP Demographic Indicators file is already downloaded,
already CC BY 3.0 IGO, and rounds to 146 KB as Parquet. It gives, per country per year,
median age, total fertility rate and infant mortality. One extra sentence — "In 2001 the
average family in the Philippines had 3.7 children, and the country's median age was 20"
— is the kind of thing she'd screenshot alongside her number, because it's about the
world she was born into rather than about the size of a cohort. Per that document's own
§9 warning, do **not** surface `LEx`: a life-expectancy figure next to her birth year is
the one number that would make her quietly close the tab and not forward it.
