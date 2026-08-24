# How this was built — process log

Year Atlas was built in a single evening (2026-08-22, ~19:12–20:15 local and
continuing) by one orchestrating Claude session coordinating ~15 specialized
agents. This document records the method, not just the artifacts: how work was
split, how personas drove quality, how research fed the backlog, and how
licensing was treated as a first-class engineering constraint throughout.

## 1. The shape of the work

One orchestrator session owned: the data pipeline, git/GitHub state, merges,
integration verification, triage, and all final decisions. Everything else was
delegated to agents, in four waves:

| Wave | Agents | Isolation |
|---|---|---|
| Persona development | 1 research agent | shared workspace (owns `evaluation/`) |
| Parallel build | 3 agents: core SPA (M2–M4), OG worker (M5), community/docs (M6) | **separate git worktrees**, one branch each |
| Data-expansion research | 1 coordinator that fanned out ~4 sub-researchers (education; HMD/HFD; labour; names/height/religion/urbanization) | no repo writes except `docs/DATA_EXPANSION.md` |
| Evaluation | 6 persona agents, one per persona, fully parallel | read-only on the repo; each drove its own headless browser |
| Fix round 1 | 2 agents (site fixes, worker fixes) | separate worktrees again |

Rules that made the parallelism safe:

- **File-ownership contracts in every agent brief.** The SPA agent owned
  `site/` except `public/data` and `methods.html`; the worker agent owned
  `worker/`; the docs agent owned root community files + `methods.html`.
  No two agents could touch the same file, so merges were conflict-free.
- **Shared contracts written before spawning, not negotiated after.**
  `data/DATA.md` (data schema + demographic invariants) was written before the
  build wave; `evaluation/FIXSPEC.md` (number formatting, palette tokens,
  copy templates, country short-name mapping) before the fix wave — because
  round 1 proved that two agents independently implementing "format a number"
  will diverge (the page said 1,957,713 while the card said 1,960,000).
- **Agents commit on their branch, never push.** The orchestrator merges
  `--no-ff` into main after reading the agent's report, then deletes the
  worktree and branch.
- **Verification is never delegated to the same agent that built the thing.**
  After each merge the orchestrator re-ran tests and smoke-tested the
  integrated stack (e.g. the OG worker serving the real `site/dist`, not the
  stub the worker agent developed against).

## 2. Timeline (2026-08-22, local time)

| Time | Event |
|---|---|
| 19:12 | Session start. Repo contains only `SPEC.md`. |
| 19:22 | `git init`, spec committed, public repo created (`seandavi/my-year-atlas`), milestones M1–M6 + first issues filed. Persona-development agent launched. |
| 19:23 | Spec's UN download path 404s (site rebuilt as an SPA); real base found by probing: `/wpp/assets/Excel Files/…`. Recorded in `fetch.py` + ADR §1. |
| 19:24 | All three WPP files (~145 MB) downloaded in parallel, sha256s recorded. |
| 19:26–29 | CSV schemas inspected; `build.sql` written; **all assertions pass first run** (world alive ≤ births; 101 ages everywhere; world 2026 total 8,300,678,397). Spot checks: 1971 world cohort 91.07M alive of 123.74M born (73.6%); UAE 1985 ratio 5.9 (the migration example). M1 committed. |
| 19:30 | Three build agents launched in worktrees. ADR committed (5 spec deviations documented). |
| 19:27/19:33 | Six evaluator personas delivered and committed; data-expansion research launched (after maintainer asked for socioeconomic depth). |
| 19:35 | Docs/community branch merged (LICENSE, README, CONTRIBUTING, CoC, templates, methods.html). |
| 19:39 | OG worker branch merged (verified locally: PNG 1200×630, meta injection, edge cache). |
| 19:44 | Core SPA branch merged: 13/13 stat tests green, 11 KB gzip critical path, measured ~420 ms first answer on emulated slow 4G. |
| 19:45–48 | Integration verification on main: site build, worker serving real dist, OG PNG inspected visually. Two integration flaws noted for later (card accent ≠ site accent; "United States of America" ×3 on one card). **Cloudflare deploy blocked by the permission classifier — surfaced to maintainer rather than worked around.** |
| 19:50 | CI live and green (site tests every push; full data assertions on pipeline changes + weekly cron). |
| 19:52–20:02 | Research results integrated as they landed: base survey + 4 addenda committed; expansion issues #9–21 filed. |
| 19:53 | Six persona evaluators launched in parallel against the local full stack, each with its own Playwright browser. |
| 19:57–20:02 | All six evaluation reports delivered. |
| 20:05 | Data-layer fix for the worst finding (528 KB parquet on the shared-link path → per-country ~23 KB JSON slices) built, verified, committed. |
| 20:06 | Round-1 triage: 15 issues filed (#22–36: 5×P0, 4×P1 batches, 1×P2, 5 feature requests). |
| 20:07 | `FIXSPEC.md` committed; two fix agents launched in worktrees. Geospatial viz filed as #37. |

## 3. Personas: how they were used

Six personas were *developed by an agent* (with web research into how
demographic apps get received and criticized), then *executed as agents* —
each report is written in character with real evidence attached (axe-core
runs, measured contrast ratios, timed screenshots, DuckDB reproduction of
displayed numbers).

| Persona | Axis | Own test case | One-line verdict |
|---|---|---|---|
| Dr. Folasade Balogun, demographer, Nigeria 1979 | content accuracy, uncertainty honesty | `/?y=1979&c=NGA` | wouldn't trash it publicly; won't endorse until false precision goes |
| Tereza Muniz, data journalist, Brazil | sourcing chain, headline honesty, citability | UAE 1985 migration case | would cite the page; "don't let the share cards out of the building" |
| Marcus Feld, accessibility evaluator | keyboard, SR, contrast, motion | full keyboard path | better than most paid audits; one true P0 (silent wrong-country state) |
| Rhea Salvador, casual sharer, Philippines, phone | cold load, share loop, mobile | shared link `/?y=1996&c=PHL` on throttled 4G | **closes the tab** — 3–10 s to a number on the viral path |
| Ilse Bergkamp, design critic, Netherlands | typography, visual system, craft | all viewports, both schemes | dot field is honest and good; "it looks like the operating system" |
| Guðrún Jónsdóttir, framing test, Iceland 1954 | §9 death-clock risk, small country, Unicode | her own thinned cohort | sends it to her sister — once the trajectory chart stops drawing decline |

Design principles that paid off:

- Every persona **uses the app on themselves first**; the reaction to their own
  number is a finding before any professional critique starts.
- The set was built to disagree (demographer wants ranges, sharer wants speed,
  critic wants a display face) — collisions mark real design decisions.
- Personas double as **feature requestors**: each report ends with 2–4
  requests grounded in data we actually have or verified expansions, which
  went straight into the issue tracker (#32–36 and overlaps with #9).
- Triage discipline: six reports → deduplicated into 10 fix issues + 5 feature
  issues, each citing the persona report and file:line. Cross-persona
  agreement (e.g. demographer + framing-tester both hitting the trajectory
  chart) promoted severity.

## 4. Research passes

Data-expansion research ran as a coordinator agent fanning out per-domain
sub-researchers, all verifying against **live sources** (downloading and
inspecting actual files, reading license text verbatim) rather than memory.
Results: `docs/DATA_EXPANSION.md` — a base survey plus 4 addenda (education;
HMD/HFD; labour; names/height/religion/urbanization/culture).

Standing policies set by the maintainer during the run:

- **Partial coverage does not disqualify a source.** "Available for 85
  countries" is a shippable product state; the UI says so plainly. Recorded in
  the doc itself so future feature design inherits it.
- **Two hard criteria only**: license cleanliness (redistributable, commercial
  OK, no gate on the artifact we serve) and age/cohort granularity.

## 5. Issues and milestones

- **M1–M6** mirror the spec's milestones; build issues were filed against them
  and closed by merge commits (`Closes #N`), so the milestone view is the
  progress view. All six closed the same evening.
- **Label `expansion`** (#9–21, #32–37): the research-driven and
  persona-driven backlog, each issue carrying its license verdict inline.
- **Label `eval-round-1`** (#22–31): triaged findings, severity-prefixed, each
  citing report + location. Fix commits reference them.
- Issue templates (bug / feature / **data question**) came from the community
  wave; the data-question template asks for the URL with `y`/`c` params, the
  disputed number, and the comparison source.

## 6. Licensing as an engineering constraint

License handling was integrated at every layer, not bolted on:

- **Code:** MIT (`LICENSE`).
- **Source data:** UN WPP 2024, CC BY 3.0 IGO — attribution rendered in the
  app footer (a license obligation, not a courtesy), citation + sha256s in
  `data/SOURCES.md`, licensing matrix in the README covering the fact that
  **derived parquet/JSON artifacts inherit CC BY 3.0 IGO**.
- **Expansion research is license-first.** Every candidate source got a
  verdict from verbatim license text: clean (ILOSTAT CC BY 4.0, HMD/HFD CC BY
  4.0, WUP 2025 CC BY 3.0 IGO, Wikidata/MusicBrainz CC0, WB EdStats CC BY
  4.0), **blocked pending written permission** (Wittgenstein Centre — only
  signal is CC BY-NC on a companion paper; NCD-RisC height — "All Rights
  Reserved" footer; both have email-first issues filed: #11, #21), or
  **rejected outright** (UNESCO UIS and Spain INE for viral ShareAlike; Pew
  religion for no-redistribution; IPUMS; Netherlands name data for asserted
  database rights). Nothing ships on an assumed license.
- Per-country metadata obligations are anticipated (e.g. baby-name sources
  differ in license *and* in birth-year vs registration-year basis — both
  recorded per country before any build).

## 7. Integration and verification steps

1. Unit: 7 statistics as pure functions, `node --test`, asserted against five
   hand-verified spot values recorded in `data/DATA.md` (and independently
   re-derived by the demographer persona with DuckDB during evaluation).
2. Build-time: DuckDB assertions fail the build on demographic impossibilities
   (world alive > births, wrong age-row counts, implausible world total).
3. CI: site tests + build on every push; the full pipeline incl. assertions on
   `scripts/` changes and weekly (drift check against the UN's files).
4. Integrated smoke on every merge: worker serving the real built site —
   HTML meta injection, OG PNG magic bytes and visual inspection, data
   routes, methods redirect.
5. Evaluation harness: local `wrangler dev` + per-agent Playwright browsers
   (screenshots read by the evaluating agent, axe-core, CDP network
   throttling for the 4G cold-load measurements).

## 8. State as of this writing

- Live: repo, milestones all closed, 37 issues, CI green, methods page,
  evaluation reports committed under `evaluation/reports/`.
- In flight: two fix-wave agents (site + worker) implementing #22–31 and
  quick feature wins #32–34/#36.
- Pending: Cloudflare deploy (blocked on a permission gate the orchestrator
  deliberately did not work around; one-line command documented for the
  maintainer), then a re-check round with the two harshest personas, then the
  expansion backlog in license-cleanliness order.

## Day 2 addendum (2026-08-23)

Same method, second wave. Highlights beyond the artifact list:

- **Expansion round shipped**: context panel, median birth year (1994),
  climate line, Equal Earth choropleth (all geo math at build time),
  notable-people section, net-migration strip + data-driven callout under
  country trajectories (built after the maintainer spotted Albania's step
  changes — the explanation was already on disk in `NetMigrations`),
  baby names (9 national sources), i18n (es/pt, Intl-first), info links.
- **One real regression caught and root-caused**: DuckDB's partitioned
  writes shard nondeterministically, so a rebuild silently invalidated the
  trajectory shard manifest (186/238 stale). Fix deleted the mechanism:
  one deterministic file per country, no manifest.
- **License-first held**: Portugal names checked and rejected (no dataset);
  Brazil shipped via IBGE at decade granularity with the coarseness stated
  in copy; events built as Wikipedia-candidates + pageview-ranking +
  original text specifically to avoid CC BY-SA inheritance; Wikidata QIDs
  for the people blocklist verified individually after 6 of 7 first-guess
  IDs proved wrong.
- **Contract-first parallelism paid off again**: the events UI shipped
  before events.json existed (feature-detected), and the i18n agent's
  locale modules were reused verbatim by three later features.

## Day 3 note (2026-08-24)

Production shipped: `year-atlas.seandavis.net` (Workers custom domain — the
one command the permission gate had held back, run on the maintainer's
explicit direction), GA4 gated to the production hostname, static-fallback
OG card + auto-deployed Pages mirror for the preview tier. The events
pipeline landed after a stalled harvest was detected (69 quiet minutes) and
recovered by messaging the agent — the monitor-the-monitors lesson of the
project.
