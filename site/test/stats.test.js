// Unit tests for site/src/stats.js against the hand-verified spot values
// in data/DATA.md (2026 slice, UN WPP 2024 medium variant), plus the shared
// FIXSPEC formatting fixtures that the worker asserts too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  cohortSizeNow, originalCohortSize, shareStillLiving, ageRankPercentile,
  cohortTrajectory, passportContrast, pickContrastCountries, biggerCohorts,
  fmtPeople, fmtPctWhole, medianBirthYear, climateDelta, findYear,
} from '../src/stats.js';

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const json = (rel) => JSON.parse(readFileSync(p(rel), 'utf8'));
const world = json('../public/data/world-now.json');

async function readParquet(path) {
  const { parquetReadObjects } = await import('hyparquet');
  const buf = readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return parquetReadObjects({ file: ab });
}

test('world total alive is 8,300,678,397', () => {
  assert.equal(Number(world[0].total_alive), 8300678397);
});

test('cohort size now: world 1971 = 91,070,227', () => {
  assert.equal(cohortSizeNow(world, 1971), 91070227);
});

test('original cohort size: world 1971 births = 123,739,681', () => {
  assert.equal(originalCohortSize(world, 1971), 123739681);
});

test('share still living: world 1971 = 73.6%', () => {
  const s = shareStillLiving(world, 1971);
  assert.equal((s * 100).toFixed(1), '73.6');
  assert.ok(s <= 1);
});

test('share still living is null before 1950 (no births data)', () => {
  assert.equal(shareStillLiving(world, 1949), null);
});

test('age rank percentile: world 1971 = 80.2% older-than', () => {
  const pct = ageRankPercentile(world, 1971);
  assert.equal((pct * 100).toFixed(1), '80.2');
});

test('USA 1971 alive = 4,297,760 (from /data/now/USA.json)', () => {
  const usa = json('../public/data/now/USA.json');
  assert.equal(cohortSizeNow(usa, 1971), 4297760);
});

test('UAE 1985: alive 232,060 vs births-there 39,301 — migration, never survival', () => {
  const are = json('../public/data/now/ARE.json');
  assert.equal(cohortSizeNow(are, 1985), 232060);
  assert.equal(originalCohortSize(are, 1985), 39301);
  // ratio 5.9: the reason country alive/births must never be shown as attrition
  assert.equal((232060 / 39301).toFixed(1), '5.9');
});

test('per-country JSON slice has the same row schema as world-now.json', () => {
  const phl = json('../public/data/now/PHL.json');
  for (const k of Object.keys(world[0])) assert.ok(k in phl[0], `missing ${k}`);
  assert.equal(phl[0].iso3, 'PHL');
});

test('cohort trajectory: WLD 1971 includes 2026 point at 91,070,227, sorted', async () => {
  // the traj slice is sharded; the app reads every shard, so must the test
  const { readdirSync } = await import('node:fs');
  const dir = p('../public/data/traj/iso3=WLD/');
  const shards = readdirSync(dir).filter((f) => f.endsWith('.parquet'));
  const rows = (await Promise.all(shards.map((f) => readParquet(dir + f)))).flat();
  const traj = cohortTrajectory(rows, 1971);
  assert.ok(traj.length > 50);
  const now = traj.find((d) => d.ref_year === 2026);
  assert.equal(now.alive, 91070227);
  for (let i = 1; i < traj.length; i++) assert.ok(traj[i].ref_year > traj[i - 1].ref_year);
});

test('passport contrast from contrast.json: cohort size and rank, no survival field', () => {
  const pool = json('../public/data/contrast.json');
  const isoList = pickContrastCountries('USA');
  assert.equal(isoList.length, 3);
  assert.ok(!isoList.includes('USA'));
  const out = passportContrast(pool, 1971, [...isoList, 'USA']);
  assert.equal(out.length, 4);
  const usa = out.find((c) => c.iso3 === 'USA');
  assert.equal(usa.alive, 4297760);
  assert.ok(usa.percentile > 0 && usa.percentile < 1);
  assert.ok(!('share' in usa) && !('survival' in usa));
});

test('bigger cohorts: all strictly larger, sorted descending', () => {
  const bigger = biggerCohorts(world, 1971);
  const mine = cohortSizeNow(world, 1971);
  assert.ok(bigger.length > 0);
  for (const b of bigger) {
    assert.ok(b.alive > mine);
    assert.ok(b.ratio > 1);
  }
  for (let i = 1; i < bigger.length; i++) assert.ok(bigger[i].alive <= bigger[i - 1].alive);
});

// issue #13: hand-derived from world-now.json — 1994 is the first birth year
// whose younger side (cum_alive_younger) drops below half of total_alive.
test('median birth year of the 2026 world slice is 1994', () => {
  assert.equal(medianBirthYear(world), 1994);
  const total = Number(world[0].total_alive);
  const cum = (y) => Number(findYear(world, y).cum_alive_younger);
  assert.ok(cum(1994) < total / 2);
  assert.ok(cum(1993) >= total / 2);
});

// issue #15: delta = mean(latest 5 anomalies) − anomaly[birth year]
test('climate delta against a fixture array', () => {
  const fx = [
    { year: 1979, anomaly: 0.1 },
    { year: 2021, anomaly: 1.0 }, { year: 2022, anomaly: 1.0 },
    { year: 2023, anomaly: 1.0 }, { year: 2024, anomaly: 1.0 },
    { year: 2025, anomaly: 1.5 },
  ];
  assert.equal(climateDelta(fx, 1979).toFixed(1), '1.0'); // mean 1.1 − 0.1
  assert.equal(climateDelta(fx, 2023).toFixed(1), '0.1'); // inside the window
  assert.equal(climateDelta(fx, 2026), null); // after the latest data year
  assert.equal(climateDelta(fx, 1900), null); // year not in the series
});

// FIXSPEC display-precision fixtures — the worker asserts these same pairs.
test('fmtPeople matches the FIXSPEC fixture exactly', () => {
  const fixture = [
    [91070227, '91.1 million'],
    [4297760, '4.3 million'],
    [123739681, '124 million'],
    [232060, '232,000'],
    [38108, '38,100'],
    [847, '850'],
    [1957713, '1.96 million'],
    [97736443, '97.7 million'],
    [8300678397, '8.3 billion'],
  ];
  for (const [n, s] of fixture) assert.equal(fmtPeople(n), s, `fmtPeople(${n})`);
});

test('fmtPctWhole: whole numbers, clamped away from 0 and 100', () => {
  assert.equal(fmtPctWhole(0.833), '83%');
  assert.equal(fmtPctWhole(0.999), '99%');
  assert.equal(fmtPctWhole(1), '99%');
  assert.equal(fmtPctWhole(0.001), '1%');
  assert.equal(fmtPctWhole(0.551), '55%');
});

test('fmtPctWhole never shows 100% for the 1926 open-ended bucket', () => {
  const pct = ageRankPercentile(world, 1926);
  assert.ok(pct < 1);
  assert.equal(fmtPctWhole(pct), '99%');
});
