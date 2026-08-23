// Year Atlas edge worker: /og share cards + per-URL OG meta injection.
// Stateless; all data comes from the static assets it fronts.
import { ImageResponse } from "workers-og";
import { parquetReadObjects } from "hyparquet";
import fontRegular from "../assets/inter-latin-400-normal.woff";
import fontBold from "../assets/inter-latin-700-normal.woff";

const YEAR_MIN = 1926;
const YEAR_MAX = 2026;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/og") return handleOg(url, env, ctx);
    const res = await env.ASSETS.fetch(request);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return res;
    return rewriteMeta(res, url);
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

// ---------- /og ----------

async function handleOg(url, env, ctx) {
  const { y, c } = parseParams(url);
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/og?y=${y ?? ""}&c=${c}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let card = null;
  if (y !== null) {
    card = c ? await countryCard(env, url.origin, y, c) : null;
    if (!card) card = await worldCard(env, url.origin, y);
  }
  if (!card) card = genericCard();

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

async function worldCard(env, origin, y) {
  const res = await env.ASSETS.fetch(`${origin}/data/world-now.json`);
  if (!res.ok) return null;
  const rows = await res.json();
  const row = rows.find((r) => r.birth_year === y);
  if (!row) return null;
  return cardHtml({
    y,
    place: "Worldwide",
    alive: row.alive,
    pct: percentile(row),
    openEnded: row.open_ended,
    inPlace: "",
  });
}

async function countryCard(env, origin, y, c) {
  const res = await env.ASSETS.fetch(`${origin}/data/cohorts-now.parquet`);
  if (!res.ok) return null;
  const file = await res.arrayBuffer();
  const rows = await parquetReadObjects({
    file,
    columns: ["iso3", "location_name", "birth_year", "alive", "open_ended", "cum_alive_younger", "total_alive"],
  });
  const row = rows.find((r) => r.iso3 === c && Number(r.birth_year) === y);
  if (!row) return null;
  const name = row.location_name;
  return cardHtml({
    y,
    place: name,
    alive: Number(row.alive),
    pct: percentile(row),
    openEnded: row.open_ended,
    inPlace: ` in ${name}`,
  });
}

// Own single-year bucket counted half (spec §6.4).
function percentile(row) {
  return Math.round(((Number(row.cum_alive_younger) + 0.5 * Number(row.alive)) / Number(row.total_alive)) * 100);
}

// "91,070,000" style: >=1M rounded to the nearest 10,000.
function fmt(n) {
  if (n >= 1e6) n = Math.round(n / 1e4) * 1e4;
  return n.toLocaleString("en-US");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------- card templates (satori-flavored HTML) ----------

const BG = "#101828";
const FRAME = `display:flex;flex-direction:column;justify-content:space-between;width:1200px;height:630px;background:${BG};color:#ffffff;padding:64px 72px;font-family:Inter`;
const WORDMARK = `<div style="display:flex;margin-left:auto;font-size:38px;font-weight:700;color:#93c5fd;letter-spacing:0.5px">Year Atlas</div>`;

function cardHtml({ y, place, alive, pct, openEnded, inPlace }) {
  const born = openEnded ? `were born in ${y} or earlier` : `were born in ${y}`;
  // NEVER survival/attrition on a country card (spec §4.2); rank line only.
  const rank = `older than ${pct}% of ${inPlace ? "people in " + esc(place) : "the world"}`;
  return `
  <div style="${FRAME}">
    <div style="display:flex;width:100%;align-items:center">
      <div style="display:flex;font-size:34px;font-weight:400;color:#94a3b8">${esc(place)} · ${y}</div>
      ${WORDMARK}
    </div>
    <div style="display:flex;flex-direction:column">
      <div style="display:flex;font-size:132px;font-weight:700;letter-spacing:-4px;line-height:1;font-variant-numeric:tabular-nums">${fmt(alive)}</div>
      <div style="display:flex;font-size:42px;font-weight:400;color:#cbd5e1;margin-top:22px">people alive today${esc(inPlace)} ${born}</div>
    </div>
    <div style="display:flex;font-size:42px;font-weight:700;color:#6ee7b7">${rank}</div>
  </div>`;
}

function genericCard() {
  return `
  <div style="${FRAME};justify-content:center;align-items:center">
    <div style="display:flex;font-size:110px;font-weight:700;color:#93c5fd;letter-spacing:-2px">Year Atlas</div>
    <div style="display:flex;font-size:44px;font-weight:400;color:#cbd5e1;margin-top:28px">How many people alive today share your birth year?</div>
  </div>`;
}

// ---------- HTML meta injection ----------

function rewriteMeta(res, url) {
  const { y, c } = parseParams(url);
  const og = y ? `${url.origin}/og?y=${y}${c ? `&c=${c}` : ""}` : `${url.origin}/og`;
  const title = y ? `Born in ${y}${c ? ` (${c})` : ""} — Year Atlas` : "Year Atlas";
  const desc = y
    ? `How many people alive today were born in ${y}? See the cohort${c ? ` in ${c}` : ""} on Year Atlas.`
    : "Enter a birth year and see how many people alive today share it.";
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
    .on("head", { element(el) { el.append(tags, { html: true }); } })
    .transform(res);
}
