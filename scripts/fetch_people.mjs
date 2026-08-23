#!/usr/bin/env node
// Harvest notable people per birth year from Wikidata (CC0) at build time.
// One SPARQL query per year, cached in data/raw/people/; output is a single
// site/public/data/people.json: { "1971": [["Elon Musk","American businessman"], …] }.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const RAW = 'data/raw/people';
const OUT = 'site/public/data/people.json';
const YEARS = Array.from({ length: 101 }, (_, i) => 1926 + i);
const UA = 'YearAtlas/1.0 (https://github.com/seandavi/my-year-atlas; seandavi@gmail.com)';

// Editorial exclusion: people primarily notable for mass violence or terror.
// Documented in methods.html; reviewed by hand against the harvested output.
const BLOCKLIST = new Set([
  'Q1317', // Osama bin Laden
  'Q1316', // Saddam Hussein
  'Q192218', // Ted Bundy
  'Q298364', // Jeffrey Dahmer
  'Q485508', // Charles Manson
  'Q44220', // Anders Behring Breivik
  'Q222134', // Ted Kaczynski
  'Q187447', // Pablo Escobar
  'Q104419', // Joseph Kony
]);

const query = (y) => `SELECT ?p ?label ?desc ?n WHERE {
  ?p wdt:P31 wd:Q5; wdt:P569 ?dob; wikibase:sitelinks ?n.
  FILTER(?dob >= "${y}-01-01T00:00:00Z"^^xsd:dateTime && ?dob < "${y + 1}-01-01T00:00:00Z"^^xsd:dateTime)
  FILTER(?n >= 50)
  ?p rdfs:label ?label. FILTER(LANG(?label)="en")
  OPTIONAL { ?p schema:description ?desc. FILTER(LANG(?desc)="en") }
} ORDER BY DESC(?n) LIMIT 15`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(RAW, { recursive: true });
const out = {};
for (const y of YEARS) {
  const cache = `${RAW}/${y}.json`;
  if (!existsSync(cache)) {
    process.stdout.write(`${y} `);
    const res = await fetch(
      'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query(y)),
      { headers: { 'User-Agent': UA } },
    );
    if (!res.ok) throw new Error(`${res.status} for ${y}`);
    writeFileSync(cache, await res.text());
    await sleep(1500);
  }
  const rows = JSON.parse(readFileSync(cache, 'utf8')).results.bindings;
  out[y] = rows
    .filter((b) => !BLOCKLIST.has(b.p.value.split('/').pop()))
    .slice(0, 8)
    .map((b) => [
      b.label.value,
      // trim "(born 1971)" / "(1971–1996)" suffixes — the year is the section
      (b.desc?.value ?? '').replace(/\s*\(\d{4}[–-].*?\)|\s*\(born \d{4}\)/, ''),
    ]);
}
writeFileSync(OUT, JSON.stringify(out));
console.log(`\n${OUT}: ${YEARS.length} years, ${(JSON.stringify(out).length / 1024).toFixed(0)}KB`);
