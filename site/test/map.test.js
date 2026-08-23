// Unit tests for the choropleth helpers (site/src/map.js, issue #37).
import test from 'node:test';
import assert from 'node:assert/strict';
import { THRESHOLDS, binOf, binLabel, topCountries } from '../src/map.js';

test('binOf: bins are monotonic and cover a skewed array', () => {
  // cohort-shaped skew: Holy See to India
  const skewed = [4, 92, 850, 9999, 10000, 38108, 232060, 999999, 1e6, 4297760, 9999999, 1e7, 20345678];
  let prev = -1;
  for (const v of skewed) { // ascending values → non-decreasing bins
    const b = binOf(v);
    assert.ok(b >= 0 && b <= THRESHOLDS.length, `bin in range for ${v}`);
    assert.ok(b >= prev, `monotonic at ${v}`);
    prev = b;
  }
  assert.equal(binOf(4), 0);
  assert.equal(binOf(9999), 0);
  assert.equal(binOf(10000), 1);      // threshold lands in the upper bin
  assert.equal(binOf(999999), 2);
  assert.equal(binOf(20345678), 4);
});

test('binOf: zero/missing means no data, not the lowest bin', () => {
  assert.equal(binOf(0), -1);
  assert.equal(binOf(null), -1);
  assert.equal(binOf(undefined), -1);
});

test('binOf handles BigInt parquet values', () => {
  assert.equal(binOf(20345678n), 4);
});

test('binLabel: honest fmtPeople ranges', () => {
  assert.equal(binLabel(0), 'under 10,000');
  assert.equal(binLabel(1), '10,000–100,000');
  assert.equal(binLabel(3), '1–10 million');
  assert.equal(binLabel(4), 'over 10 million');
});

test('topCountries: top 3 by alive, descending, input untouched', () => {
  const rows = [
    { iso3: 'VAT', location_name: 'Holy See', alive: 4 },
    { iso3: 'IND', location_name: 'India', alive: 20345678 },
    { iso3: 'USA', location_name: 'United States of America', alive: 4297760 },
    { iso3: 'CHN', location_name: 'China', alive: 18000000 },
    { iso3: 'NGA', location_name: 'Nigeria', alive: 7000000n }, // BigInt survives
  ];
  const before = rows.map((r) => r.iso3).join();
  const top = topCountries(rows, 3);
  assert.deepEqual(top.map((r) => r.iso3), ['IND', 'CHN', 'NGA']);
  assert.equal(rows.map((r) => r.iso3).join(), before);
});
