// Year Atlas edge worker: /og share cards + per-URL OG meta injection.
// Stateless; all data comes from the static assets it fronts. Copy comes
// from the shared site locale modules (?lang=es|pt; absent = English).
import { ImageResponse } from "workers-og";
import { parquetReadObjects } from "hyparquet";
import { percentile } from "./format.js";
import { getLocale } from "./i18n.js";
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
  const l = url.searchParams.get("lang");
  const lang = l === "es" || l === "pt" ? l : "en";
  return { y: validY ? y : null, c, lang };
}

// ---------- data ----------

// Returns { y, unName (UN name or null for world), iso2, alive, pctRaw
// (0–1), openEnded, small } or null. Country falls back to world when the
// row is missing.
async function getStat(env, origin, y, c, lang) {
  if (y === null) return null;
  if (c) {
    const s = await getCountry(env, origin, y, c);
    if (s) {
      // iso2 feeds Intl.DisplayNames — only the non-English locales need it
      if (lang !== "en") s.iso2 = await getIso2(env, origin, c);
      return s;
    }
  }
  return getWorld(env, origin, y);
}

async function getIso2(env, origin, iso3) {
  const res = await env.ASSETS.fetch(`${origin}/data/locations.json`);
  if (!res.ok) return undefined;
  const locs = await res.json();
  return locs.find((l) => l.iso3 === iso3)?.iso2;
}

async function getWorld(env, origin, y) {
  const res = await env.ASSETS.fetch(`${origin}/data/world-now.json`);
  if (!res.ok) return null;
  const rows = await res.json();
  const row = rows.find((r) => r.birth_year === y);
  if (!row) return null;
  return {
    y,
    unName: null,
    iso2: undefined,
    alive: Number(row.alive),
    pctRaw: percentile(row.cum_alive_younger, row.alive, row.total_alive) / 100,
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
    unName: row.location_name,
    iso2: undefined,
    alive: Number(row.alive),
    pctRaw: percentile(row.cum_alive_younger, row.alive, row.total_alive) / 100,
    openEnded: !!row.open_ended,
    small: Number(row.total_alive) < SMALL_POP,
  };
}

// ---------- /og ----------

async function handleOg(url, env, ctx) {
  const { y, c, lang } = parseParams(url);
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/og?y=${y ?? ""}&c=${c}&lang=${lang}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const t = getLocale(lang);
  const stat = await getStat(env, url.origin, y, c, lang);
  const card = stat ? cardHtml(stat, t) : genericCard(t);

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

function cardHtml({ y, unName, iso2, alive, pctRaw, openEnded, small }, t) {
  const yLabel = openEnded ? t.orEarlier(y) : `${y}`;
  const name = unName ? t.displayName(unName, iso2) : null;
  const inPlace = unName ? t.placeIn(unName, iso2) : null;
  // FIXSPEC copy templates; the vintage line carries the "when" (folasade F2).
  const sentence = t.cardSentence(alive, inPlace, yLabel);
  // NEVER survival/attrition on a country card (spec §4.2); rank line only.
  const rank = t.ogRank(t.fmtPct(pctRaw), inPlace);
  const caveat = small
    ? `<div style="display:flex;font-size:30px;font-weight:400;color:${SOFT};margin-top:16px">${esc(t.smallPop)}</div>`
    : "";
  return `
  <div style="${FRAME}">
    <div style="display:flex;width:100%;align-items:center">
      <div style="display:flex;font-size:34px;font-weight:400;color:${SOFT}">${esc(name || t.worldwideLabel)} · ${y}</div>
      ${WORDMARK}
    </div>
    <div style="display:flex;flex-direction:column">
      <div style="display:flex;align-items:baseline">
        <div style="display:flex;font-size:44px;font-weight:400;color:${SOFT};margin-right:20px">${esc(t.cardAbout(alive))}</div>
        <div style="display:flex;font-size:120px;font-weight:700;letter-spacing:-3px;line-height:1;font-variant-numeric:tabular-nums">${t.fmtPeople(alive)}</div>
      </div>
      <div style="display:flex;font-size:42px;font-weight:400;color:${SOFT};margin-top:22px">${esc(sentence)}</div>
    </div>
    <div style="display:flex;flex-direction:column">
      <div style="display:flex;font-size:42px;font-weight:700;color:${GOLD}">${esc(rank)}</div>
      ${caveat}
      <div style="display:flex;font-size:26px;font-weight:400;color:${SOFT};margin-top:20px">${esc(t.cardVintage)}</div>
    </div>
  </div>`;
}

function genericCard(t) {
  return `
  <div style="${FRAME};justify-content:center;align-items:center">
    <div style="display:flex;font-size:110px;font-weight:700;color:${GOLD};letter-spacing:-2px">Year Atlas</div>
    <div style="display:flex;font-size:44px;font-weight:400;color:${SOFT};margin-top:28px">${esc(t.genericQuestion)}</div>
  </div>`;
}

// ---------- HTML meta injection ----------

// ponytail: fetches the data assets per HTML request (no cache); ASSETS reads
// are edge-local and cheap — add a cache.match layer if it ever shows up.
async function rewriteMeta(res, url, env) {
  const { y, c, lang } = parseParams(url);
  const t = getLocale(lang);
  const stat = await getStat(env, url.origin, y, c, lang);
  const langQ = lang !== "en" ? `&lang=${lang}` : "";
  const og = y !== null
    ? `${url.origin}/og?y=${y}${c ? `&c=${c}` : ""}${langQ}`
    : `${url.origin}/og${langQ ? `?${langQ.slice(1)}` : ""}`;
  let title, desc;
  if (stat) {
    const yLabel = stat.openEnded ? t.orEarlier(stat.y) : `${stat.y}`;
    const name = stat.unName ? t.displayName(stat.unName, stat.iso2) : null;
    const inPlace = stat.unName ? t.placeIn(stat.unName, stat.iso2) : null;
    title = t.ogTitle(yLabel, name, stat.alive);
    desc = t.ogDesc(stat.alive, inPlace, yLabel);
  } else {
    title = t.ogTitleDefault;
    desc = t.ogDescDefault;
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
    .on("html", { element(el) { el.setAttribute("lang", lang); } })
    .on("title", { element(el) { el.setInnerContent(title); } })
    .on("head", { element(el) { el.append(tags, { html: true }); } })
    .transform(res);
}
