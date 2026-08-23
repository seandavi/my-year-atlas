import './style.css';
import {
  findYear, cohortSizeNow, originalCohortSize, shareStillLiving,
  ageRankPercentile, cohortTrajectory, passportContrast, pickContrastCountries,
  biggerCohorts, fmtPeople, fmtPctWhole, medianBirthYear, climateDelta,
  migrationEpisode,
} from './stats.js';
import { renderDotField, trajectorySVG } from './dots.js';
import { shortName, inSentence } from './names.js';

const $ = (id) => document.getElementById(id);
const MIN_YEAR = 1926, MAX_YEAR = 2026, REF_YEAR = 2026, SMALL_POP = 90000;

// --- state: the URL is the state ---
const state = { year: null, iso3: null };

function parseURL() {
  const q = new URLSearchParams(location.search);
  const y = parseInt(q.get('y'), 10);
  state.year = y >= MIN_YEAR && y <= MAX_YEAR ? y : null;
  const c = (q.get('c') || '').toUpperCase();
  state.iso3 = /^[A-Z]{3}$/.test(c) ? c : null;
}

function pushURL() {
  const q = new URLSearchParams();
  if (state.year) q.set('y', state.year);
  if (state.iso3) q.set('c', state.iso3);
  const url = q.size ? `?${q}` : location.pathname;
  if (`?${q}` !== location.search) history.pushState(null, '', url);
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
  const list = (people[y] ?? []).slice(0, 6);
  if (!list.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<h2>In your company</h2>
    <p>${y} also brought ${list.map(([name, desc]) =>
      `<strong>${esc(name)}</strong>${desc ? ` (${esc(shortDesc(desc))})` : ''}`).join(', ')}.</p>
    <p class="note">Ranked by Wikipedia language editions — one measure of fame among many.</p>`;
}

// Trim a Wikidata description to its first clause, dropping office-term
// tails ("… from 2015 to 2025"). Never split on "and" — it cuts phrases
// like "Russian and Austrian operatic soprano" down to a nationality.
function shortDesc(d) {
  const first = d.split(/[;,] /)[0].replace(/\s+(from|since|between)\s+\d{4}.*$/, '').trim();
  return first.length > 44 ? `${first.slice(0, 44)}…` : first;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

function placeName() { // short display name
  return state.iso3 ? shortName(unName()) : 'the world';
}

function placeIn() { // "in the Philippines" / "in Brazil"
  return state.iso3 ? inSentence(unName()) : 'the world';
}

function yearLabel(row, y) {
  return row?.open_ended ? `${y} or earlier` : String(y);
}

function updateTitle() {
  document.title = state.year
    ? `Born in ${state.year}${state.iso3 ? ` in ${placeName()}` : ''} — Year Atlas`
    : 'Year Atlas — everyone born in your year';
}

// gudrun FR-1: anchor the big number to a country people can picture.
// Only the ~60 largest countries qualify — the anchor has to be recognizable.
function populationAnchor(n) {
  if (!locations.length) return null;
  const pool = [...locations].sort((a, b) => b.total_alive - a.total_alive).slice(0, 60);
  const best = pool.reduce((a, b) =>
    (Math.abs(b.total_alive - n) < Math.abs(a.total_alive - n) ? b : a));
  if (Math.abs(best.total_alive - n) / n > 0.15) return null;
  return shortName(best.location_name);
}

function renderAnswer() {
  const el = $('answer');
  updateTitle();
  renderContext(currentRows(), state.year); // hides itself when there's nothing to say
  renderPeople(state.year); // async; hides itself when there's no list
  if (!state.year) {
    el.innerHTML = '<p class="invite">Type the year you were born.</p>';
    $('share-actions').hidden = true;
    $('details').hidden = true;
    // ilse P2-1: the empty state IS the product — the world field, no column lit
    if (world) {
      $('dotfield-section').hidden = false;
      renderDotField($('dotfield'), $('dotfield-caption'), world, null, 'the world');
      renderDotTable(world, 'the world');
    } else {
      $('dotfield-section').hidden = true;
    }
    return;
  }
  const rows = currentRows();
  if (!rows) { // country chosen, its slice still on its way
    el.innerHTML = '<p class="invite">Looking up your country…</p>';
    return;
  }
  const y = state.year;
  const alive = cohortSizeNow(rows, y);
  const row = findYear(rows, y);
  if (alive == null || !row) {
    el.innerHTML = `<p class="invite">No data for ${y} in ${placeIn()}.</p>`;
    return;
  }
  const pct = ageRankPercentile(rows, y);
  const yl = yearLabel(row, y);
  const parts = [];
  // median birth year is a world stat, shown next to the rank line in both views
  let medianLine = '';
  if (world) {
    const mY = medianBirthYear(world);
    const side = y < mY ? "you're in the older half"
      : y > mY ? "you're in the younger half" : "you're right at the middle";
    medianLine = `<p class="note">Half of everyone alive today was born after ${mY} — ${side}.</p>`;
  }
  parts.push(`<h2 class="visually-hidden">People born in ${yl}${state.iso3 ? ` in ${placeIn()}` : ''}</h2>`);
  // headline + sentence as ONE element so the number never orphans (marcus P1-2)
  if (state.iso3) {
    parts.push(`<p class="headline"><span class="big">about ${fmtPeople(alive)}</span>
      people living in ${placeIn()} were born in <strong>${yl}</strong> —
      you're older than <strong>${fmtPctWhole(pct)}</strong> of people there (mid-2026, UN projection).</p>`);
    parts.push(medianLine);
    parts.push(`<p class="note">This counts today's residents born anywhere — people move.
      It can even be larger than the number of babies born in ${placeIn()} in ${y},
      so it's not a survival rate.</p>`);
    if (Number(row.total_alive) < SMALL_POP) {
      parts.push(`<p class="note">Small population — estimates are noisy.</p>`);
    }
  } else {
    parts.push(`<p class="headline"><span class="big">about ${fmtPeople(alive)}</span>
      people alive right now were born in <strong>${yl}</strong> —
      you're older than <strong>${fmtPctWhole(pct)}</strong> of everyone on Earth (mid-2026, UN projection).</p>`);
    parts.push(medianLine);
    const anchor = populationAnchor(alive);
    if (anchor) parts.push(`<p class="note">That's about the population of ${anchor}.</p>`);
    const births = originalCohortSize(rows, y);
    if (y >= 2025) {
      // an unfinished birth year has no completed count (folasade F5)
      if (births != null) parts.push(`<p class="note">The UN projects about ${fmtPeople(births)} births in ${y}.</p>`);
    } else if (births != null) {
      const share = shareStillLiving(rows, y);
      parts.push(`<p class="note">About ${fmtPeople(alive)} of the ${fmtPeople(births)} people
        born in ${y} are still living (${Math.round(share * 100)}%).</p>`);
    } else if (y < 1950 && !row.open_ended) {
      parts.push(`<p class="note">The UN's births series starts in 1950,
        so there's no original-cohort figure for ${y}.</p>`);
    }
  }
  if (row.open_ended) {
    parts.push(`<p class="note">This figure counts everyone born in or before ${y} — the UN's open-ended 100-plus group.</p>`);
  }
  el.innerHTML = parts.join('');

  $('share-actions').hidden = false;
  $('dotfield-section').hidden = false;
  renderDotField($('dotfield'), $('dotfield-caption'), rows, y,
    state.iso3 ? placeName() : 'the world');
  renderDotTable(rows, state.iso3 ? placeName() : 'the world');

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
    const cmp = wimr != null && Math.abs(row.imr - wimr) >= 10
      ? ` — worldwide it was ${Math.round(wimr)}` : '';
    s.push(`In ${placeIn()} in ${y}, about ${Math.round(row.imr)} of every 1,000 babies did not reach their first birthday${cmp}.`);
  } else {
    s.push(`In ${y}, about ${Math.round(row.imr)} of every 1,000 babies worldwide did not reach their first birthday.`);
  }
  s.push(`The median person around you was ${Math.round(row.median_age)} years old.`);
  s.push(`The average woman had about ${Number(row.tfr).toFixed(1)} children over her lifetime.`);
  el.hidden = false;
  el.innerHTML = `<h2>The ${state.iso3 ? placeName() : 'world'} you arrived in</h2>
    <p>${s.join(' ')} <span id="climate-line"></span></p>`;
  const setClimate = () => {
    const span = $('climate-line');
    if (!span || state.year !== y) return;
    const d = climateDelta(climate, y);
    if (d == null) return;
    span.textContent = Math.abs(d) < 0.15
      ? `In ${y}, Earth's surface was about the same temperature as it is now.`
      : `Earth's surface was about ${Math.abs(d).toFixed(1)}°C ${d > 0 ? 'cooler' : 'warmer'} in ${y} than it is now.`;
  };
  if (climate) setClimate();
  else loadClimate().then(setClimate);
}

// marcus FR-1: the dot field's data as a real table behind a disclosure
function renderDotTable(rows, place) {
  const details = $('dotfield-table');
  details.hidden = false;
  const sorted = [...rows].sort((a, b) => Number(b.birth_year) - Number(a.birth_year));
  details.querySelector('div').innerHTML = `<table>
    <caption class="visually-hidden">People alive in mid-2026 by birth year — ${place}</caption>
    <thead><tr><th scope="col">Born in</th><th scope="col" class="n">Alive now</th></tr></thead>
    <tbody>${sorted.map((r) => `<tr>
      <td>${Number(r.birth_year)}${r.open_ended ? ' or earlier' : ''}</td>
      <td class="n">${fmtPeople(r.alive)}</td>
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
    ? `About ${fmtPeople(mine)} people in ${placeIn()} share your year${
      worldAlive != null ? `, and about ${fmtPeople(worldAlive)} people worldwide` : ''}.`
    : `About ${fmtPeople(mine)} people worldwide share your year.`;
  if (bigger.length === 0) {
    el.innerHTML = `<h2>Company</h2>
      <p>${opener} No other birth year has more people alive today — ${y} is the largest cohort in ${placeIn()}.</p>`;
    return;
  }
  const top = bigger.slice(0, 5);
  // When the top cohorts all round to the same display value, a table of
  // identical rows reads as a bug — say it as one sentence instead.
  const displays = new Set(top.map((b) => fmtPeople(b.alive)));
  if (top.length >= 3 && displays.size === 1) {
    const years = top.map((b) => b.birth_year).sort();
    el.innerHTML = `<h2>Bigger cohorts</h2>
      <p>${opener} The largest cohorts alive today were all born between ${years[0]}
      and ${years.at(-1)} — about ${[...displays][0]} people each, around
      ${top[0].ratio.toFixed(1)}× your year.</p>`;
    return;
  }
  el.innerHTML = `<h2>Bigger cohorts</h2>
    <p>${opener} These birth years are larger:</p>
    <table>
      <thead><tr><th scope="col">Born in</th><th scope="col" class="n">Alive now</th><th scope="col" class="n">× your year</th></tr></thead>
      <tbody>${top.map((b) => `<tr>
        <td>${b.birth_year}</td>
        <td class="n">${fmtPeople(b.alive)}</td>
        <td class="n">${b.ratio.toFixed(2)}×</td>
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
  $('contrast').innerHTML = `<h2>Same year, different passport</h2>
    <p class="caption">Cohort size and age rank by country — migration included,
      so these are people living there now, not survivors of that birth year.</p>
    <table>
      <thead><tr><th scope="col">Place</th><th scope="col" class="n">Born ${y}, alive there</th><th scope="col" class="n">Older than</th></tr></thead>
      <tbody>${contrast.map((c) => `<tr${c.iso3 === state.iso3 ? ' class="you"' : ''}>
        <td>${shortName(c.location_name)}</td>
        <td class="n">${fmtPeople(c.alive)}</td>
        <td class="n">${fmtPctWhole(c.percentile)}</td>
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
  const heading = state.iso3 ? `Residents born in ${y} over time` : 'Your cohort so far';
  const caption = state.iso3
    ? `People born in ${y} living in ${placeIn()}, counted in each year since ${x0} —
       migration included, so this is people living there now, not survivors. The bars
       underneath are the country's net migration across all ages, not just your cohort.`
    : `People born in ${y}, counted in each year since ${x0} — solid is UN estimates,
       dashed is the 2024–2026 projection.`;
  // country view: aligned net-migration strip + data-driven callout, so step
  // changes in the line (Albania in the 1990s) explain themselves
  let migration = null, callout = '';
  const rows = currentRows();
  if (state.iso3 && rows) {
    migration = rows.filter((r) => r.net_mig != null)
      .map((r) => ({ year: r.birth_year, net: Number(r.net_mig) }));
    const ep = migrationEpisode(rows, rows[0].total_alive);
    if (ep) {
      const dir = ep.avg < 0 ? `left ${placeIn()} than arrived` : `arrived in ${placeIn()} than left`;
      callout = `<p class="note">Between ${ep.start} and ${ep.end}, about
        ${fmtPeople(Math.abs(ep.avg))} more people ${dir} each year, on average.</p>`;
    }
  }
  trajEl.innerHTML = `<h2>${heading}</h2>
    <p class="caption">${caption}</p>
    ${trajectorySVG(arc, y, migration)}
    ${callout}
    <details class="viz-table"><summary>View as table</summary>
      <table>
        <thead><tr><th scope="col">Year</th><th scope="col" class="n">Born ${y}, alive</th></tr></thead>
        <tbody>${arc.map((d) => `<tr><td>${d.ref_year}</td><td class="n">${fmtPeople(d.alive)}</td></tr>`).join('')}</tbody>
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
      $('answer').innerHTML = `<p class="invite">No data for ${state.iso3}.</p>`;
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

function findLocation(typed) {
  const t = typed.toLowerCase();
  return locations.find((l) => l.location_name.toLowerCase() === t
    || shortName(l.location_name).toLowerCase() === t
    || l.iso3.toLowerCase() === t) ?? null;
}

function suggestLocation(typed) {
  const t = typed.toLowerCase();
  const hit = locations.find((l) => l.location_name.toLowerCase().includes(t)
    || shortName(l.location_name).toLowerCase().includes(t));
  return hit ? shortName(hit.location_name) : null;
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
      raw.length >= 4 ? `That year is outside ${MIN_YEAR}–${MAX_YEAR}.` : '');
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
      setFieldError($('country'), $('country-error'),
        `No country called “${typed}”.${sug ? ` Did you mean ${sug}?` : ''}`);
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

parseURL();

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
  });
  $('share-status').textContent = status;
});
if (navigator.canShare) $('share').textContent = 'Share image';

// first paint: world json only; locations fill the datalist when they arrive
fetch(import.meta.env.BASE_URL + 'data/world-now.json').then((r) => r.json()).then((rows) => {
  world = rows;
  render();
});
fetch(import.meta.env.BASE_URL + 'data/locations.json').then((r) => r.json()).then((locs) => {
  locations = locs;
  $('countries').innerHTML = locs
    .map((l) => `<option value="${l.location_name.replace(/"/g, '&quot;')}"></option>`)
    .join('');
  syncInputs();
  if (world) renderAnswer(); // pick up names + the population anchor line
});
fetch(import.meta.env.BASE_URL + 'data/meta.json').then((r) => r.json()).then((m) => {
  $('vintage').textContent =
    `${m.source}, ${m.variant} variant · mid-${m.ref_year} reference · build ${m.commit}`;
});
syncInputs();
