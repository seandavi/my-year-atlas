// Choropleth: where the world's {Y}-born live now (issue #37). Lazy chunk —
// geometry is pre-projected Equal Earth SVG paths in /data/map.json (the
// client does zero geo math); values come from cohorts-now.parquet via the
// same hyparquet chunk the trajectory uses. Company framing (§9): the map
// answers "where is your company", never loss.
import { t, iso2Of } from './i18n/index.js';
import { infoLink } from './sections.js';

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
  if (i === 0) return t.binUnder(t.fmtPeople(THRESHOLDS[0]));
  if (i === THRESHOLDS.length) return t.binOver(t.fmtPeople(THRESHOLDS.at(-1)));
  const [lo, hi] = [t.fmtPeople(THRESHOLDS[i - 1]), t.fmtPeople(THRESHOLDS[i])];
  // "1 million–10 million" → "1–10 million" (only when the unit words match)
  const unit = hi.match(/ (million|billion|millones|milhões|bilhões|mil millones)$/)?.[0];
  return unit && lo.endsWith(unit)
    ? `${lo.slice(0, -unit.length)}–${hi}` : `${lo}–${hi}`;
}

/** Top-n rows by alive, descending. rows: [{alive, ...}]. */
export function topCountries(rows, n = 3) {
  return [...rows].sort((a, b) => Number(b.alive) - Number(a.alive)).slice(0, n);
}

function fmtShare(alive, worldAlive) {
  if (!worldAlive) return '';
  return t.sharePct((100 * alive) / worldAlive);
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
    el.innerHTML = `<h2>${t.mapHeading} ${infoLink('map')}</h2>
      <svg class="mapviz" viewBox="${geo.viewBox}" role="img"></svg>
      <p class="map-legend" aria-hidden="true"></p>
      <p class="caption"></p>
      <details class="viz-table"><summary>${t.viewAsTable}</summary><div></div></details>`;
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
      `<span class="key"><span class="swatch nodata"></span>${t.legendNoData}</span>`,
    ].join('');
  }

  const svg = el.querySelector('svg');
  for (const p of svg.querySelectorAll('path[data-iso]')) {
    const iso = p.dataset.iso;
    const row = byIso.get(iso);
    const b = binOf(row?.alive);
    p.setAttribute('class', b < 0 ? 'nodata' : `b${b}`);
    const name = row ? t.displayName(row.location_name, iso2Of(iso)) : geo.countries[iso].name;
    p.querySelector('title').textContent = row
      ? t.mapTooltip(name, row.alive, yearText)
      : t.mapTooltipNoData(name);
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
    t.mapAria(yearText, top3.map((r) => ({ name: r.location_name, iso2: iso2Of(r.iso3) }))));

  el.querySelector('.caption').textContent = t.mapCaption(yearText);

  const sorted = topCountries(perYear, 25);
  const more = perYear.length - sorted.length;
  el.querySelector('.viz-table div').innerHTML = `<table>
    <caption class="visually-hidden">${t.mapTableCaption(yearText)}</caption>
    <thead><tr><th scope="col">${t.thCountry}</th><th scope="col" class="n">${t.thPeople}</th><th scope="col" class="n">${t.thShare}</th></tr></thead>
    <tbody>${sorted.map((r) => `<tr${r.iso3 === userIso3 ? ' class="you"' : ''}>
      <td>${t.displayName(r.location_name, iso2Of(r.iso3))}</td>
      <td class="n">${t.fmtPeople(r.alive)}</td>
      <td class="n">${fmtShare(Number(r.alive), worldAlive)}</td>
    </tr>`).join('')}</tbody>
  </table>${more > 0 ? `<p class="note">${t.moreCountries(more)}</p>` : ''}`;
}
