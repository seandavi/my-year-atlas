import './style.css';
import {
  findYear, cohortSizeNow, originalCohortSize, shareStillLiving,
  ageRankPercentile, cohortTrajectory, passportContrast, pickContrastCountries,
  biggerCohorts, fmt, fmtCompact, fmtPct,
} from './stats.js';
import { renderDotField, trajectorySVG } from './dots.js';

const $ = (id) => document.getElementById(id);
const MIN_YEAR = 1926, MAX_YEAR = 2026, SMALL_POP = 90000;

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

// --- data ---
let world = null;       // world-now.json rows
let locations = [];     // locations.json
let cohortsAll = null;  // full 2026 slice (lazy parquet)
let parquetMod = null;
let detailsWanted = false;

const locByIso = () => locations.find((l) => l.iso3 === state.iso3) || null;

async function lazyParquet() {
  parquetMod ??= await import('./parquet.js');
  return parquetMod;
}

function currentRows() {
  if (!state.iso3) return world;
  if (!cohortsAll) return null;
  return cohortsAll.filter((r) => r.iso3 === state.iso3);
}

// --- rendering ---
function placeName() {
  return state.iso3 ? (locByIso()?.location_name ?? state.iso3) : 'the world';
}

function rankLine(pct, forCountry) {
  // short form for the share card; the country name gets its own line there
  return `Older than ${fmtPct(pct)} of people alive right now${forCountry ? ' there' : ''}.`;
}

function renderAnswer() {
  const el = $('answer');
  if (!state.year) {
    el.innerHTML = '<p class="invite">Type the year you were born.</p>';
    $('dotfield-section').hidden = true;
    $('details').hidden = true;
    return;
  }
  const rows = currentRows();
  if (!rows) { // country chosen, parquet still on its way
    el.innerHTML = '<p class="invite">Looking up your country…</p>';
    return;
  }
  const y = state.year;
  const alive = cohortSizeNow(rows, y);
  const row = findYear(rows, y);
  if (alive == null || !row) {
    el.innerHTML = `<p class="invite">No data for ${y} in ${placeName()}.</p>`;
    return;
  }
  const pct = ageRankPercentile(rows, y);
  const parts = [];
  parts.push(`<p class="big">${fmt(alive)}</p>`);
  if (state.iso3) {
    parts.push(`<p class="lede">people living in ${placeName()} were born in <strong>${y}</strong> —
      you're older than <strong>${fmtPct(pct)}</strong> of people there (mid-2026, UN projection).</p>`);
    parts.push(`<p class="note">This counts today's residents born anywhere — people move.
      It can even be larger than the number of babies born in ${placeName()} in ${y},
      so it's not a survival rate.</p>`);
    if ((locByIso()?.total_alive ?? Infinity) < SMALL_POP) {
      parts.push(`<p class="note">Small population — estimates are noisy.</p>`);
    }
  } else {
    parts.push(`<p class="lede">people alive right now were born in <strong>${y}</strong> —
      you're older than <strong>${fmtPct(pct)}</strong> of everyone on Earth (mid-2026, UN projection).</p>`);
    const births = originalCohortSize(rows, y);
    if (births != null) {
      const share = shareStillLiving(rows, y);
      parts.push(`<p class="note">${fmt(births)} people were born in ${y}. ${fmtPct(share)} are still living.</p>`);
    }
  }
  if (row.open_ended || y < 1927) {
    parts.push(`<p class="note">This figure counts everyone born in or before ${y} — the UN's open-ended 100-plus group.</p>`);
  }
  el.innerHTML = parts.join('');

  $('dotfield-section').hidden = false;
  renderDotField($('dotfield'), $('dotfield-caption'), rows, y,
    state.iso3 ? placeName() : 'the world');

  $('details').hidden = false;
  renderBigger(rows, y);
  if (detailsWanted) renderDetails();
}

function renderBigger(rows, y) {
  const el = $('bigger');
  const bigger = biggerCohorts(rows, y).filter((b) => !findYear(rows, b.birth_year)?.open_ended);
  if (bigger.length === 0) {
    el.innerHTML = `<h2>Company</h2>
      <p>No other birth year has more people alive today — ${y} is the largest cohort in ${placeName()}.</p>`;
    return;
  }
  const top = bigger.slice(0, 5);
  el.innerHTML = `<h2>Bigger cohorts</h2>
    <p>${bigger.length === 1 ? 'One birth year outnumbers' : `${bigger.length} birth years outnumber`}
      yours in ${placeName()} today. The largest:</p>
    <table>
      <thead><tr><th scope="col">Born in</th><th scope="col" class="n">Alive now</th><th scope="col" class="n">vs yours</th></tr></thead>
      <tbody>${top.map((b) => `<tr>
        <td>${b.birth_year}</td>
        <td class="n">${fmt(b.alive)}</td>
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
  const iso = state.iso3 ?? 'WLD';
  const mod = await lazyParquet();

  // trajectory
  const traj = await mod.loadTraj(iso);
  if (seq !== detailsSeq) return; // state changed mid-flight
  const trajEl = $('trajectory');
  if (traj) {
    const arc = cohortTrajectory(traj, y);
    trajEl.innerHTML = arc.length > 1
      ? `<h2>Your cohort over time</h2>
         <p class="caption">People born in ${y}, counted in each year — solid is UN estimates, dashed is projection.</p>
         ${trajectorySVG(arc, y)}`
      : '';
  } else {
    trajEl.innerHTML = '';
  }

  // passport contrast
  cohortsAll ??= await mod.loadCohorts();
  if (seq !== detailsSeq) return;
  const isoList = [...(state.iso3 ? [state.iso3] : []), ...pickContrastCountries(state.iso3)];
  const contrast = passportContrast(cohortsAll, y, isoList);
  $('contrast').innerHTML = `<h2>Same year, different passport</h2>
    <p class="caption">Cohort size and age rank vary a lot by country — migration included, so these are residents, not survival.</p>
    <table>
      <thead><tr><th scope="col">Place</th><th scope="col" class="n">Born ${y}, alive there</th><th scope="col" class="n">Older than</th></tr></thead>
      <tbody>${contrast.map((c) => `<tr${c.iso3 === state.iso3 ? ' class="you"' : ''}>
        <td>${c.location_name}</td>
        <td class="n">${fmt(c.alive)}</td>
        <td class="n">${fmtPct(c.percentile, 0)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
}

async function render() {
  renderAnswer();
  if (state.iso3 && !cohortsAll) {
    const mod = await lazyParquet();
    cohortsAll = await mod.loadCohorts();
    renderAnswer(); // now with country rows
  }
}

// --- wiring ---
function syncInputs() {
  $('year').value = state.year ?? '';
  $('country').value = state.iso3 ? (locByIso()?.location_name ?? state.iso3) : '';
}

function onInput() {
  const y = parseInt($('year').value, 10);
  const name = $('country').value.trim().toLowerCase();
  const loc = name
    ? locations.find((l) => l.location_name.toLowerCase() === name || l.iso3.toLowerCase() === name)
    : null;
  const year = y >= MIN_YEAR && y <= MAX_YEAR ? y : null;
  const iso3 = loc?.iso3 ?? null;
  if (year === state.year && iso3 === state.iso3) return;
  state.year = year;
  state.iso3 = iso3;
  pushURL();
  render();
}

parseURL();

$('year').addEventListener('input', onInput);
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
  resizeTimer = setTimeout(() => { if (state.year && currentRows()) renderAnswer(); }, 150);
});

new IntersectionObserver((entries, obs) => {
  if (entries.some((e) => e.isIntersecting)) {
    obs.disconnect();
    renderDetails();
  }
}, { rootMargin: '200px' }).observe($('details'));

$('download').addEventListener('click', async () => {
  const rows = currentRows();
  if (!rows || !state.year) return;
  const { downloadShareImage } = await import('./share.js');
  downloadShareImage({
    alive: cohortSizeNow(rows, state.year),
    rankLine: rankLine(ageRankPercentile(rows, state.year), !!state.iso3),
    year: state.year,
    iso3: state.iso3,
    placeName: state.iso3 ? placeName() : 'World',
  });
});

// first paint: world json only; locations fill the datalist when they arrive
fetch('/data/world-now.json').then((r) => r.json()).then((rows) => {
  world = rows;
  render();
});
fetch('/data/locations.json').then((r) => r.json()).then((locs) => {
  locations = locs;
  $('countries').innerHTML = locs
    .map((l) => `<option value="${l.location_name.replace(/"/g, '&quot;')}"></option>`)
    .join('');
  syncInputs();
});
syncInputs();
