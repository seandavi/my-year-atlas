// Unit tests for site/src/stats.js against the hand-verified spot values
// in data/DATA.md (2026 slice, UN WPP 2024 medium variant).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  cohortSizeNow, originalCohortSize, shareStillLiving, ageRankPercentile,
  cohortTrajectory, passportContrast, pickContrastCountries, biggerCohorts,
  fmtCompact,
} from '../src/stats.js';

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const world = JSON.parse(readFileSync(p('../public/data/world-now.json'), 'utf8'));

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

test('USA 1971 alive = 4,297,760 (from cohorts-now.parquet)', async () => {
  const rows = await readParquet(p('../public/data/cohorts-now.parquet'));
  const usa = rows.filter((r) => r.iso3 === 'USA');
  assert.equal(cohortSizeNow(usa, 1971), 4297760);
});

test('UAE 1985: alive 232,060 vs births-there 39,301 — migration, never survival', async () => {
  const rows = await readParquet(p('../public/data/cohorts-now.parquet'));
  const are = rows.filter((r) => r.iso3 === 'ARE');
  assert.equal(cohortSizeNow(are, 1985), 232060);
  assert.equal(originalCohortSize(are, 1985), 39301);
  // ratio 5.9: the reason country alive/births must never be shown as attrition
  assert.equal((232060 / 39301).toFixed(1), '5.9');
});

test('cohort trajectory: WLD 1971 includes 2026 point at 91,070,227, sorted', async () => {
  const rows = await readParquet(p('../public/data/traj/iso3=WLD/data_0.parquet'));
  const traj = cohortTrajectory(rows, 1971);
  assert.ok(traj.length > 50);
  const now = traj.find((d) => d.ref_year === 2026);
  assert.equal(now.alive, 91070227);
  for (let i = 1; i < traj.length; i++) assert.ok(traj[i].ref_year > traj[i - 1].ref_year);
});

test('passport contrast: cohort size and rank, no survival field', async () => {
  const rows = await readParquet(p('../public/data/cohorts-now.parquet'));
  const isoList = pickContrastCountries('USA');
  assert.equal(isoList.length, 3);
  assert.ok(!isoList.includes('USA'));
  const out = passportContrast(rows, 1971, [...isoList, 'USA']);
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

test('fmtCompact', () => {
  assert.equal(fmtCompact(91070227), '91.1 million');
  assert.equal(fmtCompact(8300678397), '8.3 billion');
  assert.equal(fmtCompact(232060), '232,060');
});

test('fmtPct never shows 100% for a true fraction (1926 open-ended bucket)', async () => {
  const { fmtPct, ageRankPercentile } = await import('../src/stats.js');
  const pct = ageRankPercentile(world, 1926);
  assert.ok(pct < 1);
  assert.equal(fmtPct(pct), '99.9%');
  assert.equal(fmtPct(0.736), '73.6%');
});
