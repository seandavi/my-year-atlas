# Year Atlas — accessibility audit

**Auditor:** Marcus Feld, Chicago. Blind since my twenties, NVDA/VoiceOver, twenty-odd
years auditing for government and finance clients.
**Build:** `http://localhost:8787`, 2026-08-22.
**Method:** Playwright keyboard-only walk with per-stop focus capture; axe-core 4.x
injected on `/?y=1968`, `/?y=1968&c=DEU`, `/methods` in both colour schemes;
`emulateMedia` for `prefers-reduced-motion` and `colorScheme`; 320 CSS px reflow;
1.4.12 text-spacing override; ARIA snapshots of the live region and the full main
landmark; contrast ratios computed from the CSS custom properties rather than eyeballed.
Harness and screenshots:
`/data/davsean/tmp/claude-1727698091/-home-davsean-Documents-git-my-year-atlas/017440f9-06de-466a-9041-28282980f5bd/scratchpad/harness/`.

---

## Verdict

The keyboard and motion work is better than most of what I get paid to audit — five tab
stops to my own number, a visible gold ring at every one of them, one clean live-region
announcement, and an animation that genuinely stops when I ask it to — but the country
field silently swallows "United States" and leaves the world figure on screen looking
like an answer, and that one bug turns a good build into one I cannot recommend until
it is fixed.

---

## Using it on myself first

United States, 1968. I tabbed once, typed `1968`, and heard the whole thing in a single
announcement:

> 83,920,637 people alive right now were born in 1968 — you're older than 83.3% of
> everyone on Earth (mid-2026, UN projection). 121,825,890 people were born in 1968.
> 68.9% are still living.

That took me about eight seconds and no pointing device. I want to be clear how rare
that is. Most data toys I audit make me hunt for the result, or fire the live region on
every keystroke until I turn speech off. This one fired **once**, after the fourth digit,
and the sentence was complete. The "68.9% are still living" is stated plainly and not
dramatised, which I noticed and appreciated.

Then I tabbed to Country and typed `United States`, because that is what the country is
called. Nothing happened. No error, no announcement, no URL change. The page went on
reading `83,920,637` — the world figure — and if I had not been auditing I would have
written down eighty-four million as the American number and been wrong by a factor of
twenty. `USA` works. `United States of America` works. `United States` is silently
discarded. That is the finding that decides this audit.

For the record, the real answer once I found the magic string: 4,038,992 people living
in the United States of America were born in 1968, older than 73.3% of people there.
Fifty-five birth years outnumber mine, the largest being 1991. That is a good fact and
I would repeat it.

---

## Findings

Severity: **P0** blocks or yields wrong information · **P1** serious barrier ·
**P2** conformance failure with a workaround · **P3** polish.

### P0

**1. The country field discards unmatched input silently and leaves a wrong number on screen**
`input#country` on `/` · WCAG 2.2 **3.3.1 Error Identification (A)**, contributing
**3.3.3 Error Suggestion (AA)**

Evidence — measured, `probes2.js`:

| typed | resulting URL | what the answer said |
|---|---|---|
| `United States` | `?y=1968` (unchanged) | 83,920,637 — the **world** figure |
| `USA` | `?y=1968&c=USA` | 4,038,992 |
| `United States of America` | `?y=1968&c=USA` | 4,038,992 |

`main.js:196` matches on exact lowercased equality against `location_name` or `iso3`.
Anything else resolves to `null`, `onInput` sets `state.iso3 = null`, and the world
answer is re-rendered as if it were the requested one. The live region fires with a
plausible sentence, so there is no cue at all that my country was dropped. Sighted users
get the same bug but can see the field still says "United States" against a headline
that says "everyone on Earth"; I get nothing.

Smallest fix: when `#country` has a non-empty value that matches no location, set
`aria-invalid="true"`, and render into `#answer` — or into a dedicated
`role="status"` — the text `No country called "United States". Did you mean United
States of America?` A prefix/substring match against `location_name` gives you the
suggestion for free from the array you already have. Do not silently fall back to World.

### P1

**2. The headline number is a paragraph of its own, detached from the words that give it meaning**
`#answer p.big` · WCAG 2.2 **1.3.1 Info and Relationships (A)** — and more importantly a
plain usability failure

ARIA snapshot of `#answer`:

```
- paragraph: 83,920,637
- paragraph:
  - text: people alive right now were born in
  - strong: "1968"
  - text: — you're older than
  - strong: 83.3%
  - text: of everyone on Earth (mid-2026, UN projection).
```

Two paragraphs. The live region concatenates them on announce, which is why my first
pass sounded fine — but the moment I arrow through the page in browse mode, or use the
elements list, or land on the answer from a heading jump, I get `83,920,637` on its own.
Eight digits, no unit, no year, no qualifier. This is the "of people alive in 2026" being
a visually adjacent orphan that I ask about in question 6, and the answer is: it is an
orphan the instant I stop being lucky about the announcement path.

Smallest fix: make it one element. `<p class="big"><span class="n">83,920,637</span>
people alive right now were born in <strong>1968</strong>…</p>` with the visual size
applied to `.n`. One paragraph, one sentence, same visual design, and it survives every
navigation mode instead of only the live-region one.

**3. The dot field has a label describing its mechanics, not its finding, and no keyboard route to the values**
`canvas#dotfield` · WCAG 2.2 **1.1.1 Non-text Content (A)** — text alternative does not
serve an equivalent purpose

Current label (`dots.js:72`):

> Dot field of the world population by birth year; each dot is 2,500,000 people; the
> 1968 column is highlighted.

That tells me how the picture is drawn. It does not tell me one thing the picture says.
A sighted user looking at that canvas learns that the field is tallest around 1990,
that it thins steadily toward 1950, and roughly where 1968 sits on that slope. I learn
the dot denomination. The canvas has no focusable children, no `<table>` equivalent, and
nothing in the tab order — confirmed, the tab sequence goes year → country → Download
image → two footer links → body. There is no way for me to reach a single per-year value
other than the five rows in "Bigger cohorts".

I have been told for twenty years that this is the part that cannot be made accessible.
It can. The data is already an array of `{birth_year, alive}` in the client.

Smallest fix, two parts: (a) rewrite the label to state the finding — *"Population by
birth year, the world. The field is largest around 1990 at 138 million and thins to 12
million by 1930; 1968 sits at 84 million, about three-fifths of the peak."* (b) Put the
same array behind a `<details>`/`<summary>` "View as table" immediately after the canvas
— birth year, people alive now — reusing the table markup you already use correctly in
"Bigger cohorts". That is my single highest-value request and it is maybe thirty lines.

**4. No `h1`, and no heading anywhere on the answer**
`/` and `/?y=…` · axe **`page-has-heading-one`** (moderate, best-practice) · WCAG 2.2
**2.4.6 Headings and Labels (AA)**, **1.3.1 (A)**

Measured heading list on `/?y=1968` after everything renders:
`["H2: Your cohort over time", "H2: Same year, different passport", "H2: Bigger cohorts"]`.

On the empty state: zero headings. Zero. I navigate by headings first to build a model
of a page — that is the first thing I do on any site — and on arrival this page gives me
nothing to navigate. `Year Atlas` and `Everyone born in your year.` are both `<span>`
(`index.html:13-14`). Once I have an answer, my first `H` keypress lands on "Your cohort
over time", a chart, rather than on the number I came for. The `/methods` page, by
contrast, has a correct `h1` and a clean flat `h2` tree — somebody knew how to do this
and it was not applied to the main page.

Smallest fix: make the wordmark an `<h1>` (visual size unchanged) and give `#answer` an
`<h2>` — visually hidden is acceptable — reading `Your cohort` or `People born in 1968`.

**5. An out-of-range year is detected and refused, but the error is never conveyed**
`input#year` · WCAG 2.2 **3.3.1 Error Identification (A)**

Measured for `1800`, `3000`, `19`: `validity.valid === false` and a native
`validationMessage` exists ("Value must be greater than or equal to 1926."), but the form
never submits, so the message is never surfaced. `aria-invalid` is never set. The live
region announces `Type the year you were born.` — an instruction, not an error. The app
knows the input is wrong and tells me to do the thing I just did.

There is partial mitigation: `aria-describedby="year-hint"` carries "A year between 1926
and 2026", which I hear on focus. That is a *hint*, and 3.3.1 wants the error identified
when it occurs. A user who mistypes 1968 as 1868 hears the invite again and has no idea
why.

Smallest fix: on out-of-range input set `aria-invalid="true"` on `#year` and render
`That year is outside 1926–2026.` into the live region instead of the invite.

### P2

**6. Gold accent fails text contrast in light mode**
`#answer .lede strong`, `tr.you td` on `/?y=…` · axe **`color-contrast`** (serious,
`wcag2aa`, `wcag143`) · WCAG 2.2 **1.4.3 Contrast (Minimum) (AA)**

Measured **3.38:1** — `--gold: #b07c1e` on `--bg: #f5f6f8` at 18px/400. Needs 4.5:1.
Two nodes on `/?y=1968` (the birth year and the percentile — the two most important words
in the sentence), five on `/?y=1968&c=DEU` (adds the highlighted "you" row in the passport
table). Dark mode is fine at **9.92:1**, so this is light-mode only. The CSS comment on
`style.css:8` says "darkened for light-mode contrast" — it was darkened, just not enough.

Smallest fix: `--gold: #8a5f12` in the light block gives 5.4:1. Or keep the hue and set
`font-weight: 700` at 18.66px+ to qualify for the 3:1 large-text threshold — but 650
weight at 18px does not qualify, so today it is a straight fail.

**7. Dot-field dots are below the graphical-object threshold in both schemes**
`canvas#dotfield` · WCAG 2.2 **1.4.11 Non-text Contrast (AA)**

Computed against the page background after alpha compositing:

| scheme | colour | ratio | need |
|---|---|---|---|
| light | `--dot-dim: rgba(19,31,54,.28)` on `#f5f6f8` | **1.80:1** | 3:1 |
| dark | `--dot-dim: rgba(232,182,76,.30)` on `#0c1322` | **1.93:1** | 3:1 |
| both | `--gold` highlighted 1968 column | 3.38 / 9.92 | pass |

The highlighted column passes; the entire rest of the field — which is the actual
information — does not. I confirmed this visually in the light screenshot
(`shots/marcus-light-dotfield.png`): the field is a faint grey wash with one gold stripe.
With residual light perception I can see the gold column and essentially nothing else,
which means I can see *where I am* but not *what the shape is*.

Smallest fix: raise the dim alpha to about 0.55 light / 0.50 dark. That gets you past
3:1 and the field will still read as quiet against the accent column.

**8. Input borders are effectively invisible**
`#controls input` · WCAG 2.2 **1.4.11 Non-text Contrast (AA)**

`--line: rgba(19,31,54,.14)` composited over the white card measures **1.23:1** against
the page background in light mode, **1.63:1** in dark. The requirement for identifying a
user-interface component's boundary is 3:1. In the 320 px screenshot the two fields read
as faintly tinted rectangles; the country field at rest is distinguishable mostly by its
placeholder text.

Smallest fix: `--line: rgba(19,31,54,.36)` light / `rgba(238,241,247,.34)` dark, or give
`#controls input` its own dedicated border token so the table rules can stay hairline.

**9. Text-spacing override forces horizontal scrolling at 320 px**
`p.big` · WCAG 2.2 **1.4.12 Text Spacing (AA)**

Applying the 1.4.12 metrics (line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em,
paragraph spacing 2em) at a 320 px viewport takes `document.scrollWidth` from **320 → 338**.
Culprit measured directly: `p.big` at `clientWidth=288, scrollWidth=322`. The headline
number overflows its own container and drags the document with it. Same override also
squeezes `input#country` to `clientWidth=103` because the `auto 1fr` grid gives the
widened label first claim on the row.

Smallest fix: `.big { overflow-wrap: anywhere }` is the cheap one; better is to let the
`clamp()` floor go below `3rem` at small widths, or switch `#controls` to
`grid-template-columns: 1fr` under 26rem so the label sits above the field.

**10. Downloading the share image produces no status message**
`button#download` · WCAG 2.2 **4.1.3 Status Messages (AA)**

Works by keyboard — I focused it, pressed Enter, and got `year-atlas-1968-DEU.png`. But
`#answer` is byte-identical before and after, and there is no other live region on the
page. Nothing tells me the file was created or what it was called. Sighted users get the
browser's download shelf; I get silence and no way to know whether Enter did anything.

Smallest fix: a `role="status"` element that receives `Saved year-atlas-1968-USA.png.`
after the download resolves.

**11. The share card has no alt text and the share description omits the number**
`<meta property="og:image">` on `/?y=…` · WCAG 2.2 **1.1.1 (A)** at the receiving end

Measured on `/?y=1968&c=USA`: `og:title`, `og:description`, `og:image`, `og:image:width`,
`og:image:height`, `twitter:card`, `twitter:image` — and **no `og:image:alt`** (grep count
0). The description reads *"How many people alive today were born in 1968? See the cohort
in USA on Year Atlas."* — it poses the question and does not answer it.

This app's whole distribution mechanism is somebody posting their number as a picture.
When that lands in my timeline, the number is inside a PNG with no alternative, and the
text beside it is a teaser. I hear a question and an unlabelled image. Everyone else in
the thread is reacting to a figure I cannot reach without opening the link.

Smallest fix: emit `og:image:alt` and put the number in `og:description` — both strings
you already compute server-side for the card itself. `og:description` should be
`4,038,992 people living in the United States of America were born in 1968.`

**12. Correcting a typo re-announces the invite mid-edit**
`#answer[aria-live=polite]` · no criterion, usability

Measured announcement sequence when I backspace one digit off a valid year and retype:

```
1. "Type the year you were born."
2. "80,812,508 people alive right now were born in 1967 — …"
```

Typing forward from empty fires exactly once, which is the right behaviour and I want to
credit it. But any correction — and at 400 words per minute on a number field I make
corrections — drops me back to the instruction before giving me the new answer. It is not
a machine-gun; it is one unnecessary interruption per edit.

Smallest fix: in `renderAnswer`, when `state.year` goes from a valid year to `null` while
`#year` still has focus and a non-empty value, leave the previous answer in place rather
than restoring the invite.

### P3

**13.** `#year-hint` sits in the DOM *after* `#country` (`index.html:25`), so in browse
mode I read the year field's hint two elements past the field it describes, and I hear it
twice — once as the description on focus, once as loose text. Move it directly after
`#year`.

**14.** No way to copy the link to my result from the page. `Ctrl+L` works and the URL is
honest, so this is not a barrier — but the only in-page share affordance is "Download
image", which is the one that produces an artefact I cannot read. A "Copy link" button
would give me a share path with a text payload.

**15.** The trajectory SVG label (`dots.js:96`) reads *"People born in 1968 alive in each
year from 1968 to 2067, peaking at 111,114,020."* Better than the canvas — it has a real
number in it — but it still describes the axes and one extremum rather than the shape.
Say that the line is roughly flat to 2026 and then falls, and say that the part after
2026 is projection, which the sighted caption tells them and the label does not.

**16.** `#answer` has `aria-live="polite"` with no `aria-atomic` and no accessible name.
It works today because `innerHTML` replacement makes every child a new node, so all of
them get announced. It is one refactor away from announcing a fragment. Add
`aria-atomic="true"` and an `aria-label`.

**17.** A cold deep link to a country fires the live region twice — `Looking up your
country…` then the answer. I am recording it because you asked about spam, but I want to
be clear this is the *correct* choice: the wait is real and telling me it is happening is
better than silence. Leave it.

---

## What passes, and I am not damning it with faint praise

- **`prefers-reduced-motion` is honoured properly.** Under `reducedMotion: 'reduce'` the
  computed `animation-name` on `#dotfield` is `none` (vs `fade 0.5s` otherwise), and
  `document.getAnimations()` is empty in both states. The dot field is a static canvas
  render — the source comment at `dots.js:3` says "reduced-motion safe by design" and the
  measurement agrees. Nothing animates toward emptiness. This is the item I most expected
  to fail and it did not.
- **Focus visibility.** 2px solid gold, 2px offset, on every one of the five stops,
  verified by reading tight-cropped screenshots in both schemes rather than trusting the
  CSS. Ring contrast measured 3.38:1 against the page and 3.65:1 against the white input
  fill in light mode, 9.92:1 and 9.08:1 in dark — passes 1.4.11 and 2.4.11 in both. No
  1px hairlines, no low-contrast accent ring.
- **No focus traps, and a short tab order.** Five stops: year, country, Download image,
  two footer links, then out. No skip link, and none needed at that length.
- **Reflow at 320 px passes 1.4.10.** `scrollWidth === innerWidth === 320`, zero
  overflowing elements, `.big` renders at 48px on a single line and does not clip or wrap
  mid-number. Verified by screenshot, not just by measurement.
- **Table semantics are right.** Both tables have real `thead`/`th scope="col"`, and the
  ARIA snapshot shows correct row/columnheader/cell structure. I can navigate them
  cell-by-cell and hear the headers.
- **`/methods` is clean.** Zero axe violations in both colour schemes, correct `h1`, flat
  `h2` tree, `main` and `nav` landmarks, a back link. Somebody on this project knows how
  to build a page.
- **Native controls, not ARIA cosplay.** The year field is a real `spinbutton`, the
  country field is a real `combobox` backed by a 237-option `datalist`. No custom widget,
  no `div role="listbox"`, nothing to trap me. The matching logic is broken (finding 1)
  but the *control* is the right choice and I would keep it.

---

## The evaluation questions, answered

**1. How long until I know what this page is for?** About four seconds by tab order, and
never by headings. There are no headings on the empty state at all, so my normal
orientation pass returns nothing and I fall back to reading top-to-bottom. What I then
hear is good: "Year Atlas", "Everyone born in your year", "Year you were born" spinbutton
with "A year between 1926 and 2026" as its description, "Country (optional)" combobox,
and "Type the year you were born." The empty state invites an entry instead of explaining
itself, which is the right call. Fix the missing `h1` (finding 4) and this becomes
genuinely fast.

**2. Is the answer announced automatically, once, as a complete sentence?** Automatically:
yes. Once: yes when typing forward, twice when correcting a typo (finding 12), twice on a
cold country deep link (finding 17, defensible). As a complete sentence: only by luck.
The announcement concatenates two paragraphs into something that sounds like a sentence,
but the number is structurally separate from its unit, so any other navigation path hands
me eight bare digits (finding 2).

**3. What does the dot field expose, and can I reach the values?** It exposes one sentence
about dot denomination and column highlighting, and nothing about what the field shows.
There is no keyboard route to any underlying value — the canvas has no focusable children
and no table equivalent. This is the single biggest gap in the build (finding 3).

**4. Can I complete year → country → result → shareable link by keyboard, with visible
focus and no traps?** Focus: yes, visible at every stop, verified by screenshot. Traps:
none. Year → result: yes, in two keystrokes and about eight seconds. Country: **no** — not
reliably, because the field silently discards the country's common name and shows me the
world figure instead (finding 1). Shareable link: only via `Ctrl+L`; the in-page share
button produces a PNG whose contents I cannot read and whose completion is not announced
(findings 10, 11).

**5. Does it respect `prefers-reduced-motion`, and what replaces the meaning?** Yes,
correctly and verifiably. Nothing needs replacing, because motion was never carrying
meaning here — the only animation is a 0.5s opacity fade on the canvas, and the thinning
of the cohort is encoded in dot density, which is static. That is the right architecture
and I would hold it up as an example.

**6. Are the number, unit, and caveats programmatically associated?** Partially. The
caveat *is* attached — "(mid-2026, UN projection)" sits inside the same paragraph as the
percentile, and the "not a survival rate" note is inside the same live region, so I hear
all of it on announce. The **number** is the orphan, not the qualifier (finding 2). Fix
that one paragraph split and the answer to this question becomes an unqualified yes.

**7. Do the controls have accessible names, correct roles, and sensible error handling?**
Names and roles: yes, and natively — `spinbutton "Year you were born"` and
`combobox "Country (optional)"`, both correctly associated via `<label for>`. Error
handling: no, in both fields. An out-of-range year is detected and silently refused
(finding 5); an unmatched country is silently discarded *and replaced with a different
valid-looking answer* (finding 1). Neither sets `aria-invalid`. Neither is announced.
Neither is shown in red either, so this is not a colour-only problem — the error is simply
not reported to anyone.

**8. Which WCAG 2.2 criteria does this build fail, and what is the smallest fix for each?**

| SC | Level | Where | Smallest fix |
|---|---|---|---|
| 1.1.1 Non-text Content | A | `canvas#dotfield`; `og:image` | Finding-level alt + a `<details>` data table; emit `og:image:alt` |
| 1.3.1 Info and Relationships | A | `p.big` split from its sentence; no `h1` | One paragraph; promote the wordmark to `h1` |
| 3.3.1 Error Identification | A | `#country`, `#year` | Set `aria-invalid`, announce the error, never fall back to World |
| 1.4.3 Contrast (Minimum) | AA | `--gold` on light bg, 3.38:1 | `--gold: #8a5f12` in the light block |
| 1.4.11 Non-text Contrast | AA | dot field 1.80/1.93:1; input borders 1.23/1.63:1 | Raise `--dot-dim` alpha to ~0.55/0.50; raise `--line` to ~0.36/0.34 |
| 1.4.12 Text Spacing | AA | `p.big` at 320 px, 320→338 scrollWidth | `overflow-wrap: anywhere` on `.big` |
| 2.4.6 Headings and Labels | AA | no `h1`, no heading on the answer | `h1` on the wordmark, visually-hidden `h2` on `#answer` |
| 3.3.3 Error Suggestion | AA | `#country` | Substring match against `location_name` for a "did you mean" |
| 4.1.3 Status Messages | AA | download completion | `role="status"` confirming the filename |

Not failing, and I checked: 1.4.10 Reflow, 1.4.13, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11,
2.3.1, 2.3.3, 4.1.2.

---

## Feature requests

**1. "View as table" under the dot field and the trajectory chart.**
A `<details><summary>View as table</summary>` holding birth year and people-alive-now for
every year in the current view, and ref-year/alive for the trajectory. Same markup as
"Bigger cohorts", which you already got right. This is the request I care about most.
It costs you a collapsed disclosure that sighted users will ignore, and it converts the
signature visualisation from a picture I am told about into data I can read. It also
happens to be the thing Tereza will want when she needs to quote a number, and the thing
Folasade will want when she checks your arithmetic — so it is one control serving three
audiences. I do not accept "the chart is decorative, the caption covers it": the caption
tells me the dot denomination, and the denomination is not the finding.

**2. A high-contrast mode that is not just "dark mode".**
Honour `prefers-contrast: more` with a token set that pushes `--dot-dim` to full opacity,
`--line` to a visible rule, and `--gold` to something that clears 7:1 in both schemes.
Right now the design's restraint — hairline borders, 28% dots, a mid-tone accent — is
doing real aesthetic work and I would not ask you to abandon it for everyone. I am asking
for a switch. The tokens are already centralised in `:root` at `style.css:4-25`, so this
is a third block, not a redesign.

**3. Text-first sharing alongside the image.**
A "Copy result" button that puts the sentence *and* the permalink on the clipboard —
`4,038,992 people living in the United States of America were born in 1968 — Year Atlas,
https://…/?y=1968&c=USA` — plus `og:image:alt` and a real number in `og:description` so
the card carries its own meaning into other people's timelines. The current share loop
assumes the payload is a picture. Give it a text payload too and the loop starts working
for people who read with their ears, which includes everyone scrolling with images off on
a bad connection.

**4. Announce what changed, not the whole answer, on a country switch.**
When I already have a world figure and then pick a country, re-announcing the entire
block means hearing the projection caveat twice. A short `role="status"` update —
`United States of America: 4,038,992 born in 1968.` — with the full detail left on the
page for me to read at my own pace would be faster and less repetitive. This is a refinement
of something that already works, not a defect; file it behind the other three.

---

*Findings: 1 P0, 4 P1, 7 P2, 5 P3. Fix finding 1 and I will re-test the same day.*
