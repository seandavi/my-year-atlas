// Client-side share card: 1200×630 rendered at 2x. Headline number, rank
// line, birth year, country, wordmark — nothing else (spec §8).
import { fmt } from './stats.js';

const INK = '#0c1322', PAPER = '#eef1f7', GOLD = '#e8b64c', SOFT = '#9aa6bd';

export function renderShareCanvas({ alive, rankLine, year, placeName }) {
  const W = 1200, H = 630, S = 2; // 2x for crisp downloads
  const canvas = document.createElement('canvas');
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext('2d');
  ctx.scale(S, S);

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // quiet deterministic dot texture, thinning to the right
  let seed = year;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  ctx.fillStyle = 'rgba(232, 182, 76, 0.16)';
  for (let i = 0; i < 320; i++) {
    const x = rand() * W;
    const y = rand() * H;
    if (rand() < x / W - 0.15) continue;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const font = (w, px) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  // wordmark
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(72, 74, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.font = font(800, 30);
  ctx.textBaseline = 'middle';
  ctx.fillText('Year Atlas', 94, 76);

  // headline number, fitted
  const headline = fmt(alive);
  let px = 150;
  ctx.font = font(800, px);
  while (ctx.measureText(headline).width > W - 128 && px > 60) {
    px -= 6;
    ctx.font = font(800, px);
  }
  ctx.fillStyle = PAPER;
  ctx.fillText(headline, 64, 300);

  ctx.fillStyle = GOLD;
  ctx.font = font(600, 40);
  ctx.fillText(`people alive now were born in ${year}`, 64, 300 + px * 0.75);

  ctx.fillStyle = PAPER;
  let rp = 34;
  ctx.font = font(400, rp);
  while (ctx.measureText(rankLine).width > W - 128 && rp > 20) ctx.font = font(400, (rp -= 2));
  ctx.fillText(rankLine, 64, 505);

  ctx.fillStyle = SOFT;
  ctx.font = font(600, 30);
  ctx.fillText(placeName, 64, 566);

  return canvas;
}

export function downloadShareImage(data) {
  const canvas = renderShareCanvas(data);
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `year-atlas-${data.year}${data.iso3 ? `-${data.iso3}` : ''}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}
