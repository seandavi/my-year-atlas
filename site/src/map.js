// Choropleth: where the world's {Y}-born live now (issue #37). Lazy chunk —
// geometry is pre-projected Equal Earth SVG paths in /data/map.json (the
// client does zero geo math); values come from cohorts-now.parquet via the
// same hyparquet chunk the trajectory uses. Company framing (§9): the map
// answers "where is your company", never loss.
import { fmtPeople } from './stats.js';
import { shortName, inSentence } from './names.js';

// Powers-of-ten bins, not a linear ramp: per-year country cohorts span ~4
// people (Holy See) to 20M+ (India), so linear would leave the map two
// colors. Fixed decade bins also keep the legend stable across year steps.
export const THRESHOLDS = [1e4, 1e5, 1e6, 1e7];

/** Bin index 0..THRESHOLDS.length for a cohort size; -1 = no data. */
export function binOf(alive) {
  const n = Number(alive);
  if (!Number.isFinite(n) || n <= 0) return -1;
  let b = 0;
  for (const t of THRESHOLDS) if (n >= t) b += 1;
  return b;
}

/** Legend label for bin i: "under 10,000" … "over 10 million". */
export function binLabel(i) {
  if (i === 0) return `under ${fmtPeople(THRESHOLDS[0])}`;
  if (i === THRESHOLDS.length) return `over ${fmtPeople(THRESHOLDS.at(-1))}`;
  const [lo, hi] = [fmtPeople(THRESHOLDS[i - 1]), fmtPeople(THRESHOLDS[i])];
  // "1 million–10 million" → "1–10 million"
  const unit = hi.match(/ (million|billion)$/)?.[0];
  return unit && lo.endsWith(unit)
    ? `${lo.slice(0, -unit.length)}–${hi}` : `${lo}–${hi}`;
}

/** Top-n rows by alive, descending. rows: [{alive, ...}]. */
export function topCountries(rows, n = 3) {
  return [...rows].sort((a, b) => Number(b.alive) - Number(a.alive)).slice(0, n);
}

/** "India, China and the United States" */
function listNames(rows) {
  const names = rows.map((r) => inSentence(r.location_name));
  return names.length < 2 ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

function fmtShare(alive, worldAlive) {
  if (!worldAlive) return '';
  const v = (100 * alive) / worldAlive;
  return v < 0.1 ? '<0.1%' : `${v.toFixed(v < 10 ? 1 : 0)}%`;
}

let dataPromise;
/** Fetch geometry + values once; every later call is the cached parse. */
export function loadMapData() {
  dataPromise ??= Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/map.json`).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    }),
    // dynamic so this module stays importable in node tests (parquet.js
    // pulls in a JSON module + import.meta.env)
    import('./parquet.js').then((m) => m.loadCohortsNow()),
  ]).then(([geo, rows]) => ({ geo, rows }));
  return dataPromise;
}

/**
 * Render (or recolor) the map into el. rows = full cohorts-now slice; year =
 * birth year; yearText = display label ("1926 or earlier"); userIso3 gets a
 * gold outline. Paths are built once; year/country changes only touch fills,
 * titles and the small text bits — no refetch, no geometry churn.
 */
export function renderMap(el, geo, rows, year, yearText, userIso3) {
  const perYear = rows.filter((r) => Number(r.birth_year) === year && r.iso3 !== 'WLD');
  const worldAlive = Number(rows.find((r) => r.iso3 === 'WLD' && Number(r.birth_year) === year)?.alive ?? 0);
  const byIso = new Map(perYear.map((r) => [r.iso3, r]));

  if (!el.dataset.built) {
    el.dataset.built = '1';
    el.innerHTML = `<h2>Where your year lives</h2>
      <svg class="mapviz" viewBox="${geo.viewBox}" role="img"></svg>
      <p class="map-legend" aria-hidden="true"></p>
      <p class="caption"></p>
      <details class="viz-table"><summary>View as table</summary><div></div></details>`;
    const svg = el.querySelector('svg');
    for (const [iso, c] of Object.entries(geo.countries)) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', c.d);
      p.dataset.iso = iso;
      p.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'title'));
      svg.appendChild(p);
    }
    el.querySelector('.map-legend').innerHTML = [
      ...THRESHOLDS.map((_, i) => i).concat(THRESHOLDS.length)
        .map((i) => `<span class="key"><span class="swatch b${i}"></span>${binLabel(i)}</span>`),
      '<span class="key"><span class="swatch nodata"></span>no data</span>',
    ].join('');
  }

  const svg = el.querySelector('svg');
  for (const p of svg.querySelectorAll('path[data-iso]')) {
    const iso = p.dataset.iso;
    const row = byIso.get(iso);
    const b = binOf(row?.alive);
    p.setAttribute('class', b < 0 ? 'nodata' : `b${b}`);
    const name = row ? shortName(row.location_name) : geo.countries[iso].name;
    p.querySelector('title').textContent = row
      ? `${name}: about ${fmtPeople(row.alive)} people born in ${yearText}`
      : `${name}: no data`;
  }
  // selected country: a cased gold halo painted last, so it reads on any
  // fill (including the top bin, whose fill IS the gold) and any neighbor
  svg.querySelectorAll('.ring').forEach((n) => n.remove());
  if (userIso3 && geo.countries[userIso3]) {
    for (const cls of ['ring-under', 'ring-over']) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', geo.countries[userIso3].d);
      p.setAttribute('class', `ring ${cls}`);
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(p);
    }
  }

  const top3 = topCountries(perYear, 3);
  svg.setAttribute('aria-label',
    `World map of people born in ${yearText} by where they live now. `
    + `Most now live in ${listNames(top3)}. Full figures in the table below.`);

  el.querySelector('.caption').textContent =
    `People alive today who were born in ${yearText}, by where they live now. mid-2026, UN projection.`;

  const sorted = topCountries(perYear, 25);
  const more = perYear.length - sorted.length;
  el.querySelector('.viz-table div').innerHTML = `<table>
    <caption class="visually-hidden">People born in ${yearText} by country of residence, mid-2026</caption>
    <thead><tr><th scope="col">Country</th><th scope="col" class="n">People</th><th scope="col" class="n">Share of cohort</th></tr></thead>
    <tbody>${sorted.map((r) => `<tr${r.iso3 === userIso3 ? ' class="you"' : ''}>
      <td>${shortName(r.location_name)}</td>
      <td class="n">${fmtPeople(r.alive)}</td>
      <td class="n">${fmtShare(Number(r.alive), worldAlive)}</td>
    </tr>`).join('')}</tbody>
  </table>${more > 0 ? `<p class="note">…and ${more} more countries.</p>` : ''}`;
}
