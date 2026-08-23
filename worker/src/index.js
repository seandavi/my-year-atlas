// Year Atlas edge worker: /og share cards + per-URL OG meta injection.
// Stateless; all data comes from the static assets it fronts.
import { ImageResponse } from "workers-og";
import { parquetReadObjects } from "hyparquet";
import { fmtPeople, fmtPct, percentile } from "./format.js";
import { shortName } from "./names.js";
import fontRegular from "../assets/inter-latin-400-normal.woff";
import fontBold from "../assets/inter-latin-700-normal.woff";

const YEAR_MIN = 1926;
const YEAR_MAX = 2026;
const SMALL_POP = 90000; // matches site/src/main.js (tereza P2-2)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/og") return handleOg(url, env, ctx);
    const res = await env.ASSETS.fetch(request);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return res;
    return rewriteMeta(res, url, env);
  },
};

// ---------- params ----------

function parseParams(url) {
  const y = parseInt(url.searchParams.get("y") ?? "", 10);
  const validY = Number.isInteger(y) && y >= YEAR_MIN && y <= YEAR_MAX;
  let c = (url.searchParams.get("c") || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(c) || c === "WLD") c = "";
  return { y: validY ? y : null, c };
}

// ---------- data ----------

// Returns { y, name (display name or null for world), alive, pct, openEnded,
// small } or null. Country falls back to world when the row is missing.
async function getStat(env, origin, y, c) {
  if (y === null) return null;
  if (c) {
    const s = await getCountry(env, origin, y, c);
    if (s) return s;
  }
  return getWorld(env, origin, y);
}

async function getWorld(env, origin, y) {
  const res = await env.ASSETS.fetch(`${origin}/data/world-now.json`);
  if (!res.ok) return null;
  const rows = await res.json();
  const row = rows.find((r) => r.birth_year === y);
  if (!row) return null;
  return {
    y,
    name: null,
    alive: Number(row.alive),
    pct: fmtPct(percentile(row.cum_alive_younger, row.alive, row.total_alive)),
    openEnded: !!row.open_ended,
    small: false,
  };
}

async function getCountry(env, origin, y, c) {
  const res = await env.ASSETS.fetch(`${origin}/data/cohorts-now.parquet`);
  if (!res.ok) return null;
  const file = await res.arrayBuffer();
  const rows = await parquetReadObjects({
    file,
    columns: ["iso3", "location_name", "birth_year", "alive", "open_ended", "cum_alive_younger", "total_alive"],
  });
  const row = rows.find((r) => r.iso3 === c && Number(r.birth_year) === y);
  if (!row) return null;
  return {
    y,
    name: shortName(row.location_name),
    alive: Number(row.alive),
    pct: fmtPct(percentile(row.cum_alive_younger, row.alive, row.total_alive)),
    openEnded: !!row.open_ended,
    small: Number(row.total_alive) < SMALL_POP,
  };
}

// ---------- /og ----------

async function handleOg(url, env, ctx) {
  const { y, c } = parseParams(url);
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/og?y=${y ?? ""}&c=${c}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const stat = await getStat(env, url.origin, y, c);
  const card = stat ? cardHtml(stat) : genericCard();

  const img = new ImageResponse(card, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
      { name: "Inter", data: fontBold, weight: 700, style: "normal" },
    ],
  });
  const res = new Response(img.body, img);
  res.headers.set("Content-Type", "image/png");
  res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=31536000");
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------- card templates (satori-flavored HTML) ----------

// Site palette per FIXSPEC (ilse: card must share the site's tokens).
const BG = "#0c1322";
const INK = "#eef1f7";
const SOFT = "#9aa6bd";
const GOLD = "#e8b64c";
const FRAME = `display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;background:${BG};color:${INK};padding:56px 72px;font-family:Inter`;
const WORDMARK = `<div style="display:flex;margin-left:auto;font-size:38px;font-weight:700;color:${GOLD};letter-spacing:0.5px">Year Atlas</div>`;

function cardHtml({ y, name, alive, pct, openEnded, small }) {
  const yLabel = openEnded ? `${y} or earlier` : `${y}`;
  // FIXSPEC copy templates; the vintage line carries the "when" (folasade F2).
  const sentence = name
    ? `people living in ${esc(name)} were born in ${yLabel}`
    : `people alive right now were born in ${yLabel}`;
  // NEVER survival/attrition on a country card (spec §4.2); rank line only.
  const rank = name ? `older than ${pct}% of people in ${esc(name)}` : `older than ${pct}% of the world`;
  const caveat = small
    ? `<div style="display:flex;font-size:30px;font-weight:400;color:${SOFT};margin-top:16px">Small population — estimates are noisy.</div>`
    : "";
  return `
  <div style="${FRAME}">
    <div style="display:flex;width:100%;align-items:center">
      <div style="display:flex;font-size:34px;font-weight:400;color:${SOFT}">${esc(name || "Worldwide")} · ${y}</div>
      ${WORDMARK}
    </div>
    <div style="display:flex;flex-direction:column">
      <div style="display:flex;align-items:baseline">
        <div style="display:flex;font-size:44px;font-weight:400;color:${SOFT};margin-right:20px">about</div>
        <div style="display:flex;font-size:120px;font-weight:700;letter-spacing:-3px;line-height:1;font-variant-numeric:tabular-nums">${fmtPeople(alive)}</div>
      </div>
      <div style="display:flex;font-size:42px;font-weight:400;color:${SOFT};margin-top:22px">${sentence}</div>
    </div>
    <div style="display:flex;flex-direction:column">
      <div style="display:flex;font-size:42px;font-weight:700;color:${GOLD}">${rank}</div>
      ${caveat}
      <div style="display:flex;font-size:26px;font-weight:400;color:${SOFT};margin-top:20px">mid-2026 · UN World Population Prospects 2024</div>
    </div>
  </div>`;
}

function genericCard() {
  return `
  <div style="${FRAME};justify-content:center;align-items:center">
    <div style="display:flex;font-size:110px;font-weight:700;color:${GOLD};letter-spacing:-2px">Year Atlas</div>
    <div style="display:flex;font-size:44px;font-weight:400;color:${SOFT};margin-top:28px">How many people alive today share your birth year?</div>
  </div>`;
}

// ---------- HTML meta injection ----------

// ponytail: fetches the data assets per HTML request (no cache); ASSETS reads
// are edge-local and cheap — add a cache.match layer if it ever shows up.
async function rewriteMeta(res, url, env) {
  const { y, c } = parseParams(url);
  const stat = await getStat(env, url.origin, y, c);
  const og = y !== null ? `${url.origin}/og?y=${y}${c ? `&c=${c}` : ""}` : `${url.origin}/og`;
  let title, desc;
  if (stat) {
    const yLabel = stat.openEnded ? `${stat.y} or earlier` : `${stat.y}`;
    const n = fmtPeople(stat.alive);
    title = stat.name
      ? `Born in ${yLabel}, ${stat.name} — ${n} alive mid-2026 · Year Atlas`
      : `Born in ${yLabel} — ${n} alive mid-2026 · Year Atlas`;
    desc = stat.name
      ? `About ${n} people living in ${stat.name} were born in ${yLabel} (mid-2026, UN projection).`
      : `About ${n} people alive right now were born in ${yLabel} (mid-2026, UN projection).`;
  } else {
    title = "Year Atlas";
    desc = "Enter a birth year and see how many people alive today share it.";
  }
  const tags =
    `<meta property="og:title" content="${esc(title)}">` +
    `<meta property="og:description" content="${esc(desc)}">` +
    `<meta property="og:image" content="${esc(og)}">` +
    `<meta property="og:image:width" content="1200">` +
    `<meta property="og:image:height" content="630">` +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:image" content="${esc(og)}">`;
  const remove = { element(el) { el.remove(); } };
  return new HTMLRewriter()
    .on('meta[property="og:title"]', remove)
    .on('meta[property="og:description"]', remove)
    .on('meta[property="og:image"]', remove)
    .on('meta[property="og:image:width"]', remove)
    .on('meta[property="og:image:height"]', remove)
    .on('meta[name="twitter:card"]', remove)
    .on('meta[name="twitter:image"]', remove)
    .on("title", { element(el) { el.setInnerContent(title); } })
    .on("head", { element(el) { el.append(tags, { html: true }); } })
    .transform(res);
}
