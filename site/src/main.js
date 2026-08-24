import './style.css';
import {
  findYear, cohortSizeNow, originalCohortSize, shareStillLiving,
  ageRankPercentile, cohortTrajectory, passportContrast, pickContrastCountries,
  biggerCohorts, medianBirthYear, climateDelta, migrationEpisode,
  oneInN, shareOfWorldCohort, cohortRank,
} from './stats.js';
import { renderDotField, trajectorySVG } from './dots.js';
import { shortName } from './names.js';
import { t, setLocale, LANGS, registerIso2, iso2Of } from './i18n/index.js';
import {
  interleavePeople, personUrl, eventsFor, namesInRange, decadeLabel, infoLink,
} from './sections.js';

const $ = (id) => document.getElementById(id);
const MIN_YEAR = 1926, MAX_YEAR = 2026, REF_YEAR = 2026, SMALL_POP = 90000;

// --- state: the URL is the state ---
const state = { year: null, iso3: null, lang: 'en' };

function parseURL() {
  const q = new URLSearchParams(location.search);
  const y = parseInt(q.get('y'), 10);
  state.year = y >= MIN_YEAR && y <= MAX_YEAR ? y : null;
  const c = (q.get('c') || '').toUpperCase();
  state.iso3 = /^[A-Z]{3}$/.test(c) ? c : null;
  const lang = q.get('lang');
  state.lang = LANGS.includes(lang) ? lang : 'en';
}

function pushURL() {
  const q = new URLSearchParams();
  if (state.year) q.set('y', state.year);
  if (state.iso3) q.set('c', state.iso3);
  if (state.lang !== 'en') q.set('lang', state.lang);
  const url = q.size ? `?${q}` : location.pathname;
  if (`?${q}` !== location.search) {
    history.pushState(null, '', url);
    // explicit SPA page_view — GA4's history-change auto-tracking is a
    // property-side toggle we don't control; this works regardless
    window.gtag?.('event', 'page_view', { page_location: location.href });
  }
  renderSwitcher(); // hrefs carry y/c — keep them current
}

// --- data: plain JSON on the critical path; parquet only for trajectories ---
let world = null;       // world-now.json rows
let locations = [];     // locations.json
const countryRows = {}; // iso3 → rows from /data/now/{ISO3}.json
const countryLoading = new Map();
let contrastRows = null;
let detailsWanted = false;

function loadCountry(iso3) {
  if (!countryLoading.has(iso3)) {
    countryLoading.set(iso3, fetch(`${import.meta.env.BASE_URL}data/now/${iso3}.json`).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    }).then((rows) => { countryRows[iso3] = rows; return rows; }));
  }
  return countryLoading.get(iso3);
}

// climate.json is tiny (~4KB) and off the critical path: fetched the first
// time the context panel renders, after first paint.
let climate = null, climatePromise;
function loadClimate() {
  climatePromise ??= fetch(import.meta.env.BASE_URL + 'data/climate.json')
    .then((r) => r.json()).then((rows) => { climate = rows; return rows; });
  return climatePromise;
}

// people.json (Wikidata, CC0): notable people per birth year, ranked by
// Wikipedia language-edition count. Off the critical path like climate.json.
let people = null, peoplePromise;
function loadPeople() {
  peoplePromise ??= fetch(import.meta.env.BASE_URL + 'data/people.json')
    .then((r) => r.json()).then((d) => { people = d; return d; })
    .catch(() => (people = {}));
  return peoplePromise;
}

async function renderPeople(y) {
  const el = $('people');
  if (!y) { el.hidden = true; el.innerHTML = ''; return; }
  if (!people) await loadPeople();
  if (y !== state.year) return; // year changed while loading
  const list = interleavePeople(people[y] ?? []);
  if (!list.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  // Harvested descriptors are English-only: for es/pt show names alone rather
  // than machine-translating them (a later harvest can add localized ones).
  // Links (Wikipedia, else Wikidata) apply in every language.
  const listHtml = list.map((p) =>
    `<a href="${esc(personUrl(p))}" target="_blank" rel="noopener"><strong>${esc(p[0])}</strong></a>${
      t.lang === 'en' && p[1] ? ` (${esc(shortDesc(p[1]))})` : ''}`).join(', ');
  el.innerHTML = `<h2>${t.peopleHeading} ${infoLink('people')}</h2>
    <p>${t.peopleBrought(y, listHtml)}</p>
    <p class="note">${t.peopleNote}</p>`;
}

// Trim a Wikidata description to its first clause, dropping office-term
// tails ("… from 2015 to 2025"). Never split on "and" — it cuts phrases
// like "Russian and Austrian operatic soprano" down to a nationality.
function shortDesc(d) {
  const first = d.split(/[;,] /)[0].replace(/\s+(from|since|between)\s+\d{4}.*$/, '').trim();
  return first.length > 44 ? `${first.slice(0, 44)}…` : first;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// events.json (#40): 3 one-line events per year, English-only for now.
// The file may not exist yet — absent file = section stays hidden.
let events = null, eventsPromise;
function loadEvents() {
  eventsPromise ??= fetch(import.meta.env.BASE_URL + 'data/events.json')
    .then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((d) => (events = d && typeof d === 'object' ? d : {}));
  return eventsPromise;
}

async function renderEvents(y) {
  const el = $('events');
  const hide = () => { el.hidden = true; el.innerHTML = ''; };
  if (!y || state.lang !== 'en') return hide();
  if (!events) await loadEvents();
  if (y !== state.year) return; // year changed while loading
  const list = eventsFor(events, y, state.lang);
  if (!list.length) return hide();
  el.hidden = false;
  el.innerHTML = `<h2>${t.eventsHeading}</h2>
    <ul>${list.map((e) => `<li>${esc(e.t)}
      <a href="https://en.wikipedia.org/wiki/${esc(e.w)}" target="_blank" rel="noopener">${t.eventsLink}</a></li>`).join('')}</ul>`;
}

// baby names (#19): index once, per-country file on demand, both cached.
let namesIndex = null, namesIndexPromise;
const namesByIso = {};
function loadNamesIndex() {
  namesIndexPromise ??= fetch(import.meta.env.BASE_URL + 'data/names/index.json')
    .then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((d) => (namesIndex = d ?? {}));
  return namesIndexPromise;
}

async function renderNames(y, iso3) {
  const el = $('names');
  const hide = () => { el.hidden = true; el.innerHTML = ''; };
  if (!y || !iso3) return hide();
  if (!namesIndex) await loadNamesIndex();
  if (y !== state.year || iso3 !== state.iso3) return;
  if (!namesInRange(namesIndex, iso3, y)) return hide();
  if (!namesByIso[iso3]) {
    try {
      namesByIso[iso3] = await fetch(`${import.meta.env.BASE_URL}data/names/${iso3}.json`)
        .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });
    } catch { return hide(); }
    if (y !== state.year || iso3 !== state.iso3) return;
  }
  const d = namesByIso[iso3];
  const yr = d.years?.[y];
  if (!yr?.f?.length || !yr?.m?.length) return hide();
  const yearPhrase = d.granularity === 'decade'
    ? t.namesDecadePhrase(decadeLabel(y)) : t.namesYearPhrase(y);
  el.hidden = false;
  // ponytail: license line drops its own trailing parenthetical to avoid
  // "(Public domain (US government work))" — attribution text stays intact.
  const license = (d.license ?? '').replace(/\s*\(.*\)\s*$/, '');
  el.innerHTML = `<h2>${t.namesHeading}</h2>
    <p>${t.namesLine(placeIn(), yearPhrase, esc(yr.f[0]), esc(yr.m[0]))}${
      d.basis === 'registration' ? ` <span class="reg-note">${t.namesRegNote}</span>` : ''}</p>
    <p class="note">${t.namesAlso(yr.f.slice(1, 4).map(esc), yr.m.slice(1, 4).map(esc))}</p>
    <p class="note">${t.namesAttribution(esc(d.source ?? ''), esc(d.url ?? ''), esc(license))}</p>`;
}

let contrastPromise;
function loadContrast() {
  contrastPromise ??= fetch(import.meta.env.BASE_URL + 'data/contrast.json').then((r) => r.json())
    .then((rows) => { contrastRows = rows; return rows; });
  return contrastPromise;
}

const locByIso = () => locations.find((l) => l.iso3 === state.iso3) || null;

function currentRows() {
  if (!state.iso3) return world;
  return countryRows[state.iso3] ?? null;
}

// --- rendering ---
function unName() {
  return locByIso()?.location_name
    ?? countryRows[state.iso3]?.[0]?.location_name
    ?? state.iso3;
}

const curIso2 = () => locByIso()?.iso2 ?? iso2Of(state.iso3);

function placeName() { // short display name
  return state.iso3 ? t.displayName(unName(), curIso2()) : t.theWorld;
}

function placeIn() { // "in the Philippines" / "en Filipinas" / "no Brasil"
  return state.iso3 ? t.placeIn(unName(), curIso2()) : t.inTheWorld;
}

function yearLabel(row, y) {
  return row?.open_ended ? t.orEarlier(y) : String(y);
}

function updateTitle() {
  document.title = state.year
    ? t.docTitle(state.year, state.iso3 ? placeName() : null)
    : t.docTitleDefault;
}

// gudrun FR-1: anchor the big number to a country people can picture.
// Only the ~60 largest countries qualify — the anchor has to be recognizable.
function populationAnchor(n) {
  if (!locations.length) return null;
  const pool = [...locations].sort((a, b) => b.total_alive - a.total_alive).slice(0, 60);
  const best = pool.reduce((a, b) =>
    (Math.abs(b.total_alive - n) < Math.abs(a.total_alive - n) ? b : a));
  if (Math.abs(best.total_alive - n) / n > 0.15) return null;
  return best;
}

function renderAnswer() {
  const el = $('answer');
  updateTitle();
  renderContext(currentRows(), state.year); // hides itself when there's nothing to say
  renderPeople(state.year); // async; hides itself when there's no list
  renderEvents(state.year); // async; en-only, hidden when events.json is absent
  renderNames(state.year, state.iso3); // async; needs country + coverage
  if (!state.year) {
    el.innerHTML = `<p class="invite">${t.invite}</p>`;
    $('share').hidden = true;
    $('details').hidden = true;
    // ilse P2-1: the empty state IS the product — the world field, no column lit
    if (world) {
      $('dotfield-section').hidden = false;
      renderDotField($('dotfield'), $('dotfield-caption'), world, null, t.theWorld);
      renderDotTable(world, t.theWorld);
    } else {
      $('dotfield-section').hidden = true;
    }
    return;
  }
  const rows = currentRows();
  if (!rows) { // country chosen, its slice still on its way
    el.innerHTML = `<p class="invite">${t.lookingUp}</p>`;
    return;
  }
  const y = state.year;
  const alive = cohortSizeNow(rows, y);
  const row = findYear(rows, y);
  if (alive == null || !row) {
    el.innerHTML = `<p class="invite">${t.noDataYear(y, placeIn())}</p>`;
    return;
  }
  const pct = ageRankPercentile(rows, y);
  const yl = yearLabel(row, y);
  const parts = [];
  // median birth year is a world stat, shown next to the rank line in both views
  let medianLine = '';
  if (world) {
    const mY = medianBirthYear(world);
    medianLine = t.medianLine(mY, Math.sign(y - mY));
  }
  parts.push(`<h2 class="visually-hidden">${t.hiddenHeading(yl, state.iso3 ? placeIn() : null)}</h2>`);
  // ⓘ links (#42) ride inside existing paragraphs, never the headline itself
  const withInfo = (html, anchor) => html.replace(/<\/p>\s*$/, ` ${infoLink(anchor)}</p>`);
  // headline + sentence as ONE element so the number never orphans (marcus P1-2)
  if (state.iso3) {
    parts.push(t.headlineCountry(alive, placeIn(), yl, t.fmtPct(pct)));
    if (medianLine) parts.push(withInfo(medianLine, 'rank'));
    parts.push(withInfo(t.migrationCaveat(placeIn(), y), 'migration'));
    if (Number(row.total_alive) < SMALL_POP) {
      parts.push(`<p class="note">${t.smallPop} ${infoLink('small-countries')}</p>`);
    }
    // country stat figures: quiet type-set row, no card chrome (dashboard-card
    // look is a §7 no-go). Values sans-semibold proportional; labels soft.
    const n = oneInN(rows, y);
    const ws = world ? shareOfWorldCohort(rows, world, y) : null;
    const rk = row.open_ended ? null : cohortRank(rows, y);
    const cm = medianBirthYear(rows);
    const figs = [
      n != null && { v: t.figOneInN(n), l: t.figOneInNLabel },
      ws != null && { v: t.figWorldShare(ws), l: t.figWorldShareLabel(yl) },
      rk && { v: t.figRank(rk.rank), l: t.figRankLabel(rk.of) },
      cm != null && { v: String(cm), l: t.figMedianLabel(unName(), curIso2()) },
    ].filter(Boolean);
    if (figs.length >= 3) {
      parts.push(`<div class="figrow" role="list">${figs.map((f) =>
        `<div class="fig" role="listitem"><span class="fig-v">${f.v}</span><span class="fig-l">${f.l}</span></div>`).join('')}</div>`);
    }
  } else {
    parts.push(t.headlineWorld(alive, yl, t.fmtPct(pct)));
    if (medianLine) parts.push(withInfo(medianLine, 'rank'));
    const anchor = populationAnchor(alive);
    if (anchor) parts.push(`<p class="note">${t.anchorLine(anchor.location_name, anchor.iso2)}</p>`);
    const births = originalCohortSize(rows, y);
    if (y >= 2025) {
      // an unfinished birth year has no completed count (folasade F5)
      if (births != null) parts.push(`<p class="note">${t.projectedBirths(births, y)}</p>`);
    } else if (births != null) {
      const share = shareStillLiving(rows, y);
      parts.push(`<p class="note">${t.survivalLine(alive, births, y, Math.round(share * 100))}</p>`);
    } else if (y < 1950 && !row.open_ended) {
      parts.push(`<p class="note">${t.noBirthsSeries(y)}</p>`);
    }
  }
  if (row.open_ended) {
    parts.push(`<p class="note">${t.openEndedNote(y)}</p>`);
  }
  el.innerHTML = parts.join('');

  $('share').hidden = false;
  $('dotfield-section').hidden = false;
  renderDotField($('dotfield'), $('dotfield-caption'), rows, y,
    state.iso3 ? placeName() : t.theWorld);
  renderDotTable(rows, state.iso3 ? placeName() : t.theWorld);

  $('details').hidden = false;
  renderBigger(rows, y);
  if (detailsWanted) renderDetails();
  if (trajWanted) renderTrajectory();
  if (mapWanted) renderMapSection();
}

// issue #9/#15: birth-year context panel. Quiet, factual, below the answer.
// Indicators are null before 1950 → the panel is simply absent (§9: no drama).
function renderContext(rows, y) {
  const el = $('context');
  const row = y ? findYear(rows ?? [], y) : null;
  if (!row || row.imr == null) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  const s = [];
  if (state.iso3) {
    const wimr = world ? findYear(world, y)?.imr : null;
    // ponytail: one world clause, only where the gap is big enough to read
    const cmp = wimr != null && Math.abs(row.imr - wimr) >= 10 ? Math.round(wimr) : null;
    s.push(t.imrCountry(placeIn(), y, Math.round(row.imr), cmp));
  } else {
    s.push(t.imrWorld(y, Math.round(row.imr)));
  }
  s.push(t.medianAgeLine(Math.round(row.median_age)));
  s.push(t.tfrLine(Number(row.tfr)));
  el.hidden = false;
  el.innerHTML = `<h2>${t.contextHeading(state.iso3 ? placeName() : null)} ${infoLink('context')}</h2>
    <p>${s.join(' ')} <span id="climate-line"></span></p>`;
  const setClimate = () => {
    const span = $('climate-line');
    if (!span || state.year !== y) return;
    const d = climateDelta(climate, y);
    if (d == null) return;
    span.textContent = Math.abs(d) < 0.15 ? t.climateSame(y) : t.climateDiff(y, d);
  };
  if (climate) setClimate();
  else loadClimate().then(setClimate);
}

// marcus FR-1: the dot field's data as a real table behind a disclosure
function renderDotTable(rows, place) {
  const details = $('dotfield-table');
  details.hidden = false;
  details.querySelector('summary').textContent = t.viewAsTable;
  const sorted = [...rows].sort((a, b) => Number(b.birth_year) - Number(a.birth_year));
  details.querySelector('div').innerHTML = `<table>
    <caption class="visually-hidden">${t.dotTableCaption(place)}</caption>
    <thead><tr><th scope="col">${t.thBornIn}</th><th scope="col" class="n">${t.thAliveNow}</th></tr></thead>
    <tbody>${sorted.map((r) => `<tr>
      <td>${r.open_ended ? t.orEarlier(Number(r.birth_year)) : Number(r.birth_year)}</td>
      <td class="n">${t.fmtPeople(r.alive)}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function renderBigger(rows, y) {
  const el = $('bigger');
  const mine = cohortSizeNow(rows, y);
  const bigger = biggerCohorts(rows, y).filter((b) => !findYear(rows, b.birth_year)?.open_ended);
  // company-first opener (gudrun P2-2): who shares your year, before who outnumbers it
  const worldAlive = state.iso3 && world ? cohortSizeNow(world, y) : null;
  const opener = state.iso3
    ? t.openerCountry(mine, placeIn(), worldAlive)
    : t.openerWorld(mine);
  if (bigger.length === 0) {
    el.innerHTML = `<h2>${t.companyHeading}</h2>
      <p>${opener} ${t.largestCohort(y, placeIn())}</p>`;
    return;
  }
  const top = bigger.slice(0, 5);
  // When the top cohorts all round to the same display value, a table of
  // identical rows reads as a bug — say it as one sentence instead.
  const displays = new Set(top.map((b) => t.fmtPeople(b.alive)));
  if (top.length >= 3 && displays.size === 1) {
    const years = top.map((b) => b.birth_year).sort();
    el.innerHTML = `<h2>${t.biggerHeading}</h2>
      <p>${opener} ${t.biggerBand(years[0], years.at(-1), [...displays][0], top[0].ratio)}</p>`;
    return;
  }
  el.innerHTML = `<h2>${t.biggerHeading}</h2>
    <p>${opener} ${t.biggerIntro}</p>
    <table>
      <thead><tr><th scope="col">${t.thBornIn}</th><th scope="col" class="n">${t.thAliveNow}</th><th scope="col" class="n">${t.thTimesYours}</th></tr></thead>
      <tbody>${top.map((b) => `<tr>
        <td>${b.birth_year}</td>
        <td class="n">${t.fmtPeople(b.alive)}</td>
        <td class="n">${t.ratioX(b.ratio)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
}

let detailsSeq = 0;
async function renderDetails() {
  detailsWanted = true;
  if (!state.year || !world) return;
  const seq = ++detailsSeq;
  const y = state.year;

  // passport contrast: fixed JSON pool + the user's own slice, no parquet
  const pool = await loadContrast();
  if (state.iso3 && !countryRows[state.iso3]) await loadCountry(state.iso3);
  if (seq !== detailsSeq) return; // state changed mid-flight
  const isoList = [...(state.iso3 ? [state.iso3] : []), ...pickContrastCountries(state.iso3)];
  const allRows = state.iso3 && !pool.some((r) => r.iso3 === state.iso3)
    ? [...pool, ...countryRows[state.iso3]] : pool;
  const contrast = passportContrast(allRows, y, isoList);
  $('contrast').innerHTML = `<h2>${t.contrastHeading}</h2>
    <p class="caption">${t.contrastCaption}</p>
    <table>
      <thead><tr><th scope="col">${t.thPlace}</th><th scope="col" class="n">${t.thBornAliveThere(y)}</th><th scope="col" class="n">${t.thOlderThan}</th></tr></thead>
      <tbody>${contrast.map((c) => `<tr${c.iso3 === state.iso3 ? ' class="you"' : ''}>
        <td>${t.displayName(c.location_name, iso2Of(c.iso3))}</td>
        <td class="n">${t.fmtPeople(c.alive)}</td>
        <td class="n">${t.fmtPct(c.percentile)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
}

let trajWanted = false;
let trajSeq = 0;
async function renderTrajectory() {
  trajWanted = true;
  if (!state.year || !world) return;
  const seq = ++trajSeq;
  const y = state.year;
  const iso = state.iso3 ?? 'WLD';
  const mod = await import('./parquet.js');
  const traj = await mod.loadTraj(iso);
  if (seq !== trajSeq) return;
  const trajEl = $('trajectory');
  // the chart ends at the reference year: history, not forecast (gudrun P0-1, §9)
  const arc = traj ? cohortTrajectory(traj, y).filter((d) => d.ref_year <= REF_YEAR) : [];
  if (arc.length < 2) { trajEl.innerHTML = ''; return; }
  const x0 = arc[0].ref_year;
  const heading = state.iso3 ? t.trajHeadingCountry(y) : t.trajHeadingWorld;
  const caption = state.iso3
    ? t.trajCaptionCountry(y, placeIn(), x0)
    : t.trajCaptionWorld(y, x0);
  // country view: aligned net-migration strip + data-driven callout, so step
  // changes in the line (Albania in the 1990s) explain themselves
  let migration = null, callout = '';
  const rows = currentRows();
  if (state.iso3 && rows) {
    migration = rows.filter((r) => r.net_mig != null)
      .map((r) => ({ year: r.birth_year, net: Number(r.net_mig) }));
    const ep = migrationEpisode(rows, rows[0].total_alive);
    if (ep) {
      callout = `<p class="note">${t.migCallout(ep.start, ep.end, Math.abs(ep.avg), unName(), curIso2(), ep.avg < 0)}</p>`;
    }
  }
  trajEl.innerHTML = `<h2>${heading} ${infoLink('migration-strip')}</h2>
    <p class="caption">${caption}</p>
    ${trajectorySVG(arc, y, migration)}
    ${callout}
    <details class="viz-table"><summary>${t.viewAsTable}</summary>
      <table>
        <thead><tr><th scope="col">${t.thYear}</th><th scope="col" class="n">${t.thBornYearAlive(y)}</th></tr></thead>
        <tbody>${arc.map((d) => `<tr><td>${d.ref_year}</td><td class="n">${t.fmtPeople(d.alive)}</td></tr>`).join('')}</tbody>
      </table>
    </details>`;
}

// choropleth (issue #37): geometry + parquet fetched once when the section
// first scrolls into view; year/country changes recolor from the cached parse
let mapWanted = false;
let mapSeq = 0;
async function renderMapSection() {
  mapWanted = true;
  if (!state.year || !world) return;
  const seq = ++mapSeq;
  const mod = await import('./map.js');
  const { geo, rows } = await mod.loadMapData();
  if (seq !== mapSeq || !state.year) return;
  mod.renderMap($('worldmap'), geo, rows, state.year,
    yearLabel(findYear(world, state.year), state.year), state.iso3);
}

async function render() {
  renderAnswer();
  if (state.iso3 && !countryRows[state.iso3]) {
    try {
      await loadCountry(state.iso3);
    } catch {
      $('answer').innerHTML = `<p class="invite">${t.noDataCountry(state.iso3)}</p>`;
      return;
    }
    renderAnswer(); // now with country rows
  }
}

// --- wiring ---
function syncInputs() {
  $('year').value = state.year ?? '';
  $('country').value = state.iso3 ? placeName() : '';
}

// Names a location answers to: UN name, English short name, localized name.
function locNames(l) {
  return [l.location_name, shortName(l.location_name), t.displayName(l.location_name, l.iso2)];
}

function findLocation(typed) {
  const s = typed.toLowerCase();
  return locations.find((l) => l.iso3.toLowerCase() === s
    || locNames(l).some((n) => n.toLowerCase() === s)) ?? null;
}

function suggestLocation(typed) {
  const s = typed.toLowerCase();
  const hit = locations.find((l) => locNames(l).some((n) => n.toLowerCase().includes(s)));
  return hit ? t.displayName(hit.location_name, hit.iso2) : null;
}

function setFieldError(input, errEl, msg) {
  if (msg) {
    input.setAttribute('aria-invalid', 'true');
    errEl.textContent = msg;
  } else {
    input.removeAttribute('aria-invalid');
    errEl.textContent = '';
  }
}

function onInput() {
  const raw = $('year').value.trim();
  const y = parseInt(raw, 10);
  const yearValid = y >= MIN_YEAR && y <= MAX_YEAR;

  if (raw && !yearValid) {
    // mid-edit: keep the previous answer on screen — no teardown, no scroll
    // jump (rhea P1-3, marcus P2-12). Only a complete wrong year is an error.
    setFieldError($('year'), $('year-error'),
      raw.length >= 4 ? t.errYearOutside(MIN_YEAR, MAX_YEAR) : '');
    return;
  }
  if (!raw && state.year && document.activeElement === $('year')) {
    // field emptied mid-edit (select-on-focus + first keystroke): hold the
    // previous answer; blur commits the empty state (rhea P1-3)
    setFieldError($('year'), $('year-error'), '');
    return;
  }
  setFieldError($('year'), $('year-error'), '');

  const typed = $('country').value.trim();
  let iso3 = null;
  if (typed) {
    const loc = findLocation(typed);
    if (!loc) {
      // explicit no-match: never silently show the world instead (marcus P0-1)
      const sug = suggestLocation(typed);
      setFieldError($('country'), $('country-error'), t.errNoCountry(typed, sug));
      return;
    }
    iso3 = loc.iso3;
  }
  setFieldError($('country'), $('country-error'), '');

  const year = yearValid ? y : null;
  if (year === state.year && iso3 === state.iso3) return;
  state.year = year;
  state.iso3 = iso3;
  pushURL();
  render();
}

function stepYear(delta) {
  const cur = parseInt($('year').value, 10);
  const next = Number.isFinite(cur)
    ? Math.min(MAX_YEAR, Math.max(MIN_YEAR, cur + delta))
    : (delta > 0 ? MIN_YEAR : MAX_YEAR);
  $('year').value = next;
  onInput();
}

// --- i18n chrome: static labels + the quiet footer switcher ---
function renderSwitcher() {
  const labels = { en: 'English', es: 'Español', pt: 'Português' };
  $('lang-switch').innerHTML = LANGS.map((l) => {
    if (l === state.lang) return `<span aria-current="true">${labels[l]}</span>`;
    const q = new URLSearchParams();
    if (state.year) q.set('y', state.year);
    if (state.iso3) q.set('c', state.iso3);
    if (l !== 'en') q.set('lang', l);
    return `<a href="${q.size ? `?${q}` : location.pathname}" hreflang="${l}" lang="${l}">${labels[l]}</a>`;
  }).join(' · ');
}

function applyStatic() {
  document.documentElement.lang = state.lang;
  document.querySelector('.tag').textContent = t.tagline;
  document.querySelector('label[for="year"]').textContent = t.yearFieldLabel;
  $('year-hint').textContent = t.yearHint;
  $('year-down').setAttribute('aria-label', t.prevYear);
  $('year-up').setAttribute('aria-label', t.nextYear);
  document.querySelector('label[for="country"]').innerHTML = t.countryLabelHtml;
  $('country').placeholder = t.countryPlaceholder;
  const shareLabel = navigator.canShare ? t.shareBtnShare : t.shareBtnDownload;
  $('share').setAttribute('aria-label', shareLabel);
  $('share').setAttribute('title', shareLabel);
  updateThemeLabel();
  $('gh-link').setAttribute('aria-label', t.footerGitHub);
  $('gh-link').setAttribute('title', t.footerGitHub);
  $('foot-projection').innerHTML = t.footerProjection;
  $('foot-source').innerHTML = t.footerSource;
  $('foot-github').firstElementChild.textContent = t.footerGitHub;
  renderSwitcher();
  updateTitle();
}

parseURL();
// Locale before first paint: en is already loaded; es/pt are tiny lazy chunks.
const localeReady = setLocale(state.lang).then(applyStatic);

$('year').addEventListener('input', onInput);
$('year').addEventListener('focus', (e) => e.target.select());
$('year').addEventListener('blur', () => {
  if (!$('year').value.trim() && state.year) {
    state.year = null;
    pushURL();
    render();
  }
});
$('year-down').addEventListener('click', () => stepYear(-1));
$('year-up').addEventListener('click', () => stepYear(1));
$('country').addEventListener('change', onInput);
$('controls').addEventListener('submit', (e) => e.preventDefault());

window.addEventListener('popstate', () => {
  parseURL();
  syncInputs();
  renderSwitcher();
  render();
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!state.year && world) renderAnswer();
    else if (state.year && currentRows()) renderAnswer();
  }, 150);
});

new IntersectionObserver((entries, obs) => {
  if (entries.some((e) => e.isIntersecting)) {
    obs.disconnect();
    renderDetails();
  }
}, { rootMargin: '200px' }).observe($('details'));

// the trajectory (the only parquet consumer) waits for its own slot on screen
new IntersectionObserver((entries, obs) => {
  if (entries.some((e) => e.isIntersecting)) {
    obs.disconnect();
    renderTrajectory();
  }
}).observe($('trajectory'));

new IntersectionObserver((entries, obs) => {
  if (entries.some((e) => e.isIntersecting)) {
    obs.disconnect();
    renderMapSection();
  }
}, { rootMargin: '200px' }).observe($('worldmap'));

$('share').addEventListener('click', async () => {
  const rows = currentRows();
  if (!rows || !state.year) return;
  const row = findYear(rows, state.year);
  const { shareImage } = await import('./share.js');
  const status = await shareImage({
    alive: cohortSizeNow(rows, state.year),
    pct: ageRankPercentile(rows, state.year),
    year: state.year,
    yearLabel: yearLabel(row, state.year),
    iso3: state.iso3,
    locationName: state.iso3 ? unName() : null,
    iso2: state.iso3 ? curIso2() : null,
  });
  $('share-status').textContent = status;
});

// first paint: world json only; locations fill the datalist when they arrive
fetch(import.meta.env.BASE_URL + 'data/world-now.json').then((r) => r.json()).then((rows) => {
  world = rows;
  localeReady.then(render);
});
fetch(import.meta.env.BASE_URL + 'data/locations.json').then((r) => r.json()).then((locs) => {
  locations = locs;
  registerIso2(locs);
  localeReady.then(() => {
    $('countries').innerHTML = locs
      .map((l) => `<option value="${t.displayName(l.location_name, l.iso2).replace(/"/g, '&quot;')}"></option>`)
      .join('');
    syncInputs();
    if (world) renderAnswer(); // pick up names + the population anchor line
  });
});
fetch(import.meta.env.BASE_URL + 'data/meta.json').then((r) => r.json()).then((m) => {
  localeReady.then(() => { $('vintage').textContent = t.vintageMeta(m); });
});
localeReady.then(syncInputs);

// --- theme toggle: system default, one click overrides, localStorage persists ---
function effectiveTheme() {
  return document.documentElement.dataset.theme
    ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function updateThemeLabel() {
  const next = effectiveTheme() === 'dark' ? t.themeToLight : t.themeToDark;
  const b = $('theme-toggle');
  b.setAttribute('aria-label', next);
  b.setAttribute('title', next);
}
$('theme-toggle').addEventListener('click', () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* private mode */ }
  updateThemeLabel();
  $('gh-link').setAttribute('aria-label', t.footerGitHub);
  $('gh-link').setAttribute('title', t.footerGitHub);
  renderAnswer(); // canvas dot field reads CSS vars at draw time
});
