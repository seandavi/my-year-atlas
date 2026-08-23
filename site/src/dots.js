// The signature dot field: one column per birth year, one dot = a real number
// of people. Youngest cohorts on the left; the field thins toward the right
// as years get earlier. Canvas, static render (reduced-motion safe by design).
import { fmtPeople } from './stats.js';

/** Round up to a "nice" dot value: 1/2/2.5/5 × 10^k. Never below 1 person. */
export function niceScale(maxAlive, maxDots = 56) {
  const raw = maxAlive / maxDots;
  if (raw <= 1) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * mag >= raw) return m * mag;
  }
  return 10 * mag;
}

function css(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * Render the field. rows: [{birth_year, alive}] for one location,
 * userYear highlighted in the accent (pass null for no highlight — the
 * empty-state world field).
 */
export function renderDotField(canvas, captionEl, rows, userYear, placeName) {
  const sorted = [...rows].sort((a, b) => Number(b.birth_year) - Number(a.birth_year)); // young → old, left → right
  const maxAlive = Math.max(...sorted.map((r) => Number(r.alive)));
  const scale = niceScale(maxAlive);

  const n = sorted.length;
  const cssWidth = canvas.parentElement.clientWidth || 640;
  const colW = cssWidth / n;
  const dotR = Math.max(1.2, Math.min(2.6, colW * 0.32));
  const step = dotR * 2 + Math.max(1.5, dotR * 0.9); // vertical pitch
  const maxRows = Math.ceil(maxAlive / scale);
  const cssHeight = Math.ceil(maxRows * step + dotR * 2 + 18); // + axis labels

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const dim = css('--dot-dim');
  const gold = css('--gold');
  const soft = css('--ink-soft');
  const baseline = cssHeight - 18;

  sorted.forEach((r, i) => {
    const year = Number(r.birth_year);
    const dots = Math.max(1, Math.round(Number(r.alive) / scale));
    const x = i * colW + colW / 2;
    ctx.fillStyle = year === userYear ? gold : dim;
    for (let d = 0; d < dots; d++) {
      ctx.beginPath();
      ctx.arc(x, baseline - dotR - d * step, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    // axis label every 25 years, plus the user's own year; skip clipped edges
    if ((year === userYear || (year % 25 === 0 && (userYear == null || Math.abs(year - userYear) > 6)))
        && x > 16 && x < cssWidth - 16) {
      ctx.fillStyle = year === userYear ? gold : soft;
      ctx.font = `${year === userYear ? '600 ' : ''}11px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(year), x, cssHeight - 4);
    }
  });

  const dotLabel = scale === 1 ? 'one person' : `${fmtPeople(scale)} people`;
  captionEl.textContent =
    `One dot is ${dotLabel} alive in mid-2026 (UN projection), by birth year — ${placeName}. Newest years on the left.`;

  // aria: state the finding, not just the mechanics (marcus P1-3)
  const peak = sorted.reduce((a, b) => (Number(b.alive) > Number(a.alive) ? b : a));
  const oldest = sorted[sorted.length - 1];
  const you = userYear != null ? sorted.find((r) => Number(r.birth_year) === userYear) : null;
  canvas.setAttribute('aria-label',
    `Population of ${placeName} by birth year. The field is largest around ${peak.birth_year} `
    + `at about ${fmtPeople(peak.alive)} and thins to about ${fmtPeople(oldest.alive)} by ${oldest.birth_year}.`
    + (you ? ` The highlighted ${userYear} column sits at about ${fmtPeople(you.alive)}.` : '')
    + ` One dot is ${dotLabel}.`);
}

/**
 * Cohort trajectory as a quiet SVG line, ending at the reference year 2026 —
 * no projected decline, no future year labels (§9). Estimates to 2023 solid,
 * the 2024–2026 projection dashed.
 */
export function trajectorySVG(traj, userYear) {
  const W = 640, H = 220, PAD = { l: 8, r: 8, t: 16, b: 24 };
  const years = traj.map((d) => d.ref_year);
  const x0 = Math.min(...years), x1 = Math.max(...years);
  const yMax = Math.max(...traj.map((d) => d.alive));
  const X = (yr) => PAD.l + ((yr - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const Y = (v) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);
  const pts = (seg) => seg.map((d) => `${X(d.ref_year).toFixed(1)},${Y(d.alive).toFixed(1)}`).join(' ');

  const est = traj.filter((d) => d.ref_year <= 2023);
  const proj = traj.filter((d) => d.ref_year >= 2023);
  const now = traj.find((d) => d.ref_year === x1);
  const first = traj[0];
  const peak = traj.reduce((a, b) => (b.alive > a.alive ? b : a));

  const tick = (yr, anchor = 'middle') =>
    `<text x="${X(yr)}" y="${H - 6}" text-anchor="${anchor}" font-size="11" fill="var(--ink-soft)">${yr}</text>`;
  const ticks = tick(x0, 'start') + tick(x1, 'end');

  const label = `People born in ${userYear}, counted in each year from ${x0} to ${x1}: `
    + `about ${fmtPeople(first.alive)} in ${x0}, `
    + (peak.ref_year !== x0 && peak.ref_year !== x1 ? `peaking at about ${fmtPeople(peak.alive)} around ${peak.ref_year}, ` : '')
    + `about ${fmtPeople(now.alive)} in ${x1}. The last stretch, 2024 to 2026, is a UN projection.`;

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
    <line x1="${PAD.l}" y1="${Y(0)}" x2="${W - PAD.r}" y2="${Y(0)}" stroke="var(--line)"/>
    ${est.length > 1 ? `<polyline points="${pts(est)}" fill="none" stroke="var(--dot)" stroke-width="2"/>` : ''}
    ${proj.length > 1 ? `<polyline points="${pts(proj)}" fill="none" stroke="var(--dot)" stroke-width="2" stroke-dasharray="2 5" opacity="0.75"/>` : ''}
    ${now ? `<circle cx="${X(x1)}" cy="${Y(now.alive)}" r="4" fill="var(--gold)"/>
    <text x="${Math.min(X(x1), W - 130)}" y="${Math.max(Y(now.alive) - 16, 12)}" font-size="11" font-weight="600" fill="var(--gold)">${x1} · ${fmtPeople(now.alive)}</text>` : ''}
    ${ticks}
  </svg>`;
}
