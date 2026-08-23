// Client-side share card: 1200×630 rendered at 2x. FIXSPEC copy templates and
// display formatting; site dark palette (spec §8, FIXSPEC card tokens).
// All copy comes from the current locale (t).
import { t } from './i18n/index.js';

const INK = '#0c1322', PAPER = '#eef1f7', GOLD = '#e8b64c', SOFT = '#9aa6bd';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const DISPLAY = `"Instrument Serif", Georgia, ${SANS}`;

/**
 * data: { alive, pct, year, yearLabel, iso3, iso2, locationName } —
 * locationName is the UN name (null for the world view).
 */
export function renderShareCanvas({ alive, pct, yearLabel, locationName, iso2 }) {
  const W = 1200, H = 630, S = 2; // 2x for crisp downloads
  const canvas = document.createElement('canvas');
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext('2d');
  ctx.scale(S, S);

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // quiet deterministic dot texture
  let seed = 2026;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  ctx.fillStyle = 'rgba(232, 182, 76, 0.12)';
  for (let i = 0; i < 260; i++) {
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const font = (w, px, family = SANS) => `${w} ${px}px ${family}`;

  // wordmark: gold, weight 700 (FIXSPEC) — stays "Year Atlas" in every locale
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(72, 74, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = font(700, 30, DISPLAY);
  ctx.textBaseline = 'middle';
  ctx.fillText('Year Atlas', 94, 76);

  // headline number ("about {N}"), fitted, in the display face
  ctx.fillStyle = SOFT;
  ctx.font = font(400, 36);
  ctx.fillText(t.cardAbout(alive), 66, 168);
  const headline = t.fmtPeople(alive);
  let px = 170;
  ctx.font = font(400, px, DISPLAY);
  while (ctx.measureText(headline).width > W - 128 && px > 60) {
    px -= 6;
    ctx.font = font(400, px, DISPLAY);
  }
  ctx.fillStyle = PAPER;
  ctx.fillText(headline, 64, 190 + px * 0.5);

  // sentence: country template names the place inside the claim (tereza P0-1)
  const inPlace = locationName ? t.placeIn(locationName, iso2) : null;
  const sentence = t.cardSentence(alive, inPlace, yearLabel);
  ctx.fillStyle = GOLD;
  let sp = 40;
  ctx.font = font(600, sp);
  while (ctx.measureText(sentence).width > W - 128 && sp > 24) ctx.font = font(600, (sp -= 2));
  ctx.fillText(sentence, 64, Math.min(190 + px * 1.1 + 28, 460));

  // rank line: no dangling "there" — the place or "the world" is in the line
  const rankLine = t.cardRank(t.fmtPct(pct), locationName ? t.displayName(locationName, iso2) : null);
  ctx.fillStyle = PAPER;
  let rp = 34;
  ctx.font = font(400, rp);
  while (ctx.measureText(rankLine).width > W - 128 && rp > 20) ctx.font = font(400, (rp -= 2));
  ctx.fillText(rankLine, 64, 505);

  // vintage line, exactly as FIXSPEC
  ctx.fillStyle = SOFT;
  ctx.font = font(400, 24);
  ctx.fillText(t.cardVintage, 64, 572);

  return canvas;
}

async function cardBlob(data) {
  try {
    await document.fonts.load('400 170px "Instrument Serif"');
  } catch { /* fall back to system faces */ }
  const canvas = renderShareCanvas(data);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function cardFilename(data) {
  return `year-atlas-${data.year}${data.iso3 ? `-${data.iso3}` : ''}.png`;
}

/**
 * Share via the native sheet when files are supported (rhea FR-1), otherwise
 * download. Returns a status string for the role="status" region.
 */
export async function shareImage(data) {
  const blob = await cardBlob(data);
  const name = cardFilename(data);
  const file = new File([blob], name, { type: 'image/png' });
  const text = t.shareText(data.alive,
    data.locationName ? t.placeIn(data.locationName, data.iso2) : null, data.yearLabel);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, url: location.href });
      return t.sharedStatus;
    } catch (e) {
      if (e.name === 'AbortError') return '';
      // fall through to download
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  return t.savedStatus(name);
}
