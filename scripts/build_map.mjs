#!/usr/bin/env node
// Build site/public/data/map.json: Equal Earth-projected SVG paths per ISO3.
// All geo work happens here, offline — the client only colors shapes.
// Source: world-atlas@2 countries-110m.json (derived from Natural Earth,
// public domain), ids are M49 numeric; joined to ISO3 via data/derived/iso_m49.csv.
import { readFileSync, writeFileSync } from 'node:fs';

const topo = JSON.parse(readFileSync('data/raw/countries-110m.json', 'utf8'));
const m49toIso = Object.fromEntries(
  readFileSync('data/derived/iso_m49.csv', 'utf8').trim().split('\n')
    .map((l) => l.split(',')).map(([iso, id]) => [String(+id), iso]),
);

// --- TopoJSON arc decoding (quantized delta encoding) ---
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const ringCoords = (arcIdxs) => {
  const pts = [];
  for (const i of arcIdxs) {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    // consecutive arcs share endpoints; drop the duplicate join point
    pts.push(...(pts.length ? a.slice(1) : a));
  }
  return pts;
};

// --- Equal Earth projection (Šavrič, Patterson, Jenny 2018) ---
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
const project = ([lon, lat]) => {
  const l = Math.asin(M * Math.sin((lat * Math.PI) / 180));
  const l2 = l * l, l6 = l2 * l2 * l2;
  return [
    ((lon * Math.PI) / 180) * Math.cos(l) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))),
    l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)),
  ];
};

// Split a lon/lat ring wherever it jumps across the antimeridian, so filled
// shapes (Russia, Fiji, Antarctica) don't streak across the map.
const splitRing = (pts) => {
  const segs = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i][0] - pts[i - 1][0]) > 180) segs.push([]);
    segs.at(-1).push(pts[i]);
  }
  return segs.filter((s) => s.length > 2);
};

// --- Project everything, tracking bounds ---
let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
const projected = []; // [iso3, name, segments[[x,y]...]]
for (const g of topo.objects.countries.geometries) {
  const iso3 = m49toIso[String(+g.id)];
  if (!iso3) continue; // uninhabited / not in WPP (e.g. Antarctica has no id anyway)
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  const segs = [];
  for (const poly of polys) for (const ring of poly) {
    for (const seg of splitRing(ringCoords(ring))) {
      const p = seg.map(project);
      for (const [x, y] of p) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      segs.push(p);
    }
  }
  if (segs.length) projected.push([iso3, g.properties?.name ?? iso3, segs]);
}

// --- Fit to a 960-wide viewBox, y flipped ---
const W = 960;
const k = W / (maxX - minX);
const H = Math.round((maxY - minY) * k);
const fmt = (v) => (Math.round(v * 10) / 10).toString();
const countries = {};
for (const [iso3, name, segs] of projected) {
  const d = segs.map((seg) =>
    'M' + seg.map(([x, y]) => `${fmt((x - minX) * k)},${fmt((maxY - y) * k)}`).join('L') + 'Z',
  ).join('');
  countries[iso3] = { d, name };
}

const out = {
  viewBox: `0 0 ${W} ${H}`,
  source: 'Natural Earth 110m via world-atlas@2 (public domain), Equal Earth projection',
  countries,
};
writeFileSync('site/public/data/map.json', JSON.stringify(out));
console.log(`map.json: ${Object.keys(countries).length} countries, viewBox 0 0 ${W} ${H}, ${(JSON.stringify(out).length / 1024).toFixed(0)}KB`);
